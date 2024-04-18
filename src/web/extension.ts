import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";

export function activate(context: vscode.ExtensionContext) {
  let disposable2 = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // TODO, make sure file is markdown
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

  context.subscriptions.push(disposable2);
}

export function deactivate() {}
