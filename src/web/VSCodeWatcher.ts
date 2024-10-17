import * as vscode from "vscode";
import { ObsiFilesTracker } from "./ObsiFilesTracker";
export type ObsiEvents = {};

export function setWatcher(workspace: ObsiFilesTracker) {
  const watcher = vscode.workspace.createFileSystemWatcher("**/*");

  // TODO: add a matcher based on user configs (includes excludes folders to watch)

  watcher?.onDidChange(async (uri) => {
    await workspace.set(uri);
  });
  watcher?.onDidCreate(async (uri) => {
    await workspace.set(uri);
  });
  watcher?.onDidDelete((uri) => {
    workspace.delete(uri);
  });
  return watcher;
}
