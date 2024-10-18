import { URIHandler } from "./URIHandler";
import * as vscode from "vscode";

export type ObsiFile = {
  // relative path to root workspace
  path: string;

  // full path that is accessible by vscode
  fullURI?: vscode.Uri;
};

// type Link = {
//   from: File;
//   to: File;
// };

export class ObsiFilesTracker {
  files = new Map<string, ObsiFile>(); // exist files only, map path to file

  // may contain links to non-exist files
  forwardLinks = new Map<ObsiFile, Array<ObsiFile>>();
  backLinks = new Map<string, Array<ObsiFile>>();

  //events
  onDidAddEmitter = new vscode.EventEmitter<ObsiFile>();
  onDidDeleteEmitter = new vscode.EventEmitter<ObsiFile>();
  onDidUpdateEmitter = new vscode.EventEmitter<ObsiFile>();

  extractForwardLinks(content: string): Array<ObsiFile> {
    // TODO: ignore ![[...]]

    const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;
    let forwardLinks = [...content.matchAll(linkRegex)].map((forwardLink) => {
      const fullPath = this.getFullPath(forwardLink[1]);
      let uri: vscode.Uri | undefined;

      if (fullPath === "") uri = undefined;
      else uri = this.uriHandler.getFullURI(fullPath);

      return {
        path: forwardLink[1],
        fullURI: uri,
      };
    });

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

  async readAllWorkspaceFiles() {
    this.forwardLinks.clear();
    this.backLinks.clear();
    // let files: [] = [];

    if (!vscode.workspace.workspaceFolders)
      throw new Error("No workspace found ");

    for (const folder of vscode.workspace.workspaceFolders) {
      const folderUri = this.uriHandler.getFullURI(folder.uri.path);
      const pattern = new vscode.RelativePattern(folderUri, "**/*.md");
      // const excludePattern = new vscode.RelativePattern(
      //   "",
      //   "**/node_modules/**"
      // );

      // todo: remove node_modules, after VSCode fix this issue
      const uris = await vscode.workspace.findFiles(pattern);

      for (let uri of uris) {
        // check markdown
        if (uri.path.split(".").pop() !== "md") continue;

        uri = this.uriHandler.getFullURI(uri.path);
        await this.set(uri);
        // const content = await this.readFile(uri);
        // if (!content) continue;

        // const forwardLinks = this.extractForwardLinks(content);

        // // save to data structure
        // const path = uri.path;
        // const file = { path, fullURI: uri };
        // console.log("Tracking: ", path);
        // this.forwardLinks.set(file, forwardLinks);
        // this.files.set(path, file);
      }
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
    const forwardLinks = this.extractForwardLinks(content);

    // save to data structure
    const path = uri.path;
    const file: ObsiFile = { path, fullURI: uri };
    console.log("Tracking: ", path);
    this.forwardLinks.set(file, forwardLinks);
    this.files.set(path, file);

    // TODO: backlinks
    for (let targetFile of forwardLinks) {
      if (!targetFile.path.startsWith("/")) {
        // TODO: resolve file name or relative path here;
        continue;
      }
      let fullURI = this.uriHandler.getFullURI(targetFile.path);
      targetFile = {
        path: targetFile.path,
        uri: fullURI,
      } as ObsiFile;

      // for every file with this uri (x)  point to file (y)
      // append x as y's backlink
      let backLinks = this.backLinks.get(targetFile.path);
      this.backLinks.set(
        targetFile.path,
        backLinks ? [...backLinks, file] : [file]
      );

      if (!this.files.has(targetFile.path)) {
        this.files.set(targetFile.path, targetFile);
      }
    }

    // fire events
    this.onDidUpdateEmitter.fire(uri);
    this.onDidAddEmitter.fire(uri);
  }

  async delete(uri: vscode.Uri) {
    const path = uri.path;

    // delete from forward links and backlinks and files
    const file = this.files.get(path);
    let deleted = false;
    if (file) {
      this.forwardLinks.delete(file);
      this.backLinks.delete(file.path);
      this.files.delete(path);
      deleted = true;
    }

    // delete event
    deleted && this.onDidDeleteEmitter.fire(uri);
  }

  // filename to 1 full path
  fileNameFullPathMap = new Map<string, string>();
  uriHandler: URIHandler;
  fullScanned = false;

  // TODO: event to unblacklist: if file added, remove from failed scans.
  failedScans = new Set<string>();

  constructor(uriHandler = new URIHandler()) {
    this.uriHandler = uriHandler;

    // setup watcher
  }

  isAbs(path: string) {
    if (path.includes("/")) {
      // 1/2 vs folder/note

      //TODO: try attach to root & open  => failed ? absolute (true) : relative (false)

      return true;
    }
    return false;
  }
  getFullPath(fileName: string) {
    const fullPath = this.fileNameFullPathMap.get(fileName);
    return !!fullPath ? fullPath : "";
  }

  dispose() {
    this.onDidAddEmitter.dispose();
    this.onDidDeleteEmitter.dispose();
    this.onDidUpdateEmitter.dispose();
  }
}
