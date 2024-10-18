import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";
import { URIHandler } from "./URIHandler";
import { ObsiFilesTracker } from "./ObsiFilesTracker";
import { setWatcher } from "./VSCodeWatcher";

export function activate(context: vscode.ExtensionContext) {
  try {
    const uriHandler = new URIHandler();
    const obsiFilesTracker = new ObsiFilesTracker();
    const watcher = setWatcher(obsiFilesTracker);

    obsiFilesTracker
      .readAllWorkspaceFiles()
      .then(() => {
        vscode.window.showInformationMessage(
          "Files read " + obsiFilesTracker.files.size
        );
        console.log("FILE READ: map: ", obsiFilesTracker.files);
      })
      .catch((err) => {
        console.error("FILE READ ERR: ", err);
      });

    const graphBuilder = new GraphCreator(obsiFilesTracker);
    let globalGraph = graphBuilder.parseNeoGlobal();
    console.log(globalGraph.results[0].data[0].graph);

    // handle events
    obsiFilesTracker.onDidAddEmitter.event(() => {
      globalGraph = graphBuilder.parseNeoGlobal();
    });
    obsiFilesTracker.onDidDeleteEmitter.event(() => {
      globalGraph = graphBuilder.parseNeoGlobal();
    });
    obsiFilesTracker.onDidUpdateEmitter.event(() => {
      globalGraph = graphBuilder.parseNeoGlobal();
    });

    const showLocalGraphCommand = vscode.commands.registerTextEditorCommand(
      "obsidian-visualizer.showLocalGraph",
      (textEditor, edit) => {
        // validate markdown
        const isMd = textEditor.document.fileName.split(".").pop() === "md";
        if (!isMd) return;

        console.log("URI: ", textEditor.document.uri);

        // parse local graph
        const graph = graphBuilder.parseNeoLocal(textEditor.document.uri.path);

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

    const showGlobalGraphCommand = vscode.commands.registerCommand(
      "obsidian-visualizer.showGlobalGraph",
      () => {
        // parse global graph
        // const graph = graphBuilder.parseNeoGlobal();

        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(globalGraph, "Global Graph")
          // node onDoubleClick listener
          .setNodeListener(function (message: any) {
            let uri = message.node.properties.fileFs;
            uri = uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components
            if (uri !== undefined)
              vscode.commands.executeCommand("vscode.open", uri);
          });
      }
    );

    const forceWorkspaceParseCommand = vscode.commands.registerCommand(
      "obsidian-visualizer.forceWorkspaceParse",
      () => {
        obsiFilesTracker
          .readAllWorkspaceFiles()
          .then(() => {
            console.log("FILE READ: map: ", obsiFilesTracker.files.size);
            vscode.window.showInformationMessage(
              "Files read " + obsiFilesTracker.files.size.toString()
            );

            globalGraph = graphBuilder.parseNeoGlobal();
            console.log("File read: ", [...obsiFilesTracker.files.entries()]);
          })
          .catch((err) => {
            console.error("FILE READ ERR: ", err);
          });
      }
    );

    context.subscriptions.push(
      showLocalGraphCommand,
      showGlobalGraphCommand,
      watcher,
      obsiFilesTracker,
      graphBuilder,
      forceWorkspaceParseCommand
    );
  } catch (e) {
    console.error(e);
  }
}

export function deactivate() {}
