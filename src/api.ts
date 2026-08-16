import { invoke } from "@tauri-apps/api/core";
import type { Folder } from "./types";

export function listFolders(): Promise<Folder[]> {
  return invoke<Folder[]>("list_folders");
}

export function createFolder(
  parentId: number | null,
  name: string,
): Promise<Folder> {
  return invoke<Folder>("create_folder", { parentId, name });
}

export function renameFolder(id: number, name: string): Promise<Folder> {
  return invoke<Folder>("rename_folder", { id, name });
}

export function moveFolder(
  id: number,
  newParentId: number | null,
): Promise<Folder> {
  return invoke<Folder>("move_folder", { id, newParentId });
}

export function deleteFolder(id: number): Promise<void> {
  return invoke<void>("delete_folder", { id });
}
