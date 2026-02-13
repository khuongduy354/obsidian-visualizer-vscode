import { URIHandler } from "./URIHandler";
import * as vscode from "vscode";

export type ObsiFile = {
  // relative path to root workspace
  path: string;

  // full path that is accessible by vscode
  fullURI?: vscode.Uri;
};

export class ObsiFilesTracker extends vscode.Disposable {
  forwardLinks = new Map<string, Array<ObsiFile>>(); //fap -> ObsiFile[]

  // may contain links to non-exist files
  backLinks = new Map<string, Array<ObsiFile>>(); //fap -> ObsiFile[]

  //events
  onDidAddEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidDeleteEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidUpdateEmitter = new vscode.EventEmitter<vscode.Uri>();

  // filename to files with full path
  // use for resolving files quickly
  fileNameFullPathMap = new Map<string, Set<string>>();
  uriHandler: URIHandler;

  private configListener: vscode.Disposable;

  constructor(uriHandler = new URIHandler()) {
    super(() => {});
    this.uriHandler = uriHandler;

    // Listener for config changes (store disposable for cleanup)
    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (
        e.affectsConfiguration("obsidianVisualizer.include") ||
        e.affectsConfiguration("obsidianVisualizer.exclude")
      ) {
        this.readAllWorkspaceFiles();
      }
    });
  }

  isIncluded(doc: vscode.TextDocument): boolean {
    const config = vscode.workspace.getConfiguration("obsidianVisualizer");
    const include = config.get<string[]>("include") || [];
    const exclude = config.get<string[]>("exclude") || [
      "**/node_modules/**",
      "**/.*/**",
    ];

    // Check exclude first (precedence)
    if (exclude.length > 0) {
      const excludePattern =
        exclude.length > 1 ? `{${exclude.join(",")}}` : exclude[0];
      const score = vscode.languages.match({ pattern: excludePattern }, doc);
      if (score > 0) return false;
    }

    // Check include
    if (include.length > 0) {
      const includePattern =
        include.length > 1 ? `{${include.join(",")}}` : include[0];
      const score = vscode.languages.match({ pattern: includePattern }, doc);
      if (score === 0) return false;
    }

    return true;
  }

  displayWorkspace() {
    const printMap = (map: Map<string, any>) => {
      let str = "";
      for (let [key, value] of map) {
        str += key + " -> " + value + "\n";
      }
      return str;
    };
    console.log("Forward Links: ", printMap(this.forwardLinks));
    console.log("Back Links: ", printMap(this.backLinks));
    console.log(
      "File Name Full Path Map: ",
      printMap(this.fileNameFullPathMap),
    );
  }
  async resolveFile(filename: string): Promise<string | undefined> {
    // /filename (absolute path)
    if (filename.startsWith("/")) return filename;

    // filename
    // 1. get from cached
    // default as first one because that's how resolve work if you don't specify;
    let filePaths =
      this.fileNameFullPathMap.get(filename) ||
      this.fileNameFullPathMap.get(filename + ".md");
    if (filePaths && filePaths.size > 0) return filePaths.values().next().value;

    // // 2. TODO: regex from workspaces
    // const pattern = `(\\b${filename}\\b)`;
    // const files = await vscode.workspace.findFiles(pattern);

    return undefined;
  }

  async extractForwardLinks(content: string) {
    const config = vscode.workspace.getConfiguration("obsidianVisualizer");
    const linkPattern = config.get<string>("linkPattern") || "obsidian";

    const links: {
      path: string;
      fullURI: vscode.Uri | undefined;
      notExist: boolean;
    }[] = [];

    const obsRegex = /(?<!\!)\[\[(.*?)\]\]/g;
    const mdRegex = /(?<!\!)\[.*?\]\((.*?)\)/g;

    const regexes = [];
    if (linkPattern === "obsidian" || linkPattern === "both")
      regexes.push(obsRegex);
    if (linkPattern === "markdown" || linkPattern === "both")
      regexes.push(mdRegex);

    for (const regex of regexes) {
      const matches = [...content.matchAll(regex)];
      const currentLinks = await Promise.all(
        matches.map(async (match) => {
          let linkTarget = match[1];
          // For markdown links, handle anchors or queries if present?
          // Usually standard md link is [text](path).
          // Match[1] captures the path.

          // attempt to resolve file
          const fullPath = await this.resolveFile(linkTarget);
          let uri: vscode.Uri | undefined;

          const path = fullPath || linkTarget; // if fullpath unresolveable, use grepped text

          // if grepped text not start with /, it's not a path => no uri
          uri = path.startsWith("/")
            ? this.uriHandler.getFullURI(path)
            : undefined;
          return {
            path: fullPath || linkTarget,
            fullURI: uri,
            notExist: fullPath === undefined,
          };
        }),
      );
      links.push(...currentLinks);
    }

    return links;
  }

  async readFile(uri: vscode.Uri) {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      return doc;
    } catch (err) {
      console.log("Error reading file: ", err);
      return null;
    }
  }
  extractFileName(path: string) {
    if (!path.startsWith("/")) return path;
    if (!path.includes("/")) return path;

    let parts = path.split("/");
    return parts[parts.length - 1];
  }

  async readAllWorkspaceFiles() {
    this.forwardLinks.clear();
    this.backLinks.clear();
    this.fileNameFullPathMap.clear();

    if (!vscode.workspace.workspaceFolders)
      throw new Error("No workspace found");

    // Get configuration
    const config = vscode.workspace.getConfiguration("obsidianVisualizer");
    const include = config.get<string[]>("include") || [];
    const exclude = config.get<string[]>("exclude") || [
      "**/node_modules/**",
      "**/.*/**",
    ];

    // Construct glob patterns
    const includePattern =
      include.length > 0 ? `{${include.join(",")}}` : "**/*.md";
    const excludePattern =
      exclude.length > 0 ? `{${exclude.join(",")}}` : undefined;

    console.log("Include Pattern:", includePattern);
    console.log("Exclude Pattern:", excludePattern);

    // active workspace folders
    let uris: vscode.Uri[] = [];

    // findFiles works globally across all workspace folders if we don't pass a RelativePattern (base)
    // But verify if we want to restrict to specific folders or just all.
    // The original code iterated folders. findFiles can do it all at once if we pass string pattern.
    // However, if we want to respect the "folderUri" logic from before (which seemed to try to allow multi-root?)
    // findFiles with string pattern works for multi-root.

    // If includePattern is set by user, we use it. If not, we might want to default to **/*.md
    // Note: User's include might not have .md extension, so we should probably ensure we are looking for markdown.
    // But if user explicitly says "include docs/*", maybe they have .txt files?
    // The extension is for obsidian which implies MD.
    // Let's stick to what the user defined in include, or **/*.md if empty.
    // And checking extension later? Original code checked .md extension manually in loop.

    const currUris = await vscode.workspace.findFiles(
      includePattern,
      excludePattern,
    );
    uris.push(...currUris);

    console.log("URIS found readALlWorkspaceFiles: ", uris);

    // first row track files only
    for (let uri of uris) {
      if (uri.path.split(".").pop() !== "md") continue; // Enforce MD for now context
      const filename = this.extractFileName(uri.path);
      let existPaths = this.fileNameFullPathMap.get(filename);
      if (existPaths) {
        existPaths.add(uri.path);
      } else {
        this.fileNameFullPathMap.set(filename, new Set([uri.path]));
      }
    }

    // second row: scan and parse in to graphs
    for (let uri of uris) {
      if (uri.path.split(".").pop() !== "md") continue;

      uri = this.uriHandler.getFullURI(uri.path);
      await this.set(uri, false);
    }
  }

  resetStateOfFile(path: string) {
    this.forwardLinks.delete(path);
    for (let [file, fwLinks] of this.backLinks) {
      if (fwLinks.some((fw) => fw.path === path)) {
        if (fwLinks.length === 1)
          this.backLinks.delete(file); // only entry was this path, remove key entirely
        else
          this.backLinks.set(
            file,
            fwLinks.filter((fw) => fw.path !== path),
          ); // keep the rest
      }
    }
  }

  async set(uri: vscode.Uri, fireEvents = true) {
    const doc = await this.readFile(uri);
    if (doc === null) return;

    // Check if included
    if (!this.isIncluded(doc)) {
      // if it was tracked, delete it
      if (this.forwardLinks.has(uri.path)) {
        this.delete(uri);
      }
      return;
    }

    const content = doc.getText();

    // track whether this is a new file or an update
    const isNew = !this.forwardLinks.has(uri.path);

    // reset link states of this file first
    this.resetStateOfFile(uri.path);

    // parse forward links
    const forwardLinks = await this.extractForwardLinks(content);

    // save to data structure
    const path = uri.path;
    this.forwardLinks.set(
      uri.path,
      forwardLinks.map((f) => ({ path: f.path, fullURI: f.fullURI })),
    );
    // this.files.set(path, file);

    for (let _targetFile of forwardLinks) {
      if (!_targetFile.path.startsWith("/") || _targetFile.notExist) {
        // resolveable path must start with /
        continue;
      }

      let fullURI = this.uriHandler.getFullURI(_targetFile.path);
      const targetFile = {
        path: _targetFile.path,
        fullURI,
      } as ObsiFile;

      // for every file with this uri (x)  point to file (y)
      // append x as y's backlink
      let backLinks = this.backLinks.get(targetFile.path);
      const file: ObsiFile = { path, fullURI: uri };
      this.backLinks.set(
        targetFile.path,
        backLinks ? [...backLinks, file] : [file],
      );

      // if (!this.files.has(targetFile.path)) {
      //   this.files.set(targetFile.path, targetFile);
      // }
    }

    // fire events: only one per operation
    if (fireEvents) {
      if (isNew) {
        this.onDidAddEmitter.fire(uri);
      } else {
        this.onDidUpdateEmitter.fire(uri);
      }
    }
  }

  async delete(uri: vscode.Uri) {
    let isFdDel = this.forwardLinks.delete(uri.path);
    let isBwDel = this.backLinks.delete(uri.path);
    let isCacheDel = this.fileNameFullPathMap.delete(
      this.extractFileName(uri.path),
    );

    // delete event
    (isFdDel || isBwDel || isCacheDel) && this.onDidDeleteEmitter.fire(uri);
  }

  dispose() {
    this.configListener.dispose();
    this.onDidAddEmitter.dispose();
    this.onDidDeleteEmitter.dispose();
    this.onDidUpdateEmitter.dispose();
  }
}
