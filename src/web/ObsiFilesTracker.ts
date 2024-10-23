import { URIHandler } from "./URIHandler";
import * as vscode from "vscode";

export type ObsiFile = {
  // relative path to root workspace
  path: string;

  // full path that is accessible by vscode
  fullURI: vscode.Uri;
};

export class ObsiFilesTracker extends vscode.Disposable {
  forwardLinks = new Map<string, Array<ObsiFile>>();

  // may contain links to non-exist files
  backLinks = new Map<string, Array<ObsiFile>>();

  //events
  onDidAddEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidDeleteEmitter = new vscode.EventEmitter<vscode.Uri>();
  onDidUpdateEmitter = new vscode.EventEmitter<vscode.Uri>();

  // filename to files with full path
  fileNameFullPathMap = new Map<string, Set<string>>();
  uriHandler: URIHandler;

  constructor(uriHandler = new URIHandler()) {
    super(() => {});
    this.uriHandler = uriHandler;

    // setup watcher
  }
  async resolveFile(filename: string): Promise<string> {
    // /filename (absolute path)
    if (filename.startsWith("/")) return filename;

    // filename
    // 1. get from cached
    // default as first one because that's how resolve work if you don't specify;
    let filePaths = this.fileNameFullPathMap.get(filename);
    console.log("Resolving: ", filename, filePaths);
    if (filePaths && filePaths.size > 0) return filePaths.values().next().value;

    // // 2. TODO: regex from workspaces
    // const pattern = `(\\b${filename}\\b)`;
    // const files = await vscode.workspace.findFiles(pattern);

    return "";
  }

  async extractForwardLinks(content: string) {
    // TODO: ignore ![[...]]

    const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;
    let forwardLinks = await Promise.all(
      [...content.matchAll(linkRegex)].map(async (forwardLink) => {
        const fullPath = await this.resolveFile(forwardLink[1]);
        let uri: vscode.Uri | undefined;

        uri = this.uriHandler.getFullURI(fullPath);

        return {
          path: fullPath,
          fullURI: uri,
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

    let parts = path.split("/");
    return parts[parts.length - 1];
  }

  async readAllWorkspaceFiles() {
    this.forwardLinks.clear();
    this.backLinks.clear();
    // let files: [] = [];

    if (!vscode.workspace.workspaceFolders)
      throw new Error("No workspace found ");

    // gather uris
    let uris: vscode.Uri[] = [];
    for (const folder of vscode.workspace.workspaceFolders) {
      const folderUri = this.uriHandler.getFullURI(folder.uri.path);
      const pattern = new vscode.RelativePattern(folderUri, "**/*.md");

      // const excludePattern = new vscode.RelativePattern(
      //   "",
      //   "**/node_modules/**"
      // );

      // todo: remove node_modules, after VSCode fix this issue
      const currUris = await vscode.workspace.findFiles(pattern);

      uris.push(...currUris);
    }

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
      console.log("adding file: ", filename, ",paths: ", [
        ...(this.fileNameFullPathMap.get(filename) as Set<string>),
      ]);
    }

    // second row: scan and parse in to graphs
    for (let uri of uris) {
      // check markdown
      if (uri.path.split(".").pop() !== "md") continue;

      uri = this.uriHandler.getFullURI(uri.path);
      await this.set(uri);
    }
  }

  async set(uri: vscode.Uri) {
    // check if uri tracked
    // let old = null;
    // if (this.files.has(uri.path)) {
    //   old = this.files.get(uri.path);
    // }

    const content = await this.readFile(uri);
    if (!content) return;

    // parse forward links
    const forwardLinks = await this.extractForwardLinks(content);

    // save to data structure
    const path = uri.path;
    this.forwardLinks.set(uri.path, forwardLinks);
    // this.files.set(path, file);

    // TODO: backlinks
    for (let targetFile of forwardLinks) {
      if (!targetFile.path.startsWith("/")) {
        // TODO: resolve file name or relative path here;
        continue;
      }
      let fullURI = this.uriHandler.getFullURI(targetFile.path);
      targetFile = {
        path: targetFile.path,
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
    this.onDidUpdateEmitter.fire(uri);
    this.onDidAddEmitter.fire(uri);
  }

  async delete(uri: vscode.Uri) {
    // delete from forward links and backlinks and files
    // const file = this.files.get(path);

    let isFdDel = this.forwardLinks.delete(uri.path);
    let isBwDel = this.backLinks.delete(uri.path);
    // this.files.delete(path);
    // deleted = true;

    // delete event
    (isFdDel || isBwDel) && this.onDidDeleteEmitter.fire(uri);
  }

  dispose() {
    this.onDidAddEmitter.dispose();
    this.onDidDeleteEmitter.dispose();
    this.onDidUpdateEmitter.dispose();
  }
}
