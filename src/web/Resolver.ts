import { ObsiFilesTracker } from "./ObsiFilesTracker";
import vscode from "vscode";

export class Resolver {
  obsifilesTracker: ObsiFilesTracker;

  constructor(obsifilesTracker: ObsiFilesTracker) {
    this.obsifilesTracker = obsifilesTracker;
  }

  async resolveFile(filename: string): Promise<string> {
    // /filename (absolute path)
    if (filename.startsWith("/")) return filename;

    // filename
    // 1. get from cached
    // default as first one because that's how resolve work if you don't specify;
    let filePaths = this.obsifilesTracker.fileNameFullPathMap.get(filename);
    console.log("Resolving: ", filename, filePaths);
    if (filePaths && filePaths.size > 0) return filePaths.values().next().value;

    // // 2. TODO: regex from workspaces
    // const pattern = `(\\b${filename}\\b)`;
    // const files = await vscode.workspace.findFiles(pattern);

    return "";
  }
}
