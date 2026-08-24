use tauri::AppHandle;
use tauri::menu::{MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder};

/// Menu item ids emitted to the frontend as `menu://<id>` events.
const ID_NEW_PROMPT: &str = "new-prompt";
const ID_SAVE: &str = "save";
const ID_SEARCH: &str = "search";
const ID_EXPORT_JSON: &str = "export-json";
const ID_EXPORT_MD: &str = "export-md";
const ID_IMPORT_JSON: &str = "import-json";

/// Build and install the application menu. `is_en` selects menu labels.
pub fn install_menu<R: tauri::Runtime>(app: &AppHandle<R>, is_en: bool) -> tauri::Result<()> {
    let (file_label, new_label, save_label, search_label, export_json_label, export_md_label, import_label, quit_label) =
        if is_en {
            (
                "File", "New Prompt", "Save", "Search", "Export JSON", "Export Markdown",
                "Import JSON", "Quit",
            )
        } else {
            (
                "檔案", "新增提示詞", "儲存", "搜尋", "匯出 JSON", "匯出 Markdown",
                "匯入 JSON", "結束",
            )
        };

    let new_prompt = MenuItemBuilder::with_id(ID_NEW_PROMPT, new_label)
        .accelerator("CmdOrCtrl+N")
        .build(app)?;
    let save = MenuItemBuilder::with_id(ID_SAVE, save_label)
        .accelerator("CmdOrCtrl+S")
        .build(app)?;
    let search = MenuItemBuilder::with_id(ID_SEARCH, search_label)
        .accelerator("CmdOrCtrl+K")
        .build(app)?;
    let export_json = MenuItemBuilder::with_id(ID_EXPORT_JSON, export_json_label)
        .accelerator("CmdOrCtrl+Shift+J")
        .build(app)?;
    let export_md = MenuItemBuilder::with_id(ID_EXPORT_MD, export_md_label)
        .accelerator("CmdOrCtrl+Shift+M")
        .build(app)?;
    let import_json = MenuItemBuilder::with_id(ID_IMPORT_JSON, import_label)
        .accelerator("CmdOrCtrl+Shift+I")
        .build(app)?;
    let quit = PredefinedMenuItem::quit(app, Some(quit_label))?;

    let file = SubmenuBuilder::new(app, file_label)
        .item(&new_prompt)
        .item(&save)
        .item(&search)
        .separator()
        .item(&export_json)
        .item(&export_md)
        .item(&import_json)
        .separator()
        .item(&quit)
        .build()?;

    let menu = MenuBuilder::new(app).item(&file).build()?;
    app.set_menu(menu)?;
    Ok(())
}

/// Emit the menu event to the webview so the frontend can run its handler.
pub fn emit_menu<R: tauri::Runtime>(app: &AppHandle<R>, id: &str) {
    use tauri::Emitter;
    let _ = app.emit(&format!("menu://{id}"), ());
}
