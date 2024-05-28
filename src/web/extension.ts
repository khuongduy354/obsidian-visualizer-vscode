import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";
import { URIHandler } from "./URIHandler";
import { ObsiFilesTracker } from "./ObsiFilesTracker";

export function activate(context: vscode.ExtensionContext) {
  try {
    const uriHandler = new URIHandler();
    const obsiFilesTracker = new ObsiFilesTracker();

    obsiFilesTracker
      .readAllWorkspaceFiles()
      .then(() => {
        vscode.window.showInformationMessage("Files read");
        console.log("FILE READ: READY to use");
        console.log("FILE READ: map: ", obsiFilesTracker.files.size);
      })
      .catch((err) => {
        console.error("FILE READ ERR: ", err);
      });
    const graphBuilder = new GraphCreator(obsiFilesTracker);

    let disposable2 = vscode.commands.registerTextEditorCommand(
      "obsidian-visualizer.showLocalGraph",
      (textEditor, edit) => {
        // validate markdown
        const isMd = textEditor.document.fileName.split(".").pop() === "md";
        if (!isMd) return;

        console.log("URI: ", textEditor.document.uri);

        // parse local graph
        const graph = graphBuilder.parseNeoLocal(textEditor.document.uri.path);
        console.log("Local neo format: ", graph);

        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(graph, "Local Graph")
          // node onDoubleClick listener
          .setNodeListener(function (message: any) {
            let uri = message.node.properties.fileFs;
            uri = uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components

            vscode.commands.executeCommand("vscode.open", uri);
          });
      }
    );

    let disposable3 = vscode.commands.registerCommand(
      "obsidian-visualizer.showGlobalGraph",
      () => {
        // parse global graph
        const graph = graphBuilder.parseNeoGlobal();

        // render to webview
        const webview = new GraphWebView(context);
        console.log("Global neo format: ", graph);
        webview
          .initializeWebView(graph, "Global Graph")
          // node onDoubleClick listener
          .setNodeListener(function (message: any) {
            let uri = message.node.properties.fileFs;
            uri = uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components
            if (uri !== undefined)
              vscode.commands.executeCommand("vscode.open", uri);
          });
      }
    );

    context.subscriptions.push(disposable2, disposable3);
  } catch (e) {
    console.error(e);
  }
}

export function deactivate() {}
