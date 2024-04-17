// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";

const getGraphWebViewHtml = (neoLib: vscode.Uri, data: string) => {
  return `
<html lang="en">
  <head>
    <title>Obsidian Visualizer</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div class="graph"></div>
    <script src="${neoLib}"></script>
    <script src="https://cdn.jsdelivr.net/npm/d3@7"></script>
    <script>
      var neo4jd3 = new Neo4jd3(".graph", {
        highlight: [
          {
            class: "File",
          },
        ],
        minCollision: 60,
        neo4jDataUrl: "json/neo4jData.json",
        neo4jData: ${data},
        nodeRadius: 25,
        // onNodeDoubleClick: function (node) {
        //   switch (node.id) {
        //     case "25":
        //       // Google
        //       window.open(node.properties.url, "_blank");
        //       break;
        //     default:
        //       var maxNodes = 5,
        //         data = neo4jd3.randomD3Data(node, maxNodes);
        //       neo4jd3.updateWithD3Data(data);
        //       break;
        //   }
        // },
        zoomFit: true,
      });
    </script>
  </body>
</html>
  `;
};
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("what if i change ");

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  // let disposable = vscode.commands.registerCommand(
  //   "obsidian-visualizer.helloWorld",
  //   () => {
  //     // The code you place here will be executed every time your command is executed

  //     // Display a message box to the user
  //     vscode.window.showInformationMessage("Change");
  //   }
  // );

  let disposable2 = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // TODO, make sure file is markdown
      // textEditor.document.uri;

      const gCreator = new GraphCreator();
      console.log(context.extensionUri);
      // console.log(textEditor.document.uri);
      gCreator.parseLocalGraph(textEditor.document.uri).then(() => {
        console.log(gCreator.getD3Format());
        // webview
        const panel = vscode.window.createWebviewPanel(
          "graphView",
          "Local Graph View",
          vscode.ViewColumn.One,
          { enableScripts: true }
        );
        const onDiskPath = vscode.Uri.joinPath(
          context.extensionUri,
          "src",
          "web",
          "webview",
          "neo4jd3.min.js"
        );
        const neo4djlib = panel.webview.asWebviewUri(onDiskPath);
        panel.webview.html = getGraphWebViewHtml(
          neo4djlib,
          JSON.stringify(gCreator.getD3Format())
        );
      });
    }
  );

  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}
