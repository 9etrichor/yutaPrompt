use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use super::folders;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Prompt {
    pub id: i64,
    pub folder_id: Option<i64>,
    pub title: String,
    pub body: String,
    pub notes: String,
    pub favorite: bool,
    pub use_count: i64,
}

const PROMPT_COLUMNS: &str = "id, folder_id, title, body, notes, favorite, use_count";

fn row_to_prompt(row: &rusqlite::Row) -> rusqlite::Result<Prompt> {
    let favorite: i64 = row.get(5)?;
    Ok(Prompt {
        id: row.get(0)?,
        folder_id: row.get(1)?,
        title: row.get(2)?,
        body: row.get(3)?,
        notes: row.get(4)?,
        favorite: favorite != 0,
        use_count: row.get(6)?,
    })
}

/// All non-deleted prompts in a folder (None = unfiled), ordered by updated_at desc.
pub fn list(conn: &Connection, folder_id: Option<i64>) -> Result<Vec<Prompt>> {
    let sql = format!(
        "SELECT {PROMPT_COLUMNS} FROM prompts
         WHERE folder_id IS ?1 AND deleted_at IS NULL
         ORDER BY updated_at DESC, id DESC"
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("prepare list prompts: {e}"))?;
    let prompts = stmt
        .query_map(params![folder_id], row_to_prompt)
        .map_err(|e| format!("query prompts: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect prompts: {e}"))?;
    Ok(prompts)
}

/// Create a prompt in `folder_id` (None = unfiled).
pub fn create(
    conn: &Connection,
    folder_id: Option<i64>,
    title: &str,
    body: &str,
    notes: &str,
) -> Result<Prompt> {
    if let Some(fid) = folder_id {
        folders::get_by_id(conn, fid).map_err(|e| format!("folder not found: {e}"))?;
    }
    conn.execute(
        "INSERT INTO prompts (folder_id, title, body, notes, favorite, use_count, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, 0, 0, datetime('now'), datetime('now'))",
        params![folder_id, title, body, notes],
    )
    .map_err(|e| format!("insert prompt: {e}"))?;
    let id = conn.last_insert_rowid();
    get_by_id(conn, id)
}

/// Update title/body/notes; bumps updated_at.
pub fn update(conn: &Connection, id: i64, title: &str, body: &str, notes: &str) -> Result<Prompt> {
    let affected = conn
        .execute(
            "UPDATE prompts
             SET title = ?1, body = ?2, notes = ?3, updated_at = datetime('now')
             WHERE id = ?4 AND deleted_at IS NULL",
            params![title, body, notes, id],
        )
        .map_err(|e| format!("update prompt: {e}"))?;
    if affected == 0 {
        return Err("prompt not found".to_string());
    }
    get_by_id(conn, id)
}

/// Copy a prompt into the same folder with " (copy)" appended to the title.
pub fn duplicate(conn: &Connection, id: i64) -> Result<Prompt> {
    let original = get_by_id(conn, id)?;
    let title = format!("{} (copy)", original.title);
    create(conn, original.folder_id, &title, &original.body, &original.notes)
}

/// Soft-delete a prompt.
pub fn delete(conn: &Connection, id: i64) -> Result<()> {
    let affected = conn
        .execute(
            "UPDATE prompts SET deleted_at = datetime('now'), updated_at = datetime('now')
             WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
        )
        .map_err(|e| format!("delete prompt: {e}"))?;
    if affected == 0 {
        return Err("prompt not found".to_string());
    }
    Ok(())
}

/// Record a copy/use: increments use_count and sets last_used_at.
pub fn record_use(conn: &Connection, id: i64) -> Result<()> {
    let affected = conn
        .execute(
            "UPDATE prompts SET use_count = use_count + 1, last_used_at = datetime('now')
             WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
        )
        .map_err(|e| format!("record use: {e}"))?;
    if affected == 0 {
        return Err("prompt not found".to_string());
    }
    Ok(())
}

/// Toggle the favorite flag on a prompt; returns the new state.
pub fn toggle_favorite(conn: &Connection, id: i64) -> Result<bool> {
    let affected = conn
        .execute(
            "UPDATE prompts SET favorite = 1 - favorite, updated_at = datetime('now')
             WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
        )
        .map_err(|e| format!("toggle favorite: {e}"))?;
    if affected == 0 {
        return Err("prompt not found".to_string());
    }
    let p = get_by_id(conn, id)?;
    Ok(p.favorite)
}

/// Extract unique `{{name}}` placeholders from text, in order of appearance.
/// Returns the placeholder names (e.g. `topic` for `{{topic}}`).
pub fn extract_variables(text: &str) -> Vec<String> {
    let mut seen: Vec<String> = Vec::new();
    for (idx, ch) in text.char_indices() {
        if ch == '{' && text[idx..].starts_with("{{") {
            if let Some(close_rel) = text[idx + 2..].find("}}") {
                let name = text[idx + 2..idx + 2 + close_rel].trim();
                if !name.is_empty() && !seen.iter().any(|s| s == name) {
                    seen.push(name.to_string());
                }
            }
        }
    }
    seen
}

