import * as vscode from "vscode";
// import { AppContext } from "./types/AppContext";
import { Commands } from "./types/Commands";
import { GraphWebView } from "./webview/GraphWebView";
import { GraphOption } from "./types/GraphOption";
import { AppContext } from "./AppContext";

export function setupCommands(
  appContext: AppContext,
  context: vscode.ExtensionContext
): Commands {
  let { graphBuilder, uriHandler, obsiFilesTracker, graphOption } = appContext;

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
      console.log(
        "Global Graph: ",
        appContext.globalGraph.results[0].data[0].graph
      );
      webview
        .initializeWebView(appContext.globalGraph, "Global Graph")
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
          onSearchChanged: function (searchFilter: string) {
            let filteredGraph = graphBuilder.applySearchFilter(
              appContext.globalGraph,
              searchFilter
            );
            webview.graphData = JSON.stringify(filteredGraph);
            webview.refresh();
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

          appContext.globalGraph = graphBuilder.parseNeoGlobal();
        })
        .catch((err) => {
          console.error("FILE READ ERR: ", err);
        });
    }
  );

  return {
    showLocalGraphCommand,
    showGlobalGraphCommand,
    forceWorkspaceParseCommand,
  };
}
