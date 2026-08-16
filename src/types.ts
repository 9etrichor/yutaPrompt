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
}
