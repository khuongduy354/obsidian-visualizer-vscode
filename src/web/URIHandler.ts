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
    const baseScheme = this.baseWorkspaceURI.scheme;

    let uri = this.baseWorkspaceURI.with({ path: path });

    if (isRelative) {
      uri = vscode.Uri.joinPath(this.baseWorkspaceURI, path);
    }

    //if on desktop
    if (baseScheme === "file") {
      return uri;
    }

    // if online
    if (baseScheme === "vscode-vfs") return uri;

    // if testing
    if (baseScheme === "vscode-test-web") {
      // strip /static/extensions/fs
      if (path.startsWith("/static/extensions/fs"))
        path = path.replace("/static/extensions/fs", "");

      return this.baseWorkspaceURI.with({ path });
    }

    if (baseScheme === "http")
      return vscode.Uri.joinPath(this.baseWorkspaceURI, path);

    throw new Error("Unsupported scheme");
  }

  static joinPath(...args: string[]) {
    let res = "";
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "") continue;
      if (!args[i].startsWith("/") && !res.endsWith("/")) {
        args[i] = "/" + args[i];
      }
      res += args[i];
    }

    return res;
  }
}
