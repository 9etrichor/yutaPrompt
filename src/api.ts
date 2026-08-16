import { invoke } from "@tauri-apps/api/core";
import type { Folder, Prompt, SearchResult, TrashListing } from "./types";

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

export function listPrompts(folderId: number | null): Promise<Prompt[]> {
  return invoke<Prompt[]>("list_prompts", { folderId });
}

export function createPrompt(
  folderId: number | null,
  title: string,
  body: string,
  notes: string,
): Promise<Prompt> {
  return invoke<Prompt>("create_prompt", { folderId, title, body, notes });
}

export function updatePrompt(
  id: number,
  title: string,
  body: string,
  notes: string,
): Promise<Prompt> {
  return invoke<Prompt>("update_prompt", { id, title, body, notes });
}

export function duplicatePrompt(id: number): Promise<Prompt> {
  return invoke<Prompt>("duplicate_prompt", { id });
}

export function deletePrompt(id: number): Promise<void> {
  return invoke<void>("delete_prompt", { id });
}

export function listTrash(): Promise<TrashListing> {
  return invoke<TrashListing>("list_trash");
}

export function restoreFolder(id: number): Promise<void> {
  return invoke<void>("restore_folder", { id });
}

export function restorePrompt(id: number): Promise<void> {
  return invoke<void>("restore_prompt", { id });
}

export function purgeFolder(id: number): Promise<void> {
  return invoke<void>("purge_folder", { id });
}

export function purgePrompt(id: number): Promise<void> {
  return invoke<void>("purge_prompt", { id });
}

export function searchPrompts(query: string): Promise<SearchResult[]> {
  return invoke<SearchResult[]>("search_prompts", { query });
}

export function exportJson(path: string): Promise<void> {
  return invoke<void>("export_to_json", { path });
}

export function exportMarkdown(path: string): Promise<void> {
  return invoke<void>("export_to_markdown", { path });
}

export function importJson(path: string): Promise<[number, number]> {
  return invoke<[number, number]>("import_from_json", { path });
}

export function recordUse(id: number): Promise<void> {
  return invoke<void>("record_prompt_use", { id });
}

export function toggleFavorite(id: number): Promise<boolean> {
  return invoke<boolean>("toggle_prompt_favorite", { id });
}

export function substituteVariables(
  text: string,
  values: Record<string, string>,
): Promise<string> {
  return invoke<string>("substitute_variables", { text, values });
}
