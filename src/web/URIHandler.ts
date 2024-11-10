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

  // get full uri from a of current workspace
  getFullURI(path: string, isRelative = true) {
    const baseScheme = this.baseWorkspaceURI.scheme;

    let uri = this.baseWorkspaceURI.with({ path: path });

    //if on desktop (desktop don't use relative path)
    if (baseScheme === "file") {
      return uri;
    }

    if (isRelative) {
      uri = vscode.Uri.joinPath(this.baseWorkspaceURI, path);
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
