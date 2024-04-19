import * as vscode from "vscode";
export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  initializeWebView(_graphData: any) {
    const panel = vscode.window.createWebviewPanel(
      "graphView",
      "Local Graph View",
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    const libs = this.loadLibs(panel);

    const graphData: string =
      typeof _graphData === "string" ? _graphData : JSON.stringify(_graphData);
    panel.webview.html = this.getGraphWebViewHtml(libs, graphData);

    this.panel = panel;
    return this;
  }

  loadLibs(panel: vscode.WebviewPanel) {
    const basePath = vscode.Uri.joinPath(
      this.context.extensionUri,
      "src",
      "web",
      "webview"
    );
    const neoPath = vscode.Uri.joinPath(basePath, "neo4jd3.min.js");
    const d3Path = vscode.Uri.joinPath(basePath, "d3.min.js");

    const neo4jlib = panel.webview.asWebviewUri(neoPath);
    const d3lib = panel.webview.asWebviewUri(d3Path);

    return { neo4jlib, d3lib };
  }

  setNodeListener(onNodeDoubleClick: Function) {
    if (this.panel === undefined) return;

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "onNodeDoubleClick":
            onNodeDoubleClick(message);
            break;
        }
      },
      undefined,
      this.context.subscriptions
    );
  }

  getGraphWebViewHtml(
    libs: { neo4jlib: vscode.Uri; d3lib: vscode.Uri },
    data: string
  ) {
    return `
<html lang="en">
  <head>
    <title>Obsidian Visualizer</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" /> 
    <style> 
    .graph{
      height: 100vh; 
      background-color: #f5f5f5; 
      zIndex: 1;
    }   

    html, body {
      height: 100%; 
      width: 100%;
    }

    </style>
  </head>
  <body>
    <div class="graph"></div> 
    <script src="${libs.neo4jlib}"></div>
    <script src="${libs.d3lib}"></script>
    <script>
      const vscode = acquireVsCodeApi();
      var neo4jd3 = new Neo4jd3(".graph", {
        highlight: [
          {
            class: "File",
          },
        ],
        minCollision: 60,
        neo4jData: ${data},
        nodeRadius: 25,
        onNodeDoubleClick: function (node) {
            vscode.postMessage({
                command: "onNodeDoubleClick",
                node: node,
            });
        },
        infoPanel: false,
        zoomFit: true
      });
    </script>
  </body>
</html>
  `;
  }
}
