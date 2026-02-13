import * as vscode from "vscode";
import { ObsiFilesTracker } from "./ObsiFilesTracker";
import { GraphCreator } from "./GraphCreator";
import { AppContext } from "./AppContext";

const DEBOUNCE_MS = 300;

/**
 * Centralized file watcher using VS Code workspace events:
 * - Uses vscode.workspace.onDid*Files for create/delete/rename
 * - Filters to .md files only
 * - Debounces rapid changes
 */
export class WatcherService extends vscode.Disposable {
  private disposables: vscode.Disposable[] = [];

  // Debounce timers keyed by file path
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private obsiFilesTracker: ObsiFilesTracker,
    private graphCreator: GraphCreator,
    private appContext: AppContext,
  ) {
    super(() => this.disposeAll());

    this.disposables.push(
      // File change watcher (still need FileSystemWatcher for content changes)
      vscode.workspace
        .createFileSystemWatcher("**/*.md")
        .onDidChange((uri) => this.onFileChanged(uri)),

      // VS Code workspace events (cleaner, have dedicated rename)
      vscode.workspace.onDidCreateFiles((e) => {
        for (const uri of e.files) {
          if (this.isMd(uri)) this.onFileCreated(uri);
        }
      }),

      vscode.workspace.onDidDeleteFiles((e) => {
        for (const uri of e.files) {
          if (this.isMd(uri)) this.onFileDeleted(uri);
        }
      }),

      vscode.workspace.onDidRenameFiles((e) => {
        for (const { oldUri, newUri } of e.files) {
          if (this.isMd(oldUri)) this.onFileRenamed(oldUri, newUri);
        }
      }),

      // Listen to tracker events to rebuild graph from updated tracker state
      this.obsiFilesTracker.onDidUpdateEmitter.event(() => {
        this.appContext.globalGraph = this.graphCreator.parseNeoGlobal(
          this.appContext.graphOption,
        );
      }),
      this.obsiFilesTracker.onDidAddEmitter.event(() => {
        this.appContext.globalGraph = this.graphCreator.parseNeoGlobal(
          this.appContext.graphOption,
        );
      }),
      this.obsiFilesTracker.onDidDeleteEmitter.event(() => {
        this.appContext.globalGraph = this.graphCreator.parseNeoGlobal(
          this.appContext.graphOption,
        );
      }),
    );
  }

  private isMd(uri: vscode.Uri): boolean {
    return uri.path.endsWith(".md");
  }

  private onFileChanged(uri: vscode.Uri) {
    this.debounce(uri.path, () => {
      this.obsiFilesTracker.set(uri);
    });
  }

  private onFileCreated(uri: vscode.Uri) {
    this.debounce(uri.path, () => {
      this.obsiFilesTracker.set(uri);
    });
  }

  private onFileDeleted(uri: vscode.Uri) {
    this.obsiFilesTracker.delete(uri);
  }

  private onFileRenamed(oldUri: vscode.Uri, newUri: vscode.Uri) {
    // Rename = delete old + add new
    this.obsiFilesTracker.delete(oldUri);
    this.debounce(newUri.path, () => {
      this.obsiFilesTracker.set(newUri);
    });
  }

  private debounce(key: string, fn: () => void) {
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key);
      fn();
    }, DEBOUNCE_MS);

    this.debounceTimers.set(key, timer);
  }

  private disposeAll() {
    // clear debounce timers
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    this.debounceTimers.clear();

    // dispose all event subscriptions
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }
}
