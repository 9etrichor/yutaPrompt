use std::path::PathBuf;
use tauri::Manager;

pub mod migrations;

pub const DB_FILE: &str = "yuta-prompt.db";

/// Resolve the absolute path of the SQLite database file.
/// Matches the location used by tauri-plugin-sql (app config dir).
pub fn get_connection(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_config_dir()
        .expect("No app config path was found")
        .join(DB_FILE)
}
