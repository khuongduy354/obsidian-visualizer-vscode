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
  const showLocalGraphCommand = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // validate markdown
      const isMd = textEditor.document.fileName.split(".").pop() === "md";
      if (!isMd) return;

      const selectedUri = textEditor.document.uri.path;
      console.log("Selected URI: ", selectedUri);

      // parse local graph
      const graph = appContext.graphBuilder.parseNeoLocal(selectedUri);

      // render to webview
      const webview = new GraphWebView(context);
      webview
        .initializeWebView(graph, "Local Graph")
        // node onDoubleClick listener
        .setNodeListener({
          onNodeDoubleClick: function (message: any) {
            let uri = message.node.properties.fileFs;
            uri = appContext.uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components

            vscode.commands.executeCommand("vscode.open", uri);
          },
          onGraphOptionChanged: function (graphOption: GraphOption) {
            webview.graphData = JSON.stringify(
              appContext.graphBuilder.parseNeoLocal(selectedUri, graphOption)
            );
            // vscode.commands.executeCommand("vscode.reloadWebviews");
          },
          // onSearchChanged: function (searchFilter: string) {
          //   let filteredGraph = graphBuilder.applySearchFilter(
          //     appContext.globalGraph,
          //     searchFilter
          //   );
          //   webview.graphData = JSON.stringify(filteredGraph);
          // },
        });
    }
  );

  const showGlobalGraphCommand = vscode.commands.registerCommand(
    "obsidian-visualizer.showGlobalGraph",
    () => {
      // parse global graph
      // const graph = graphBuilder.parseNeoGlobal();

      // render to webview
      const webview = new GraphWebView(context, appContext.graphOption);
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
            uri = appContext.uriHandler.getFullURI(uri.path as string); // reparse to fix missing uri components
            if (uri !== undefined)
              vscode.commands.executeCommand("vscode.open", uri);
          },
          onGraphOptionChanged: function (graphOption: GraphOption) {
            webview.graphData = JSON.stringify(
              appContext.graphBuilder.parseNeoGlobal(graphOption)
            );
            // vscode.commands.executeCommand("vscode.reloadWebviews");
          },
          onSearchChanged: function (searchFilter: string) {
            let filteredGraph = appContext.graphBuilder.applySearchFilter(
              appContext.globalGraph,
              searchFilter
            );
            webview.graphData = JSON.stringify(filteredGraph);
          },
        });
    }
  );

  const forceWorkspaceParseCommand = vscode.commands.registerCommand(
    "obsidian-visualizer.forceWorkspaceParse",
    () => {
      vscode.window.showInformationMessage(
        "ObsiVis: Re-reading all workspace files, only open graphs when ready"
      );
      appContext.obsiFilesTracker
        .readAllWorkspaceFiles()
        .then(() => {
          vscode.window.showInformationMessage(
            "ObsiVis: Files re-read finished!!"
          );

          appContext.globalGraph = appContext.graphBuilder.parseNeoGlobal();
          console.log(
            "Global graph after reparse:",
            appContext.globalGraph.results[0].data[0].graph
          );
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
