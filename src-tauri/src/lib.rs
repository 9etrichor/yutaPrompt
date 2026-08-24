mod db;
mod export;
mod library;
mod menu;

use library::folders::{self, Folder};
use library::prompts::{self, Prompt};
use library::search::{self, SearchResult};
use library::trash::{self, TrashListing};

#[tauri::command]
fn set_menu_locale(app: tauri::AppHandle, is_en: bool) -> Result<(), String> {
    menu::install_menu(&app, is_en).map_err(|e| e.to_string())
}

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
    expected_updated_at: Option<String>,
    force: bool,
) -> Result<Prompt, String> {
    let conn = prompts::open(&app)?;
    if force {
        prompts::update(&conn, id, &title, &body, &notes)
    } else {
        prompts::update_checked(&conn, id, &title, &body, &notes, expected_updated_at)
    }
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
fn record_prompt_use(app: tauri::AppHandle, id: i64) -> Result<(), String> {
    let conn = prompts::open(&app)?;
    prompts::record_use(&conn, id)
}

#[tauri::command]
fn toggle_prompt_favorite(app: tauri::AppHandle, id: i64) -> Result<bool, String> {
    let conn = prompts::open(&app)?;
    prompts::toggle_favorite(&conn, id)
}

/// Fill `{{name}}` placeholders in `text` with `values` and return the result.
/// Missing values are left as-is. Does not touch the stored prompt.
#[tauri::command]
fn substitute_variables(
    text: String,
    values: std::collections::HashMap<String, String>,
) -> Result<String, String> {
    Ok(prompts::substitute_variables(&text, &values))
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

#[tauri::command]
fn export_to_json(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let conn = export::open(&app)?;
    let json = export::export_json(&conn)?;
    std::fs::write(&path, json).map_err(|e| format!("write json export: {e}"))
}

#[tauri::command]
fn export_to_markdown(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let conn = export::open(&app)?;
    let md = export::export_markdown(&conn)?;
    std::fs::write(&path, md).map_err(|e| format!("write markdown export: {e}"))
}

#[tauri::command]
fn import_from_json(app: tauri::AppHandle, path: String) -> Result<(usize, usize), String> {
    let json = std::fs::read_to_string(&path).map_err(|e| format!("read import: {e}"))?;
    let conn = export::open(&app)?;
    export::import_json(&conn, &json)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(db::migrations::DB_PATH, db::migrations::migrations())
                .build(),
        )
        .setup(|app| {
            menu::install_menu(app.handle(), true)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            menu::emit_menu(app, event.id().0.as_str());
        })
        .invoke_handler(tauri::generate_handler![
            set_menu_locale,
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
            record_prompt_use,
            toggle_prompt_favorite,
            substitute_variables,
            list_trash,
            restore_folder,
            restore_prompt,
            purge_folder,
            purge_prompt,
            search_prompts,
            export_to_json,
            export_to_markdown,
            import_from_json
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