/// Replace `{{name}}` placeholders with the given values. Values missing from
/// `values` are left as-is. Returns the substituted text.
pub fn substitute_variables(text: &str, values: &std::collections::HashMap<String, String>) -> String {
    let mut out = text.to_string();
    for name in extract_variables(text) {
        if let Some(value) = values.get(&name) {
            out = out.replace(&format!("{{{{{name}}}}}"), value);
        }
    }
    out
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Prompt> {
    let sql = format!(
        "SELECT {PROMPT_COLUMNS} FROM prompts WHERE id = ?1 AND deleted_at IS NULL"
    );
    conn.query_row(&sql, params![id], row_to_prompt)
        .map_err(|e| format!("get prompt {id}: {e}"))
}

/// Get a prompt regardless of its deleted_at state (used by trash restore).
pub fn get_by_id_unfiltered(conn: &Connection, id: i64) -> Result<Prompt> {
    let sql = format!("SELECT {PROMPT_COLUMNS} FROM prompts WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_prompt)
        .map_err(|e| format!("get prompt {id}: {e}"))
}

/// Open a fresh connection to the app database file.
pub fn open(app: &tauri::AppHandle) -> Result<Connection> {
    folders::open(app)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup() -> Connection {
        let conn = Connection::open_in_memory().expect("in-memory db");
        conn.execute_batch(
            "CREATE TABLE folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                parent_id INTEGER REFERENCES folders(id),
                name TEXT NOT NULL,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                deleted_at TEXT,
                UNIQUE (parent_id, name)
            );
            CREATE TABLE prompts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                folder_id    INTEGER REFERENCES folders(id),
                title        TEXT NOT NULL,
                body         TEXT NOT NULL DEFAULT '',
                notes        TEXT NOT NULL DEFAULT '',
                favorite     INTEGER NOT NULL DEFAULT 0,
                use_count    INTEGER NOT NULL DEFAULT 0,
                last_used_at TEXT,
                created_at   TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
                deleted_at   TEXT
            );",
        )
        .expect("create tables");
        conn
    }

    #[test]
    fn create_and_list() {
        let conn = setup();
        let folder = folders::create(&conn, None, "F").unwrap();
        let p = create(&conn, Some(folder.id), "T", "body", "note").unwrap();
        assert_eq!(p.title, "T");
        assert_eq!(p.body, "body");
        assert!(!p.favorite);
        let listed = list(&conn, Some(folder.id)).unwrap();
        assert_eq!(listed.len(), 1);
        assert_eq!(listed[0].id, p.id);
    }

    #[test]
    fn unfiled_list_separate() {
        let conn = setup();
        let folder = folders::create(&conn, None, "F").unwrap();
        create(&conn, Some(folder.id), "In", "", "").unwrap();
        create(&conn, None, "Out", "", "").unwrap();
        assert_eq!(list(&conn, Some(folder.id)).unwrap().len(), 1);
        assert_eq!(list(&conn, None).unwrap().len(), 1);
    }

    #[test]
    fn update_changes_fields() {
        let conn = setup();
        let p = create(&conn, None, "T", "b", "n").unwrap();
        let updated = update(&conn, p.id, "T2", "b2", "n2").unwrap();
        assert_eq!(updated.title, "T2");
        assert_eq!(updated.body, "b2");
        assert_eq!(updated.notes, "n2");
    }

    #[test]
    fn duplicate_copies_into_same_folder() {
        let conn = setup();
        let folder = folders::create(&conn, None, "F").unwrap();
        let p = create(&conn, Some(folder.id), "T", "body", "note").unwrap();
        let dup = duplicate(&conn, p.id).unwrap();
        assert_eq!(dup.title, "T (copy)");
        assert_eq!(dup.body, "body");
        assert_eq!(dup.notes, "note");
        assert_eq!(dup.folder_id, p.folder_id);
        assert_ne!(dup.id, p.id);
    }

    #[test]
    fn delete_is_soft() {
        let conn = setup();
        let p = create(&conn, None, "T", "", "").unwrap();
        delete(&conn, p.id).unwrap();
        assert!(list(&conn, None).unwrap().is_empty());
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM prompts", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn create_in_missing_folder_rejected() {
        let conn = setup();
        assert!(create(&conn, Some(999), "T", "", "").is_err());
    }

    #[test]
    fn update_missing_rejected() {
        let conn = setup();
        assert!(update(&conn, 999, "T", "", "").is_err());
    }

    #[test]
    fn record_use_increments() {
        let conn = setup();
        let p = create(&conn, None, "T", "b", "n").unwrap();
        record_use(&conn, p.id).unwrap();
        record_use(&conn, p.id).unwrap();
        let refreshed = get_by_id(&conn, p.id).unwrap();
        assert_eq!(refreshed.use_count, 2);
    }

    #[test]
    fn toggle_favorite_flips_and_persists() {
        let conn = setup();
        let p = create(&conn, None, "T", "b", "n").unwrap();
        assert!(!p.favorite);
        assert!(toggle_favorite(&conn, p.id).unwrap());
        assert!(!toggle_favorite(&conn, p.id).unwrap());
        assert!(!get_by_id(&conn, p.id).unwrap().favorite);
    }

    #[test]
    fn extract_variables_finds_unique_placeholders() {
        assert_eq!(
            extract_variables("Hi {{topic}}, use {{topic}} and {{audience}}."),
            vec!["topic".to_string(), "audience".to_string()]
        );
        assert!(extract_variables("no placeholders here").is_empty());
        assert_eq!(extract_variables("{{  spaced  }}").len(), 1);
    }

    #[test]
    fn substitute_variables_replaces() {
        let mut values = std::collections::HashMap::new();
        values.insert("topic".to_string(), "CEFR".to_string());
        let result = substitute_variables("About {{topic}}!", &values);
        assert_eq!(result, "About CEFR!");
        // Missing values stay untouched.
        let result = substitute_variables("{{topic}} / {{missing}}", &values);
        assert_eq!(result, "CEFR / {{missing}}");
    }
}
