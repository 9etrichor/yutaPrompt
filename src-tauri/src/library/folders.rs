use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::db::get_connection;

pub type Result<T> = std::result::Result<T, String>;

/// Millisecond-precision UTC timestamp (see prompts::NOW).
pub(crate) const NOW: &str = "strftime('%Y-%m-%d %H:%M:%f','now')";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Folder {
    pub id: i64,
    pub parent_id: Option<i64>,
    pub name: String,
    pub sort_order: i64,
}

const FOLDER_COLUMNS: &str = "id, parent_id, name, sort_order";

fn row_to_folder(row: &rusqlite::Row) -> rusqlite::Result<Folder> {
    Ok(Folder {
        id: row.get(0)?,
        parent_id: row.get(1)?,
        name: row.get(2)?,
        sort_order: row.get(3)?,
    })
}

/// All non-deleted folders, ordered by parent then sort_order.
pub fn list(conn: &Connection) -> Result<Vec<Folder>> {
    let sql = format!(
        "SELECT {FOLDER_COLUMNS} FROM folders WHERE deleted_at IS NULL ORDER BY parent_id, sort_order, name"
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("prepare list folders: {e}"))?;
    let folders = stmt
        .query_map([], row_to_folder)
        .map_err(|e| format!("query folders: {e}"))?
        .collect::<rusqlite::Result<Vec<_>>>()
        .map_err(|e| format!("collect folders: {e}"))?;
    Ok(folders)
}

/// Create a folder under `parent_id` (None = root). Unique name per parent.
pub fn create(conn: &Connection, parent_id: Option<i64>, name: &str) -> Result<Folder> {
    let name = name.trim();
    if name.is_empty() {
        return Err("folder name cannot be empty".to_string());
    }
    if folder_exists_with_name(conn, parent_id, name, None)? {
        return Err("a folder with this name already exists here".to_string());
    }

    let sort_order = next_sort_order(conn, parent_id)?;
    conn.execute(
        &format!(
            "INSERT INTO folders (parent_id, name, sort_order, created_at, updated_at)
             VALUES (?1, ?2, ?3, {NOW}, {NOW})"
        ),
        params![parent_id, name, sort_order],
    )
    .map_err(|e| format!("insert folder: {e}"))?;
    let id = conn.last_insert_rowid();
    get_by_id(conn, id)
}

pub fn rename(conn: &Connection, id: i64, name: &str) -> Result<Folder> {
    let name = name.trim();
    if name.is_empty() {
        return Err("folder name cannot be empty".to_string());
    }
    let existing = get_by_id(conn, id)?;
    if folder_exists_with_name(conn, existing.parent_id, name, Some(id))? {
        return Err("a folder with this name already exists here".to_string());
    }
    conn.execute(
        &format!("UPDATE folders SET name = ?1, updated_at = {NOW} WHERE id = ?2"),
        params![name, id],
    )
    .map_err(|e| format!("rename folder: {e}"))?;
    get_by_id(conn, id)
}

/// Move a folder under `new_parent_id` (None = root). Rejects cycles and self-moves.
pub fn move_folder(conn: &Connection, id: i64, new_parent_id: Option<i64>) -> Result<Folder> {
    if new_parent_id == Some(id) {
        return Err("cannot move a folder into itself".to_string());
    }
    if let Some(parent) = new_parent_id {
        if is_descendant(conn, parent, id)? {
            return Err("cannot move a folder into one of its own descendants".to_string());
        }
    }
    conn.execute(
        &format!("UPDATE folders SET parent_id = ?1, updated_at = {NOW} WHERE id = ?2"),
        params![new_parent_id, id],
    )
    .map_err(|e| format!("move folder: {e}"))?;
    get_by_id(conn, id)
}

/// Soft-delete a folder.
/// All ids in the subtree rooted at `id` (including `id` itself), live or deleted.
pub fn subtree_ids(conn: &Connection, id: i64) -> Result<Vec<i64>> {
    let mut stmt = conn
        .prepare(
            "WITH RECURSIVE sub(id) AS (
                SELECT id FROM folders WHERE id = ?1
                UNION ALL
                SELECT f.id FROM folders f JOIN sub ON f.parent_id = sub.id
             )
             SELECT id FROM sub",
        )
        .map_err(|e| format!("prepare subtree: {e}"))?;
    let ids = stmt
        .query_map(params![id], |row| row.get(0))
        .map_err(|e| format!("query subtree: {e}"))?
        .collect::<rusqlite::Result<Vec<i64>>>()
        .map_err(|e| format!("collect subtree: {e}"))?;
    Ok(ids)
}

