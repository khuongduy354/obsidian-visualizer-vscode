import * as vscode from "vscode";
export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  initializeWebView(_graphData: any, panelName: string) {
    const panel = vscode.window.createWebviewPanel(
      "graphView",
      panelName,
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
    const baseUri = this.context.extensionUri;

    const basePath = vscode.Uri.joinPath(baseUri, "images");
    const neoPath = vscode.Uri.joinPath(basePath, "neo4jd3.min.js");
    const d3Path = vscode.Uri.joinPath(basePath, "d3.min.js");

    const neo4jlib = panel.webview.asWebviewUri(neoPath);
    const d3lib = panel.webview.asWebviewUri(d3Path);

    // const neo4jlib = "";
    // const d3lib = "https://cdnjs.cloudflare.com/ajax/libs/d3/4.0.0/d3.js";

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

  getTextColor() {
    switch (vscode.window.activeColorTheme.kind) {
      case vscode.ColorThemeKind.Dark:
        return "#FFFFFF";
      case vscode.ColorThemeKind.Light:
        return "#000000";
      case vscode.ColorThemeKind.HighContrast:
        return "#FFFFFF";
      case vscode.ColorThemeKind.HighContrastLight:
        return "#000000";
      default:
        return "#808080";
    }
  }
  setTextScript() {
    //TODO: offset text outside of the node
    return `
    <script> 
    const texts = document.getElementsByClassName("text");        
    for(let i = 0; i < texts.length; i++){
      let text = texts[i];  

      let filename = text.innerHTML.split("/").pop(); 
      filename = filename !== undefined ? filename : text.innerHTML;  
      text.innerHTML = filename  

    } 
    </script> 
    `;
  }

  getGraphWebViewHtml(
    libs: { neo4jlib: vscode.Uri | string; d3lib: vscode.Uri | string },
    data: string
  ) {
    return `
<html lang="en">
  <head>
    <title>Obsidian Visualizer</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" /> 
    <style> 
   .container{
      height: 100vh; 
    }     
    .neo4jd3 {
      height: 100%;
    }

    html, body {
      height: 100%; 
      width: 100%;
    } 
    .text{ 
      margin-top: 100px; 
      background-color: #000000;  
      fill:${this.getTextColor()}
    }

    </style>
  </head>
  <body>
  <div class="container">  
    <h3>Currently supports outgoing links (forward links) only</h3>
    <div class="graph"></div> 
  </div>

    <script src="${libs.neo4jlib}"></script>
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
        icons:{
          "File":""
        },
        onNodeDoubleClick: function (node) {
            vscode.postMessage({
                command: "onNodeDoubleClick",
                node: node,
            });
        },
        infoPanel: false,
        zoomFit: false, 
      });
    </script>
    ${this.setTextScript()}
  </body>
</html>
  `;
  }
}
