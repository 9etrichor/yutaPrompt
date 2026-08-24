export interface Folder {
  id: number;
  parent_id: number | null;
  name: string;
  sort_order: number;
}

export interface Prompt {
  id: number;
  folder_id: number | null;
  title: string;
  body: string;
  notes: string;
  favorite: boolean;
  use_count: number;
  updated_at: string | null;
}

export interface TrashFolder {
  id: number;
  parent_id: number | null;
  name: string;
}

export interface TrashPrompt {
  id: number;
  folder_id: number | null;
  title: string;
}

export interface TrashListing {
  folders: TrashFolder[];
  prompts: TrashPrompt[];
}

export interface SearchResult {
  prompt: Prompt;
  path: string;
}
