export type Locale = "en" | "zh-Hant";

const STORAGE_KEY = "yuta-prompt-locale";

export function detectLocale(): Locale {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith("zh")) return "zh-Hant";
  return "en";
}

export function getStoredLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh-Hant") return saved;
  } catch {
    /* ignore */
  }
  return detectLocale();
}

export function persistLocale(locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

const dictionaries = {
  en: {
    appName: "Yuta Prompt",
    folders: "Folders",
    prompts: "Prompts",
    editor: "Editor",
    newFolder: "New folder",
    newPrompt: "New prompt",
    emptyFolders: "No folders yet",
    emptyPrompts: "No prompts in this folder",
    emptyFavorites: "No favorites yet",
    emptyEditor: "Select a prompt to edit",
    folderNamePlaceholder: "Folder name",
    addFolder: "Add",
    cancel: "Cancel",
    save: "Save",
    rename: "Rename",
    delete: "Delete",
    move: "Move",
    deleteFolderConfirm: "Delete this folder?",
    folderExists: "A folder with this name already exists here",
    folderNameRequired: "Folder name cannot be empty",
    moveFolderTo: "Move folder to",
    rootLevel: "(root)",
    deletePromptConfirm: "Delete this prompt?",
    untitledPrompt: "Untitled prompt",
    titlePlaceholder: "Title",
    notesLabel: "Notes",
    savePrompt: "Save",
    duplicate: "Duplicate",
    promptSaved: "Saved",
    unsavedChanges: "Unsaved changes",
    unsavedTitle: "Unsaved changes",
    unsavedMessage: "This prompt has unsaved changes. Save before leaving?",
    saveAndLeave: "Save & leave",
    discardAndLeave: "Discard",
    unsavedOnClose: "You have unsaved changes. Close anyway?",
    closeNow: "Close anyway",
    trash: "Trash",
    emptyTrash: "Trash is empty",
    restore: "Restore",
    purge: "Delete permanently",
    purgeFolderConfirm: "Permanently delete this folder and everything in it?",
    purgePromptConfirm: "Permanently delete this prompt?",
    folderItems: "folder",
    promptItems: "prompt",
    searchPlaceholder: "Search prompts...",
    noResults: "No results",
    searchHint: "Search title, body, notes, or folder path",
    copyPrompt: "Copy",
    copied: "Copied",
    fillVariables: "Fill variables",
    fillVarHint: "Fill the values below, then copy.",
    copyFilled: "Copy filled",
    copyOriginal: "Copy original",
    favoritesOnly: "Favorites only",
    unfavorite: "Remove from favorites",
    favorite: "Add to favorites",
    language: "Language",
    langEn: "English",
    langZhHant: "繁體中文",
    errFolderNameEmpty: "Folder name cannot be empty",
    errFolderExists: "A folder with this name already exists here",
    errSelfMove: "Cannot move a folder into itself",
    errCycleMove: "Cannot move a folder into one of its own descendants",
    errFolderNotFound: "Folder not found",
    errPromptNotFound: "Prompt not found",
    conflictTitle: "Save conflict",
    conflictMessage:
      "This prompt was changed elsewhere since you opened it. Overwrite or reload?",
    reloadPrompt: "Reload",
    overwrite: "Overwrite",
    dropToRoot: "Drop to move to root",
    copyFailed: "Copy failed",
    saveFailed: "Save failed",
    scratchpad: "Scratchpad",
    scratchpadPlaceholder: "Temporary text lives here (auto-saved locally)...",
    export: "Export",
    import: "Import",
    exportJson: "Export JSON",
    exportMarkdown: "Export Markdown",
    importJson: "Import JSON",
    importDone: "Imported",
    importConfirm: "Import will merge matching folders/prompts. Continue?",
    importFailed: "Import failed",
    exported: "Exported",
    fmtHeading: "Heading",
    fmtBold: "Bold",
    fmtItalic: "Italic",
    fmtBlockquote: "Blockquote",
    fmtListUl: "Unordered list",
    fmtListOl: "Ordered list",
    fmtCode: "Code",
    fmtCodeblock: "Code block",
    fmtHr: "Horizontal rule",
    fmtLink: "Link",
    fmtTable: "Table",
    fmtClear: "Clear format",
  },
  "zh-Hant": {
    appName: "Yuta Prompt",
    folders: "資料夾",
    prompts: "提示詞",
    editor: "編輯器",
    newFolder: "新增資料夾",
    newPrompt: "新增提示詞",
    emptyFolders: "尚無資料夾",
    emptyPrompts: "此資料夾中沒有提示詞",
    emptyFavorites: "尚無最愛提示詞",
    emptyEditor: "選取一個提示詞進行編輯",
    folderNamePlaceholder: "資料夾名稱",
    addFolder: "新增",
    cancel: "取消",
    save: "儲存",
    rename: "重新命名",
    delete: "刪除",
    move: "移動",
    deleteFolderConfirm: "確定刪除此資料夾？",
    folderExists: "此位置已有相同名稱的資料夾",
    folderNameRequired: "資料夾名稱不能為空",
    moveFolderTo: "將資料夾移至",
    rootLevel: "（根目錄）",
    deletePromptConfirm: "確定刪除此提示詞？",
    untitledPrompt: "未命名提示詞",
    titlePlaceholder: "標題",
    notesLabel: "備註",
    savePrompt: "儲存",
    duplicate: "複製",
    promptSaved: "已儲存",
    unsavedChanges: "有未儲存的變更",
    unsavedTitle: "有未儲存的變更",
    unsavedMessage: "此提示詞有未儲存的變更。離開前要儲存嗎？",
    saveAndLeave: "儲存並離開",
    discardAndLeave: "捨棄變更",
    unsavedOnClose: "您有未儲存的變更。仍要關閉嗎？",
    closeNow: "仍要關閉",
    trash: "垃圾桶",
    emptyTrash: "垃圾桶是空的",
    restore: "還原",
    purge: "永久刪除",
    purgeFolderConfirm: "確定永久刪除此資料夾及其中的所有內容？",
    purgePromptConfirm: "確定永久刪除此提示詞？",
    folderItems: "資料夾",
    promptItems: "提示詞",
    searchPlaceholder: "搜尋提示詞...",
    noResults: "沒有結果",
    searchHint: "搜尋標題、內容、備註或資料夾路徑",
    copyPrompt: "複製",
    copied: "已複製",
    fillVariables: "填入變數",
    fillVarHint: "填入以下值，然後複製。",
    copyFilled: "複製填入結果",
    copyOriginal: "複製原文",
    favoritesOnly: "僅顯示最愛",
    unfavorite: "取消最愛",
    favorite: "加入最愛",
    language: "語言",
    langEn: "English",
    langZhHant: "繁體中文",
    errFolderNameEmpty: "資料夾名稱不能為空",
    errFolderExists: "此位置已有相同名稱的資料夾",
    errSelfMove: "無法將資料夾移入自身",
    errCycleMove: "無法將資料夾移入其子資料夾中",
    errFolderNotFound: "找不到資料夾",
    errPromptNotFound: "找不到提示詞",
    conflictTitle: "儲存衝突",
    conflictMessage: "此提示詞在您開啟後已被其他地方修改。要覆寫或重新載入？",
    reloadPrompt: "重新載入",
    overwrite: "覆寫",
    dropToRoot: "放開以移至根目錄",
    copyFailed: "複製失敗",
    saveFailed: "儲存失敗",
    scratchpad: "草稿",
    scratchpadPlaceholder: "暫時的文字放在這裡（自動儲存在本機）...",
    export: "匯出",
    import: "匯入",
    exportJson: "匯出 JSON",
    exportMarkdown: "匯出 Markdown",
    importJson: "匯入 JSON",
    importDone: "已匯入",
    importConfirm: "匯入會合併同名的資料夾與提示詞。要繼續嗎？",
    importFailed: "匯入失敗",
    exported: "已匯出",
    fmtHeading: "標題",
    fmtBold: "粗體",
    fmtItalic: "斜體",
    fmtBlockquote: "引用",
    fmtListUl: "項目符號清單",
    fmtListOl: "編號清單",
    fmtCode: "程式碼",
    fmtCodeblock: "程式碼區塊",
    fmtHr: "水平線",
    fmtLink: "連結",
    fmtTable: "表格",
    fmtClear: "清除格式",
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

let currentLocale: Locale = "en";

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(locale: Locale) {
  currentLocale = locale;
  persistLocale(locale);
}

export function t(key: keyof Dictionary): string {
  return dictionaries[currentLocale][key];
}

/** Map a Rust-side error message to the localized equivalent; pass through if unknown. */
export function translateError(msg: string): string {
  const map: Record<string, keyof Dictionary> = {
    "folder name cannot be empty": "errFolderNameEmpty",
    "a folder with this name already exists here": "errFolderExists",
    "cannot move a folder into itself": "errSelfMove",
    "cannot move a folder into one of its own descendants": "errCycleMove",
    "folder not found": "errFolderNotFound",
    "prompt not found": "errPromptNotFound",
  };
  const key = map[msg];
  return key ? dictionaries[currentLocale][key] : msg;
}
