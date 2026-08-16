use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::library::folders;
use crate::library::prompts::{self, Prompt};

pub type Result<T> = std::result::Result<T, String>;

pub const FORMAT_VERSION: u32 = 1;

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportFile {
    pub version: u32,
    pub folders: Vec<ExportFolder>,
    pub prompts: Vec<ExportPrompt>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExportFolder {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportPrompt {
    pub folder_id: Option<i64>,
    pub title: String,
    pub body: String,
    pub notes: String,
    pub favorite: bool,
}

/// Serialize the whole library (folders + prompts) to JSON.
pub fn export_json(conn: &Connection) -> Result<String> {
    let folders = folders::list(conn)?;
    let export_folders: Vec<ExportFolder> = folders
        .iter()
        .map(|f| ExportFolder {
            id: f.id,
            parent_id: f.parent_id,
            name: f.name.clone(),
        })
        .collect();

    let prompts = list_all_prompts(conn)?;
    let export_prompts: Vec<ExportPrompt> = prompts
        .iter()
        .map(|p| ExportPrompt {
            folder_id: p.folder_id,
            title: p.title.clone(),
            body: p.body.clone(),
            notes: p.notes.clone(),
            favorite: p.favorite,
        })
        .collect();

    let file = ExportFile {
        version: FORMAT_VERSION,
        folders: export_folders,
        prompts: export_prompts,
    };
    serde_json::to_string_pretty(&file).map_err(|e| format!("serialize export: {e}"))
}

/// Serialize the library to Markdown. Folders become `#`-style headings
/// (path depth), prompts become `## Title` + body. Unfiled prompts are last
/// under a `# Unfiled` heading.
pub fn export_markdown(conn: &Connection) -> Result<String> {
    let folders = folders::list(conn)?;
    let prompts = list_all_prompts(conn)?;

    // folder id -> depth & path
    let depth_of = |id: Option<i64>| -> (usize, String) {
        let mut path: Vec<String> = Vec::new();
        let mut current = id;
        let mut guard = 0;
        while let Some(fid) = current {
            guard += 1;
            if guard > 1024 {
                break;
            }
            match folders.iter().find(|f| f.id == fid) {
                Some(f) => {
                    path.push(f.name.clone());
                    current = f.parent_id;
                }
                None => break,
            }
        }
        path.reverse();
        (path.len(), path.join("/"))
    };

    let mut out = String::new();
    for p in &prompts {
        let (depth, path) = depth_of(p.folder_id);
        let heading = if path.is_empty() {
            "Unfiled".to_string()
        } else {
            path
        };
        out.push_str(&"#".repeat(depth.max(1)));
        out.push(' ');
        out.push_str(&heading);
        out.push('\n');
        out.push_str(&"#".repeat(depth + 1));
        out.push(' ');
        out.push_str(&p.title);
        out.push('\n');
        out.push('\n');
        out.push_str(&p.body);
        out.push_str("\n\n---\n\n");
    }
    Ok(out)
}

fn list_all_prompts(conn: &Connection) -> Result<Vec<Prompt>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, folder_id, title, body, notes, favorite, use_count
             FROM prompts WHERE deleted_at IS NULL ORDER BY folder_id, title",
        )
        .map_err(|e| format!("prepare export prompts: {e}"))?;
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
            })
        })
        .map_err(|e| format!("query export prompts: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect export prompts: {e}"))?;
    Ok(prompts)
}

/// Import an `ExportFile`. Idempotent: folders are matched by (parent, name)
/// and prompts by (folder, title), so importing over existing data updates
/// rather than duplicates.
pub fn import_json(conn: &Connection, json: &str) -> Result<(usize, usize)> {
    let file: ExportFile =
        serde_json::from_str(json).map_err(|e| format!("parse import: {e}"))?;
    if file.version != FORMAT_VERSION {
        return Err(format!(
            "unsupported export version {} (expected {})",
            file.version, FORMAT_VERSION
        ));
    }

    let ExportFile { folders: export_folders, prompts: export_prompts, .. } = file;

    // Map old folder ids -> new ids by matching on (parent_id, name).
    let mut id_map: std::collections::HashMap<i64, i64> = std::collections::HashMap::new();

    // Create folders parent-first. Sort so parents come before children.
    let mut folders_sorted = export_folders;
    let depth_lookup = folders_sorted.clone();
    folders_sorted.sort_by_key(|f| parent_depth(&depth_lookup, f));

    let mut created_folders = 0usize;
    for f in &folders_sorted {
        let new_parent = f.parent_id.and_then(|pid| id_map.get(&pid).copied());
        if let Some(existing) = find_folder(conn, new_parent, &f.name)? {
            id_map.insert(f.id, existing.id);
            continue;
        }
        let created = folders::create(conn, new_parent, &f.name)?;
        id_map.insert(f.id, created.id);
        created_folders += 1;
    }

    let mut created_prompts = 0usize;
    let mut updated_prompts = 0usize;
    for p in &export_prompts {
        let new_folder = p.folder_id.and_then(|fid| id_map.get(&fid).copied());
        match find_prompt(conn, new_folder, &p.title)? {
            Some(existing) => {
                prompts::update(conn, existing.id, &p.title, &p.body, &p.notes)?;
                if p.favorite != existing.favorite {
                    prompts::toggle_favorite(conn, existing.id)?;
                }
                updated_prompts += 1;
            }
            None => {
                let created = prompts::create(conn, new_folder, &p.title, &p.body, &p.notes)?;
                if p.favorite {
                    prompts::toggle_favorite(conn, created.id)?;
                }
                created_prompts += 1;
            }
        }
    }

    Ok((created_folders, created_prompts + updated_prompts))
}

