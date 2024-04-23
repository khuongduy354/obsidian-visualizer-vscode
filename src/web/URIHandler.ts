import * as vscode from "vscode";
export class URIHandler {
  baseWorkspaceURI: vscode.Uri;

  constructor(customURI: vscode.Uri | undefined = undefined) {
    // custom uri for testing
    if (customURI !== undefined) this.baseWorkspaceURI = customURI;
    else {
      // init base workspace uri
      const workspace = vscode.workspace.workspaceFolders;
      if (workspace === undefined || workspace.length === 0)
        throw new Error("No workspace found");

      this.baseWorkspaceURI = workspace[0].uri;
    }
  }

  // get full uri from a relative path of current workspace
  getFullURI(path: string, isRelative = true) {
    //if on desktop
    const baseScheme = this.baseWorkspaceURI.scheme;
    if (baseScheme === "file") {
      let uri = vscode.Uri.from({
        path: path,
        scheme: "file",
      });
      if (isRelative) {
        uri = vscode.Uri.joinPath(this.baseWorkspaceURI, path);
      }
      return uri;
    }

    // if online
    if (baseScheme === "vscode-vfs")
      return vscode.Uri.joinPath(this.baseWorkspaceURI, path);

    // if testing
    if (baseScheme === "vscode-test-web")
      return vscode.Uri.joinPath(this.baseWorkspaceURI, path);

    if (baseScheme === "http")
      return vscode.Uri.joinPath(this.baseWorkspaceURI, path);

    throw new Error("Unsupported scheme");
  }
}
