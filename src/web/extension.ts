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
      const gCreator = new GraphCreator();
      gCreator.parseLocalGraph(textEditor.document.uri).then(() => {
        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(gCreator.getNeoFormat())
          .setNodeListener(function (message: any) {
            const uri = message.node.properties.fileUri;
            console.log("uri: ", uri);

            let reparsed = vscode.Uri.parse(uri.scheme + "://" + uri.fsPath);
            vscode.commands.executeCommand("vscode.open", reparsed);
          });
      });
    }
  );

  context.subscriptions.push(disposable2);
}

export function deactivate() {}
