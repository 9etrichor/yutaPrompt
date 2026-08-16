export interface Folder {
  id: number;
  parent_id: number | null;
  name: string;
  sort_order: number;
}
