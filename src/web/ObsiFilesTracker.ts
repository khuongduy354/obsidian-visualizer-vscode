import { URIHandler } from "./URIHandler";
import * as vscode from "vscode";

export class ObsiFilesTracker {
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
