import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";

export const getScheme = () => {
  const workspace = vscode.workspace.workspaceFolders;
  if (workspace === undefined || workspace.length === 0) return null;

  return workspace[0].uri.scheme;
};
export function activate(context: vscode.ExtensionContext) {
  let disposable2 = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // validate markdown
      const isMd = textEditor.document.fileName.split(".").pop() === "md";
      if (!isMd) return;

      const scheme = getScheme();
      if (scheme === null) vscode.window.showErrorMessage("No workspace found");

      // parse local graph
      const gCreator = new GraphCreator(scheme as string);
      gCreator.parseLocalGraph(textEditor.document.uri.fsPath).then(() => {
        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(gCreator.getNeoFormat(), "Local Graph")
          // node onDoubleClick listener
          .setNodeListener(function (message: any) {
            const fs = message.node.properties.fileFs;

            let uri = vscode.Uri.from({ scheme: scheme as string, path: fs });
            vscode.commands.executeCommand("vscode.open", uri);
          });
      });
    }
  );

  let disposable3 = vscode.commands.registerCommand(
    "obsidian-visualizer.showGlobalGraph",
    () => {
      const scheme = getScheme();
      if (scheme === null) vscode.window.showErrorMessage("No workspace found");

      const gCreator = new GraphCreator(scheme as string);
      vscode.window.showInformationMessage("Parsing global graph...");
      gCreator.parseGlobalGraph().then(() => {
        // render to webview
        const webview = new GraphWebView(context);
        const neoFormat = gCreator.getNeoFormat(false);
        webview
          .initializeWebView(neoFormat, "Global Graph")
          // node onDoubleClick listener
          .setNodeListener(function (message: any) {
            const fs = message.node.properties.fileFs;
            let uri = vscode.Uri.from({ scheme: scheme as string, path: fs });
            vscode.commands.executeCommand("vscode.open", uri);
          });
      });
    }
  );

  context.subscriptions.push(disposable2, disposable3);
}

export function deactivate() {}
