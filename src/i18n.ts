export type Locale = "en" | "zh-Hant";

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
  },
} as const;

export type Dictionary = (typeof dictionaries)[Locale];

let currentLocale: Locale = "en";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function t(key: keyof Dictionary): string {
  return dictionaries[currentLocale][key];
}
