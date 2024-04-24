import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";
import { URIHandler } from "./URIHandler";

export function activate(context: vscode.ExtensionContext) {
  try {
    const uriHandler = new URIHandler();

    let disposable2 = vscode.commands.registerTextEditorCommand(
      "obsidian-visualizer.showLocalGraph",
      (textEditor, edit) => {
        // validate markdown
        const isMd = textEditor.document.fileName.split(".").pop() === "md";
        if (!isMd) return;

        console.log("URI: ", textEditor.document.uri);

        // parse local graph
        const gCreator = new GraphCreator();
        vscode.window.showInformationMessage("Parsing local graph...");
        gCreator.parseLocalGraph(textEditor.document.uri.fsPath).then(() => {
          // render to webview
          const webview = new GraphWebView(context);
          webview
            .initializeWebView(gCreator.getNeoFormat(), "Local Graph")
            // node onDoubleClick listener
            .setNodeListener(function (message: any) {
              const fs = message.node.properties.fileFs;
              vscode.commands.executeCommand(
                "vscode.open",
                uriHandler.getFullURI(fs)
              );
            });
        });
      }
    );

    let disposable3 = vscode.commands.registerCommand(
      "obsidian-visualizer.showGlobalGraph",
      () => {
        const gCreator = new GraphCreator();
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
              vscode.commands.executeCommand(
                "vscode.open",
                uriHandler.getFullURI(fs)
              );
            });
        });
      }
    );

    context.subscriptions.push(disposable2, disposable3);
  } catch (e) {
    console.error(e);
  }
}

export function deactivate() {}
