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
  backLinks = new Map<ObsiFile, Array<ObsiFile>>();

  extractForwardLinks(content: string): Array<ObsiFile> {
    // TODO: ignore ![[...]]

    const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;
    let forwardLinks = [...content.matchAll(linkRegex)].map((forwardLink) => {
      const fullPath = this.getFullPath(forwardLink[1]);
      let uri: vscode.Uri | undefined;

      console.log("full path");
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

      // todo: remove node_modules
      const uris = await vscode.workspace.findFiles(pattern);

      for (let uri of uris) {
        // check markdown
        if (uri.path.split(".").pop() !== "md") continue;

        // parse forward links
        uri = this.uriHandler.getFullURI(uri.path);
        const content = await this.readFile(uri);
        if (!content) continue;

        const forwardLinks = this.extractForwardLinks(content);

        // save to data structure
        const path = uri.path;
        const file = { path, fullURI: uri };
        console.log("Tracking: ", path);
        this.forwardLinks.set(file, forwardLinks);
        this.files.set(path, file);

        // TODO: backlinks
      }
    }
  }

  // TODO:
  addFile() {}
  deleteFile() {}

  // filename to 1 full path
  fileNameFullPathMap = new Map<string, string>();
  uriHandler: URIHandler;
  fullScanned = false;

  // TODO: event to unblacklist: if file added, remove from failed scans.
  failedScans = new Set<string>();

  constructor(uriHandler = new URIHandler()) {
    this.uriHandler = uriHandler;
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

  async scanFullPath() {
    const start = "/";

    // scan from start, find file with filename -> add to map -> return
    await this.readDirRecursively(start, "");
  }

  async readDirRecursively(start: string, currentParent: string) {
    // let path = currentParent + start + "/";
    let filePath = URIHandler.joinPath(currentParent, start);

    let entries = await vscode.workspace.fs.readDirectory(
      this.uriHandler.getFullURI(filePath)
    );

    for (let entry of entries) {
      if (entry[1] === 1) {
        const isMd = entry[0].split(".").pop() === "md";
        if (!isMd) continue;

        const fullPath = URIHandler.joinPath(filePath, entry[0]);

        // track entry
        if (!this.fileNameFullPathMap.has(entry[0]))
          this.fileNameFullPathMap.set(entry[0], fullPath);

        // return if target found
        // if (entry[0] === target && !this.fileNameFullPathMap.has(target)) {
        // }
      }
      if (entry[1] === 2) {
        await this.readDirRecursively(entry[0], filePath);
      }
    }
  }
}
