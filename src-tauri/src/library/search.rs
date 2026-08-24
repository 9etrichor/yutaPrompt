use rusqlite::Connection;
use serde::Serialize;
use std::collections::HashMap;

use super::folders;
use super::prompts::Prompt;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct SearchResult {
    pub prompt: Prompt,
    /// Full folder path, e.g. "Work/Edu" (empty for unfiled).
    pub path: String,
}

/// Search non-deleted prompts by title, body, notes, or full folder path.
/// Case-insensitive substring match. Returns newest-first.
pub fn search(conn: &Connection, query: &str) -> Result<Vec<SearchResult>> {
    let query = query.trim().to_lowercase();
    if query.is_empty() {
        return Ok(Vec::new());
    }

    let folders = folders::list(conn)?;
    let by_id: HashMap<i64, &super::folders::Folder> =
        folders.iter().map(|f| (f.id, f)).collect();
    let path_of = |folder_id: Option<i64>| -> String {
        let mut id = folder_id;
        let mut parts: Vec<String> = Vec::new();
        let mut guard = 0;
        while let Some(fid) = id {
            guard += 1;
            if guard > 1024 {
                break;
            }
            match by_id.get(&fid) {
                Some(f) => {
                    parts.push(f.name.clone());
                    id = f.parent_id;
                }
                None => break,
            }
        }
        parts.reverse();
        parts.join("/")
    };

    let mut stmt = conn
        .prepare(
            "SELECT id, folder_id, title, body, notes, favorite, use_count, updated_at
             FROM prompts WHERE deleted_at IS NULL ORDER BY updated_at DESC, id DESC",
        )
        .map_err(|e| format!("prepare search: {e}"))?;
    let prompts = stmt
        .query_map([], |row| {
            let favorite: i64 = row.get(5)?;
            Ok(Prompt {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
                body: row.get(3)?,
                notes: row.get(4)?,
                favorite: favorite != 0,
                use_count: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(|e| format!("query prompts for search: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect prompts for search: {e}"))?;

    let mut results = Vec::new();
    for prompt in prompts {
        let path = path_of(prompt.folder_id);
        let haystack = format!(
            "{}\n{}\n{}\n{}",
            prompt.title, prompt.body, prompt.notes, path
        )
        .to_lowercase();
        if haystack.contains(&query) {
            results.push(SearchResult { prompt, path });
        }
    }
    Ok(results)
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
    fn hits_body_title_and_notes() {
        let conn = setup();
        let folder = folders::create(&conn, None, "Edu").unwrap();
        super::super::prompts::create(&conn, Some(folder.id), "Lesson", "CEFR levels", "").unwrap();
        super::super::prompts::create(&conn, Some(folder.id), "CEFR title", "body", "notes").unwrap();
        super::super::prompts::create(&conn, Some(folder.id), "Notes match", "x", "CEFR").unwrap();
        assert_eq!(search(&conn, "cefr").unwrap().len(), 3);
    }

    #[test]
    fn hits_folder_path() {
        let conn = setup();
        let work = folders::create(&conn, None, "Work").unwrap();
        let edu = folders::create(&conn, Some(work.id), "Edu").unwrap();
        let p = super::super::prompts::create(
            &conn,
            Some(edu.id),
            "Lesson",
            "unrelated body",
            "",
        )
        .unwrap();
        let results = search(&conn, "Edu").unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].prompt.id, p.id);
        assert_eq!(results[0].path, "Work/Edu");
    }

    #[test]
    fn unfiled_prompt_has_empty_path() {
        let conn = setup();
        let p = super::super::prompts::create(&conn, None, "T", "CEFR", "").unwrap();
        let results = search(&conn, "CEFR").unwrap();
        assert_eq!(results[0].prompt.id, p.id);
        assert_eq!(results[0].path, "");
    }

    #[test]
    fn deleted_prompts_excluded() {
        let conn = setup();
        let p = super::super::prompts::create(&conn, None, "T", "CEFR", "").unwrap();
        super::super::prompts::delete(&conn, p.id).unwrap();
        assert!(search(&conn, "CEFR").unwrap().is_empty());
    }

    #[test]
    fn empty_query_returns_empty() {
        let conn = setup();
        super::super::prompts::create(&conn, None, "T", "CEFR", "").unwrap();
        assert!(search(&conn, "   ").unwrap().is_empty());
    }
}
