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

  constructor(uriHandler = new URIHandler()) {
    super(() => {});
    this.uriHandler = uriHandler;

    // setup watcher
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
      printMap(this.fileNameFullPathMap)
    );
  }
  async resolveFile(filename: string): Promise<string | undefined> {
    // /filename (absolute path)
    if (filename.startsWith("/")) return filename;

    // filename
    // 1. get from cached
    // default as first one because that's how resolve work if you don't specify;
    let filePaths = this.fileNameFullPathMap.get(filename);
    if (filePaths && filePaths.size > 0) return filePaths.values().next().value;

    // // 2. TODO: regex from workspaces
    // const pattern = `(\\b${filename}\\b)`;
    // const files = await vscode.workspace.findFiles(pattern);

    return undefined;
  }

  async extractForwardLinks(content: string) {
    const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;
    let forwardLinks = await Promise.all(
      [...content.matchAll(linkRegex)].map(async (forwardLink) => {
        // attempt to resolve file
        const fullPath = await this.resolveFile(forwardLink[1]);
        let uri: vscode.Uri | undefined;

        const path = fullPath || forwardLink[1]; // if fullpath unresolveable, use grepped text

        // if grepped text not start with /, it's not a path => no uri
        uri = path.startsWith("/")
          ? this.uriHandler.getFullURI(path)
          : undefined;
        return {
          path: fullPath || forwardLink[1],
          fullURI: uri,
          notExist: fullPath === undefined,
        };
      })
    );

    return forwardLinks;
  }

  async readFile(uri: vscode.Uri) {
    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      return doc.getText();
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
    // let files: [] = [];

    if (!vscode.workspace.workspaceFolders)
      throw new Error("No workspace found ");

    // gather uris
    let uris: vscode.Uri[] = [];
    for (const folder of vscode.workspace.workspaceFolders) {
      const folderUri = this.uriHandler.getFullURI(folder.uri.path);

      console.log("Folder's Uri: ", folder.uri.path);
      console.log("Folder's Uri after transform: ", folderUri);

      const pattern = new vscode.RelativePattern(folderUri, "**/*.md");

      // const excludePattern = new vscode.RelativePattern(
      //   "",
      //   "**/node_modules/**"
      // );

      // todo: remove node_modules, after VSCode fix this issue
      const currUris = await vscode.workspace.findFiles(pattern);

      uris.push(...currUris);
    }
    console.log("URIS found readALlWorkspaceFiles: ", uris);

    // first row track files only
    for (let uri of uris) {
      if (uri.path.split(".").pop() !== "md") continue;
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
      // check markdown
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
          this.backLinks.set(
            file,
            fwLinks.filter((fw) => fw.path !== path)
          );
        else this.backLinks.delete(file);
      }
    }
  }

  async set(uri: vscode.Uri, fireEvents = true) {
    const content = await this.readFile(uri);
    if (content === null) return;

    // reset link states of this file first
    this.resetStateOfFile(uri.path);

    // parse forward links
    const forwardLinks = await this.extractForwardLinks(content);

    // save to data structure
    const path = uri.path;
    this.forwardLinks.set(
      uri.path,
      forwardLinks.map((f) => ({ path: f.path, fullURI: f.fullURI }))
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
        backLinks ? [...backLinks, file] : [file]
      );

      // if (!this.files.has(targetFile.path)) {
      //   this.files.set(targetFile.path, targetFile);
      // }
    }

    // fire events
    if (fireEvents) {
      this.onDidUpdateEmitter.fire(uri);
      this.onDidAddEmitter.fire(uri);
    }
  }

  async delete(uri: vscode.Uri) {
    let isFdDel = this.forwardLinks.delete(uri.path);
    let isBwDel = this.backLinks.delete(uri.path);
    let isCacheDel = this.fileNameFullPathMap.delete(
      this.extractFileName(uri.path)
    );

    // delete event
    (isFdDel || isBwDel || isCacheDel) && this.onDidDeleteEmitter.fire(uri);
  }

  dispose() {
    this.onDidAddEmitter.dispose();
    this.onDidDeleteEmitter.dispose();
    this.onDidUpdateEmitter.dispose();
  }
}