fn parent_depth(all: &[ExportFolder], folder: &ExportFolder) -> usize {
    let mut depth = 0;
    let mut current = folder.parent_id;
    let mut guard = 0;
    while let Some(pid) = current {
        guard += 1;
        if guard > 1024 {
            break;
        }
        depth += 1;
        current = all.iter().find(|f| f.id == pid).and_then(|f| f.parent_id);
    }
    depth
}

fn find_folder(conn: &Connection, parent_id: Option<i64>, name: &str) -> Result<Option<folders::Folder>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, parent_id, name, sort_order FROM folders
             WHERE parent_id IS ?1 AND name = ?2 AND deleted_at IS NULL",
        )
        .map_err(|e| format!("prepare find folder: {e}"))?;
    let mut rows = stmt
        .query_map(params![parent_id, name], |row| {
            Ok(folders::Folder {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
                sort_order: row.get(3)?,
            })
        })
        .map_err(|e| format!("query find folder: {e}"))?;
    rows.next().transpose().map_err(|e| format!("row find folder: {e}"))
}

fn find_prompt(conn: &Connection, folder_id: Option<i64>, title: &str) -> Result<Option<Prompt>> {
    let mut stmt = conn
        .prepare(
            "SELECT id, folder_id, title, body, notes, favorite, use_count FROM prompts
             WHERE folder_id IS ?1 AND title = ?2 AND deleted_at IS NULL",
        )
        .map_err(|e| format!("prepare find prompt: {e}"))?;
    let mut rows = stmt
        .query_map(params![folder_id, title], |row| {
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
        })
        .map_err(|e| format!("query find prompt: {e}"))?;
    rows.next().transpose().map_err(|e| format!("row find prompt: {e}"))
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
    fn json_round_trip() {
        let conn = setup();
        let work = folders::create(&conn, None, "Work").unwrap();
        let edu = folders::create(&conn, Some(work.id), "Edu").unwrap();
        let p = prompts::create(&conn, Some(edu.id), "Lesson", "CEFR body", "notes").unwrap();
        prompts::toggle_favorite(&conn, p.id).unwrap();

        let json = export_json(&conn).unwrap();
        let file: ExportFile = serde_json::from_str(&json).unwrap();
        assert_eq!(file.folders.len(), 2);
        assert_eq!(file.prompts.len(), 1);
        assert_eq!(file.prompts[0].body, "CEFR body");
        assert!(file.prompts[0].favorite);
    }

    #[test]
    fn import_into_empty_db_matches() {
        let conn = setup();
        let work = folders::create(&conn, None, "Work").unwrap();
        let edu = folders::create(&conn, Some(work.id), "Edu").unwrap();
        prompts::create(&conn, Some(edu.id), "Lesson", "body", "notes").unwrap();
        let json = export_json(&conn).unwrap();

        let fresh = setup();
        let (fc, fp) = import_json(&fresh, &json).unwrap();
        assert_eq!(fc, 2);
        assert_eq!(fp, 1);
        let folders = folders::list(&fresh).unwrap();
        assert_eq!(folders.len(), 2);
        assert_eq!(folders[1].parent_id, Some(folders[0].id));
        let prompts = prompts::list(&fresh, Some(folders[1].id)).unwrap();
        assert_eq!(prompts[0].body, "body");
    }

    #[test]
    fn import_is_idempotent() {
        let conn = setup();
        let work = folders::create(&conn, None, "Work").unwrap();
        prompts::create(&conn, Some(work.id), "T", "v1", "").unwrap();
        let json = export_json(&conn).unwrap();

        // Import once (updates in place), then again.
        let (fc1, fp1) = import_json(&conn, &json).unwrap();
        assert_eq!(fc1, 0);
        assert_eq!(fp1, 1);
        let (fc2, fp2) = import_json(&conn, &json).unwrap();
        assert_eq!(fc2, 0);
        assert_eq!(fp2, 1);
        assert_eq!(folders::list(&conn).unwrap().len(), 1);
        assert_eq!(prompts::list(&conn, Some(work.id)).unwrap().len(), 1);
    }

    #[test]
    fn markdown_contains_headings_and_body() {
        let conn = setup();
        let work = folders::create(&conn, None, "Work").unwrap();
        let edu = folders::create(&conn, Some(work.id), "Edu").unwrap();
        prompts::create(&conn, Some(edu.id), "Lesson", "CEFR body", "").unwrap();
        prompts::create(&conn, None, "Solo", "standalone", "").unwrap();

        let md = export_markdown(&conn).unwrap();
        assert!(md.contains("## Work/Edu"));
        assert!(md.contains("### Lesson"));
        assert!(md.contains("CEFR body"));
        assert!(md.contains("# Unfiled"));
        assert!(md.contains("# Solo"));
        assert!(md.contains("standalone"));
    }

    #[test]
    fn wrong_version_rejected() {
        let conn = setup();
        let err = import_json(&conn, r#"{"version": 99, "folders": [], "prompts": []}"#).unwrap_err();
        assert!(err.contains("unsupported export version"));
    }
}
