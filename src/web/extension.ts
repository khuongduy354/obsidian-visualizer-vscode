import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";

export function activate(context: vscode.ExtensionContext) {
  let disposable2 = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // TODO, make sure file is markdown
      const isMd = textEditor.document.fileName.split(".").pop() === "md";
      if (!isMd) return;

      // textEditor.document.uri;

      // parse local graph
      const gCreator = new GraphCreator(context.extensionUri);
      gCreator.parseLocalGraph(textEditor.document.uri.fsPath).then(() => {
        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(gCreator.getNeoFormat())
          .setNodeListener(function (message: any) {
            const fs = message.node.properties.fileFs;

            let uri = vscode.Uri.from({ scheme: "vscode-test-web", path: fs });
            vscode.commands.executeCommand("vscode.open", uri);
          });
      });
    }
  );

  let disposable3 = vscode.commands.registerCommand(
    "obsidian-visualizer.showGlobalGraph",
    () => {
      // console.log(context.asAbsolutePath("index.ts"));
      // const dirUri = vscode.Uri.from({
      //   scheme: "vscode-test-web",
      //   path: "/",
      // });
      // const files = await vscode.workspace.fs.readDirectory(dirUri);
      // const wsfolders = vscode.workspace.workspaceFolders;
      // parse global graph
      const gCreator = new GraphCreator(context.extensionUri);
      gCreator.parseGlobalGraph().then(() => {
        console.log(
          "Finished parsing, sieze: ",
          gCreator.getGlobalGraphMap().size
        );
        // render to webview
        const webview = new GraphWebView(context);
        const neoFormat = gCreator.getNeoFormat(false);
        console.log(neoFormat);
        webview
          .initializeWebView(neoFormat)
          .setNodeListener(function (message: any) {
            const fs = message.node.properties.fileFs;
            let uri = vscode.Uri.from({ scheme: "vscode-test-web", path: fs });
            vscode.commands.executeCommand("vscode.open", uri);
          });
      });
    }
  );

  context.subscriptions.push(disposable2);
}

export function deactivate() {}
