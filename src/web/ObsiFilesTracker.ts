import { URIHandler } from "./URIHandler";
import * as vscode from "vscode";

export type ObsiFile = {
  // relative path to root workspace
  path: string;
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
    return [{ path: "" }];
  }

  async readFile(uri: vscode.Uri) {
    const doc = await vscode.workspace.openTextDocument(uri);
    return doc.getText();
  }

  async readAllWorkspaceFiles() {
    this.forwardLinks.clear();
    this.backLinks.clear();
    // let files: [] = [];

    if (!vscode.workspace.workspaceFolders)
      throw new Error("No workspace found ");

    for (const folder of vscode.workspace.workspaceFolders) {
      console.log("folder: ", folder);
      const uris = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder.uri.path, "**/*")
      );
      console.log("files: ", uris.length);
      const forwardLinks: ObsiFile[] = [];
      for (const uri of uris) {
        // check markdown
        if (uri.path.split(".").pop() !== "md") continue;

        const content = await this.readFile(uri);
        forwardLinks.concat(this.extractForwardLinks(content));

        const path = uri.toString();
        this.forwardLinks.set({ path }, forwardLinks);
        this.files.set(path, { path });

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
    return this.fileNameFullPathMap.get(fileName);
  }

  async scanFullPath() {
    const start = "/";

    // scan from start, find file with filename -> add to map -> return
    await this.readDirRecursively(start, "");
  }

  async readDirRecursively(start: string, currentParent: string) {
    // let path = currentParent + start + "/";
    let filePath = URIHandler.joinPath(currentParent, start);
    console.log("file path: ", this.uriHandler.getFullURI(filePath).path);

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
