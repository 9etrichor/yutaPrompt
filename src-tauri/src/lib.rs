mod db;
mod library;

use library::folders::{self, Folder};
use library::prompts::{self, Prompt};
use library::search::{self, SearchResult};
use library::trash::{self, TrashListing};

#[tauri::command]
fn list_folders(app: tauri::AppHandle) -> Result<Vec<Folder>, String> {
    let conn = folders::open(&app)?;
    folders::list(&conn)
}

#[tauri::command]
fn create_folder(
    app: tauri::AppHandle,
    parent_id: Option<i64>,
    name: String,
) -> Result<Folder, String> {
    let conn = folders::open(&app)?;
    folders::create(&conn, parent_id, &name)
}

#[tauri::command]
fn rename_folder(app: tauri::AppHandle, id: i64, name: String) -> Result<Folder, String> {
    let conn = folders::open(&app)?;
    folders::rename(&conn, id, &name)
}

#[tauri::command]
fn move_folder(
    app: tauri::AppHandle,
    id: i64,
    new_parent_id: Option<i64>,
) -> Result<Folder, String> {
    let conn = folders::open(&app)?;
    folders::move_folder(&conn, id, new_parent_id)
}

#[tauri::command]
fn delete_folder(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = folders::open(&app)?;
    folders::delete(&conn, id)
}

#[tauri::command]
fn list_prompts(app: tauri::AppHandle, folder_id: Option<i64>) -> Result<Vec<Prompt>, String> {
    let conn = prompts::open(&app)?;
    prompts::list(&conn, folder_id)
}

#[tauri::command]
fn create_prompt(
    app: tauri::AppHandle,
    folder_id: Option<i64>,
    title: String,
    body: String,
    notes: String,
) -> Result<Prompt, String> {
    let conn = prompts::open(&app)?;
    prompts::create(&conn, folder_id, &title, &body, &notes)
}

#[tauri::command]
fn update_prompt(
    app: tauri::AppHandle,
    id: i64,
    title: String,
    body: String,
    notes: String,
) -> Result<Prompt, String> {
    let conn = prompts::open(&app)?;
    prompts::update(&conn, id, &title, &body, &notes)
}

#[tauri::command]
fn duplicate_prompt(app: tauri::AppHandle, id: i64) -> Result<Prompt, String> {
    let conn = prompts::open(&app)?;
    prompts::duplicate(&conn, id)
}

#[tauri::command]
fn delete_prompt(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = prompts::open(&app)?;
    prompts::delete(&conn, id)
}

#[tauri::command]
fn list_trash(app: tauri::AppHandle) -> Result<TrashListing, String> {
    let conn = trash::open(&app)?;
    trash::list(&conn)
}

#[tauri::command]
fn restore_folder(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = trash::open(&app)?;
    trash::restore_folder(&conn, id)
}

#[tauri::command]
fn restore_prompt(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = trash::open(&app)?;
    trash::restore_prompt(&conn, id)
}

#[tauri::command]
fn purge_folder(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = trash::open(&app)?;
    trash::purge_folder(&conn, id)
}

#[tauri::command]
fn purge_prompt(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = trash::open(&app)?;
    trash::purge_prompt(&conn, id)
}

#[tauri::command]
fn search_prompts(app: tauri::AppHandle, query: String) -> Result<Vec<SearchResult>, String> {
    let conn = search::open(&app)?;
    search::search(&conn, &query)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::migrations::DB_PATH, db::migrations::migrations())
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            list_folders,
            create_folder,
            rename_folder,
            move_folder,
            delete_folder,
            list_prompts,
            create_prompt,
            update_prompt,
            duplicate_prompt,
            delete_prompt,
            list_trash,
            restore_folder,
            restore_prompt,
            purge_folder,
            purge_prompt,
            search_prompts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