/// Soft-delete a folder and its whole subtree (folders + their prompts).
pub fn delete(conn: &Connection, id: i64) -> Result<()> {
    let affected = conn
        .execute(
            &format!(
                "UPDATE folders SET deleted_at = {NOW}, updated_at = {NOW}
                 WHERE id = ?1 AND deleted_at IS NULL"
            ),
            params![id],
        )
        .map_err(|e| format!("delete folder: {e}"))?;
    if affected == 0 {
        return Err("folder not found".to_string());
    }
    let ids = subtree_ids(conn, id)?;
    for fid in &ids {
        conn.execute(
            &format!(
                "UPDATE folders SET deleted_at = {NOW}, updated_at = {NOW}
                 WHERE id = ?1 AND deleted_at IS NULL"
            ),
            params![fid],
        )
        .map_err(|e| format!("delete subtree folder {fid}: {e}"))?;
        conn.execute(
            &format!(
                "UPDATE prompts SET deleted_at = {NOW}, updated_at = {NOW}
                 WHERE folder_id = ?1 AND deleted_at IS NULL"
            ),
            params![fid],
        )
        .map_err(|e| format!("delete subtree prompts of {fid}: {e}"))?;
    }
    Ok(())
}

pub fn get_by_id(conn: &Connection, id: i64) -> Result<Folder> {
    let sql = format!("SELECT {FOLDER_COLUMNS} FROM folders WHERE id = ?1");
    conn.query_row(&sql, params![id], row_to_folder)
        .map_err(|e| format!("get folder {id}: {e}"))
}

fn folder_exists_with_name(
    conn: &Connection,
    parent_id: Option<i64>,
    name: &str,
    exclude_id: Option<i64>,
) -> Result<bool> {
    let sql = "SELECT COUNT(*) FROM folders
               WHERE parent_id IS ?1 AND name = ?2 AND deleted_at IS NULL AND id IS NOT ?3";
    let count: i64 = conn
        .query_row(sql, params![parent_id, name, exclude_id], |row| row.get(0))
        .map_err(|e| format!("check folder name: {e}"))?;
    Ok(count > 0)
}

fn next_sort_order(conn: &Connection, parent_id: Option<i64>) -> Result<i64> {
    let sql = "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM folders WHERE parent_id IS ?1";
    conn.query_row(sql, params![parent_id], |row| row.get(0))
        .map_err(|e| format!("next sort order: {e}"))
}

/// Is `candidate` a descendant of `id`? True if candidate != id and its
/// parent chain (walking up) reaches `id`.
fn is_descendant(conn: &Connection, candidate: i64, id: i64) -> Result<bool> {
    let mut current = candidate;
    for _ in 0..1024 {
        let parent: Option<i64> = conn
            .query_row(
                "SELECT parent_id FROM folders WHERE id = ?1 AND deleted_at IS NULL",
                params![current],
                |row| row.get(0),
            )
            .map_err(|e| format!("walk folder tree: {e}"))?;
        match parent {
            None => return Ok(false),
            Some(p) if p == id => return Ok(true),
            Some(p) => current = p,
        }
    }
    Ok(false)
}

/// Open a fresh connection to the app database file.
pub fn open(app: &tauri::AppHandle) -> Result<Connection> {
    let path = get_connection(app);
    Connection::open(path).map_err(|e| format!("open database: {e}"))
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
    fn create_root_and_nested() {
        let conn = setup();
        let root = create(&conn, None, "Root").unwrap();
        let child = create(&conn, Some(root.id), "Child").unwrap();
        assert_eq!(child.parent_id, Some(root.id));
        assert_eq!(list(&conn).unwrap().len(), 2);
    }

    #[test]
    fn duplicate_name_same_parent_rejected() {
        let conn = setup();
        create(&conn, None, "A").unwrap();
        let err = create(&conn, None, "A").unwrap_err();
        assert!(err.contains("already exists"));
    }

    #[test]
    fn rename_works() {
        let conn = setup();
        let f = create(&conn, None, "Old").unwrap();
        let renamed = rename(&conn, f.id, "New").unwrap();
        assert_eq!(renamed.name, "New");
    }

    #[test]
    fn move_into_own_descendant_rejected() {
        let conn = setup();
        let a = create(&conn, None, "A").unwrap();
        let b = create(&conn, Some(a.id), "B").unwrap();
        let c = create(&conn, Some(b.id), "C").unwrap();
        // move A under C -> cycle
        let err = move_folder(&conn, a.id, Some(c.id)).unwrap_err();
        assert!(err.contains("descendants"));
        // move B under C -> also cycle (C is B's descendant)
        let err = move_folder(&conn, b.id, Some(c.id)).unwrap_err();
        assert!(err.contains("descendants"));
    }

    #[test]
    fn self_move_rejected() {
        let conn = setup();
        let a = create(&conn, None, "A").unwrap();
        let err = move_folder(&conn, a.id, Some(a.id)).unwrap_err();
        assert!(err.contains("into itself"));
    }

    #[test]
    fn move_to_valid_parent_ok() {
        let conn = setup();
        let a = create(&conn, None, "A").unwrap();
        let b = create(&conn, None, "B").unwrap();
        let moved = move_folder(&conn, b.id, Some(a.id)).unwrap();
        assert_eq!(moved.parent_id, Some(a.id));
    }

    #[test]
    fn delete_is_soft() {
        let conn = setup();
        let a = create(&conn, None, "A").unwrap();
        delete(&conn, a.id).unwrap();
        assert!(list(&conn).unwrap().is_empty());
        // still present in db
        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM folders", [], |r| r.get(0))
            .unwrap();
        assert_eq!(count, 1);
    }

    #[test]
    fn empty_name_rejected() {
        let conn = setup();
        assert!(create(&conn, None, "   ").is_err());
    }
}
