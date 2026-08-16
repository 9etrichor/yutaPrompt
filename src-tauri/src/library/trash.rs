use rusqlite::{params, Connection};
use serde::Serialize;

use super::folders;

pub type Result<T> = std::result::Result<T, String>;

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TrashFolder {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TrashPrompt {
    pub id: i64,
    pub folder_id: Option<i64>,
    pub title: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct TrashListing {
    pub folders: Vec<TrashFolder>,
    pub prompts: Vec<TrashPrompt>,
}

/// Everything soft-deleted, newest first.
pub fn list(conn: &Connection) -> Result<TrashListing> {
    let mut fstmt = conn
        .prepare(
            "SELECT id, parent_id, name FROM folders
             WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
        )
        .map_err(|e| format!("prepare trash folders: {e}"))?;
    let folders = fstmt
        .query_map([], |row| {
            Ok(TrashFolder {
                id: row.get(0)?,
                parent_id: row.get(1)?,
                name: row.get(2)?,
            })
        })
        .map_err(|e| format!("query trash folders: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect trash folders: {e}"))?;

    let mut pstmt = conn
        .prepare(
            "SELECT id, folder_id, title FROM prompts
             WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC",
        )
        .map_err(|e| format!("prepare trash prompts: {e}"))?;
    let prompts = pstmt
        .query_map([], |row| {
            Ok(TrashPrompt {
                id: row.get(0)?,
                folder_id: row.get(1)?,
                title: row.get(2)?,
            })
        })
        .map_err(|e| format!("query trash prompts: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect trash prompts: {e}"))?;

    Ok(TrashListing { folders, prompts })
}

fn folder_alive(conn: &Connection, id: i64) -> Result<bool> {
    let count: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM folders WHERE id = ?1 AND deleted_at IS NULL",
            params![id],
            |row| row.get(0),
        )
        .map_err(|e| format!("check folder alive: {e}"))?;
    Ok(count > 0)
}

/// Restore a folder (and its whole subtree). If the original parent was
/// deleted too, fall back to root.
pub fn restore_folder(conn: &Connection, id: i64) -> Result<()> {
    let folder = folders::get_by_id(conn, id)?;
    let parent_id = match folder.parent_id {
        Some(parent) if folder_alive(conn, parent)? => Some(parent),
        _ => None,
    };
    let ids = folders::subtree_ids(conn, id)?;
    for fid in &ids {
        conn.execute(
            "UPDATE folders SET deleted_at = NULL, updated_at = datetime('now')
             WHERE id = ?1 AND deleted_at IS NOT NULL",
            params![fid],
        )
        .map_err(|e| format!("restore folder {fid}: {e}"))?;
        conn.execute(
            "UPDATE prompts SET deleted_at = NULL, updated_at = datetime('now')
             WHERE folder_id = ?1 AND deleted_at IS NOT NULL",
            params![fid],
        )
        .map_err(|e| format!("restore prompts under {fid}: {e}"))?;
    }
    conn.execute(
        "UPDATE folders SET parent_id = ?1, updated_at = datetime('now') WHERE id = ?2",
        params![parent_id, id],
    )
    .map_err(|e| format!("relink restored folder: {e}"))?;
    Ok(())
}

/// Restore a prompt. If the original folder is gone, place it unfiled.
pub fn restore_prompt(conn: &Connection, id: i64) -> Result<()> {
    let prompt = super::prompts::get_by_id_unfiltered(conn, id)?;
    let folder_id = match prompt.folder_id {
        Some(fid) if folder_alive(conn, fid)? => Some(fid),
        _ => None,
    };
    let affected = conn
        .execute(
            "UPDATE prompts SET deleted_at = NULL, folder_id = ?1, updated_at = datetime('now')
             WHERE id = ?2 AND deleted_at IS NOT NULL",
            params![folder_id, id],
        )
        .map_err(|e| format!("restore prompt: {e}"))?;
    if affected == 0 {
        return Err("prompt not found in trash".to_string());
    }
    Ok(())
}

/// Permanently delete a folder and its subtree (folders + prompts).
pub fn purge_folder(conn: &Connection, id: i64) -> Result<()> {
    let ids = folders::subtree_ids(conn, id)?;
    for fid in &ids {
        conn.execute(
            "DELETE FROM prompts WHERE folder_id = ?1 AND deleted_at IS NOT NULL",
            params![fid],
        )
        .map_err(|e| format!("purge prompts of {fid}: {e}"))?;
    }
    let mut stmt = conn
        .prepare("DELETE FROM folders WHERE id = ?1 AND deleted_at IS NOT NULL")
        .map_err(|e| format!("prepare purge folder: {e}"))?;
    for fid in ids {
        stmt.execute(params![fid]).map_err(|e| format!("purge folder {fid}: {e}"))?;
    }
    Ok(())
}

/// Permanently delete a prompt.
pub fn purge_prompt(conn: &Connection, id: i64) -> Result<()> {
    let affected = conn
        .execute(
            "DELETE FROM prompts WHERE id = ?1 AND deleted_at IS NOT NULL",
            params![id],
        )
        .map_err(|e| format!("purge prompt: {e}"))?;
    if affected == 0 {
        return Err("prompt not found in trash".to_string());
    }
    Ok(())
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
    fn cascade_delete_lands_subtree_in_trash() {
        let conn = setup();
        let a = folders::create(&conn, None, "A").unwrap();
        let b = folders::create(&conn, Some(a.id), "B").unwrap();
        super::super::prompts::create(&conn, Some(b.id), "P", "", "").unwrap();
        folders::delete(&conn, a.id).unwrap();
        let listing = list(&conn).unwrap();
        assert_eq!(listing.folders.len(), 2);
        assert_eq!(listing.prompts.len(), 1);
    }

    #[test]
    fn restore_folder_restores_subtree_and_prompts() {
        let conn = setup();
        let a = folders::create(&conn, None, "A").unwrap();
        let b = folders::create(&conn, Some(a.id), "B").unwrap();
        super::super::prompts::create(&conn, Some(b.id), "P", "", "").unwrap();
        folders::delete(&conn, a.id).unwrap();
        restore_folder(&conn, a.id).unwrap();
        assert_eq!(folders::list(&conn).unwrap().len(), 2);
        assert_eq!(super::super::prompts::list(&conn, Some(b.id)).unwrap().len(), 1);
    }

    #[test]
    fn restore_folder_with_deleted_parent_goes_to_root() {
        let conn = setup();
        let root = folders::create(&conn, None, "Root").unwrap();
        let a = folders::create(&conn, Some(root.id), "A").unwrap();
        let b = folders::create(&conn, Some(a.id), "B").unwrap();
        // Delete only the leaf B; its parent A still exists.
        folders::delete(&conn, b.id).unwrap();
        restore_folder(&conn, b.id).unwrap();
        assert_eq!(folders::get_by_id(&conn, b.id).unwrap().parent_id, Some(a.id));

        // Delete A (which takes B down again), then restore B -> parent A is gone.
        folders::delete(&conn, a.id).unwrap();
        restore_folder(&conn, b.id).unwrap();
        assert_eq!(folders::get_by_id(&conn, b.id).unwrap().parent_id, None);
        let _ = root.id;
    }

    #[test]
    fn restore_prompt_to_original_folder_or_unfiled() {
        let conn = setup();
        let a = folders::create(&conn, None, "A").unwrap();
        let p = super::super::prompts::create(&conn, Some(a.id), "P", "", "").unwrap();
        super::super::prompts::delete(&conn, p.id).unwrap();
        restore_prompt(&conn, p.id).unwrap();
        assert_eq!(
            super::super::prompts::get_by_id(&conn, p.id).unwrap().folder_id,
            Some(a.id)
        );

        // Delete the folder, then the prompt, then restore -> unfiled.
        let p2 = super::super::prompts::create(&conn, Some(a.id), "P2", "", "").unwrap();
        folders::delete(&conn, a.id).unwrap();
        restore_prompt(&conn, p2.id).unwrap();
        assert_eq!(
            super::super::prompts::get_by_id(&conn, p2.id).unwrap().folder_id,
            None
        );
    }

    #[test]
    fn purge_removes_permanently() {
        let conn = setup();
        let a = folders::create(&conn, None, "A").unwrap();
        folders::delete(&conn, a.id).unwrap();
        purge_folder(&conn, a.id).unwrap();
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM folders", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
