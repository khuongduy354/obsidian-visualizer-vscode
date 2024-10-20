import * as vscode from "vscode";
import { GraphCreator, GraphOption } from "./GraphCreator";
import { GraphWebView } from "./webview/GraphWebView";
import { URIHandler } from "./URIHandler";
import { ObsiFilesTracker } from "./ObsiFilesTracker";
import { setWatcher } from "./VSCodeWatcher";

export function activate(context: vscode.ExtensionContext) {
  try {
    // initial run
    const uriHandler = new URIHandler();
    const obsiFilesTracker = new ObsiFilesTracker();
    const watcher = setWatcher(obsiFilesTracker);

    obsiFilesTracker
      .readAllWorkspaceFiles()
      .then(() => {
        vscode.window.showInformationMessage("Files read ");
      })
      .catch((err) => {
        console.error("FILE READ ERR: ", err);
      });

    const graphBuilder = new GraphCreator(obsiFilesTracker);
    let globalGraph = graphBuilder.parseNeoGlobal();
    console.log(globalGraph.results[0].data[0].graph);
    let graphOption: GraphOption = { forwardLinks: true, backwardLinks: true };

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

    // commands
    const showLocalGraphCommand = vscode.commands.registerTextEditorCommand(
      "obsidian-visualizer.showLocalGraph",
      (textEditor, edit) => {
        // validate markdown
        const isMd = textEditor.document.fileName.split(".").pop() === "md";
        if (!isMd) return;

        const selectedUri = textEditor.document.uri.path;

        // parse local graph
        const graph = graphBuilder.parseNeoLocal(selectedUri);

        // render to webview
        const webview = new GraphWebView(context);
        webview
          .initializeWebView(graph, "Local Graph")
          // node onDoubleClick listener
          .setNodeListener({
            onNodeDoubleClick: function (message: any) {
              let uri = message.node.properties.fileFs;
              uri = uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components

              vscode.commands.executeCommand("vscode.open", uri);
            },
            onGraphOptionChanged: function (graphOption: GraphOption) {
              webview.graphData = JSON.stringify(
                graphBuilder.parseNeoLocal(selectedUri, graphOption)
              );
              // vscode.commands.executeCommand("vscode.reloadWebviews");
            },
          });
      }
    );

    const showGlobalGraphCommand = vscode.commands.registerCommand(
      "obsidian-visualizer.showGlobalGraph",
      () => {
        // parse global graph
        // const graph = graphBuilder.parseNeoGlobal();

        // render to webview
        const webview = new GraphWebView(context, graphOption);
        console.log("Global Graph: ", globalGraph.results[0].data[0].graph);
        webview
          .initializeWebView(globalGraph, "Global Graph")
          // node onDoubleClick listener
          .setNodeListener({
            onNodeDoubleClick: function (node: any) {
              let uri = node.properties.fileFs;
              uri = uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components
              if (uri !== undefined)
                vscode.commands.executeCommand("vscode.open", uri);
            },
            onGraphOptionChanged: function (graphOption: GraphOption) {
              webview.graphData = JSON.stringify(
                graphBuilder.parseNeoGlobal(graphOption)
              );
              // vscode.commands.executeCommand("vscode.reloadWebviews");
            },
          });
      }
    );

    const forceWorkspaceParseCommand = vscode.commands.registerCommand(
      "obsidian-visualizer.forceWorkspaceParse",
      () => {
        obsiFilesTracker
          .readAllWorkspaceFiles()
          .then(() => {
            vscode.window.showInformationMessage("Files read ");

            globalGraph = graphBuilder.parseNeoGlobal();
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
