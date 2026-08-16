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
