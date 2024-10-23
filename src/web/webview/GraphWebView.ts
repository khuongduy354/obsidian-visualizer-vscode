import * as vscode from "vscode";
import { GraphCreator } from "../GraphCreator";
import { WebviewEventHandlers } from "../types/WebViewEventHandlers";
import { GraphOption } from "../types/GraphOption";

export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;
  graphOption: GraphOption;
  graphData: string = "";

  constructor(
    context: vscode.ExtensionContext,
    graphOption: GraphOption = { forwardLinks: true, backwardLinks: true }
  ) {
    this.context = context;
    this.graphOption = graphOption;
  }

  refresh() {
    if (!this.panel) throw new Error("Panel not initialized");

    const libs = this.loadLibs(this.panel as vscode.WebviewPanel);
    console.log("graphoption before reload: ", this.graphOption);
    this.panel.webview.html = this.getGraphWebViewHtml(libs, this.graphData);
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

  setNodeListener(webviewEventHandlers: WebviewEventHandlers) {
    if (this.panel === undefined) return;

    const { onNodeDoubleClick, onGraphOptionChanged } = webviewEventHandlers;

    this.panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case "onNodeDoubleClick":
            if (onNodeDoubleClick) onNodeDoubleClick(message.node);
            break;
          case "onGraphOptionChanged":
            this.graphOption = message.graphOption;
            if (onGraphOptionChanged) onGraphOptionChanged(message.graphOption);
            this.refresh();
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
    </script> 
    `;
  }
  generateConfigPanel() {
    console.log("GraphOption: ", this.graphOption.forwardLinks);
    return `   
        <div class="config-panel">
        <div class="toggle-container">
            <label for="forwardLinks">Forward Links</label>
            <input  ${this.graphOption.forwardLinks ? "checked" : ""}
            type="checkbox" id="forwardLinks" class="toggle">
        </div>
        <div class="toggle-container">
            <label for="backwardLinks">Backward Links</label>
            <input  ${this.graphOption.backwardLinks ? "checked" : ""}
            type="checkbox" id="backwardLinks" class="toggle">
        </div>
    </div>
    <script>
    let graphOption = ${JSON.stringify(this.graphOption) as string};
    document.getElementById('forwardLinks').addEventListener('change', function() {
      console.log("forwardlinks from event: ", this.checked);
      graphOption.forwardLinks = this.checked;
      vscode.postMessage({
        command: "onGraphOptionChanged",
        graphOption,
      });
    });

    document.getElementById('backwardLinks').addEventListener('change', function() {
      graphOption.backwardLinks = this.checked;
      vscode.postMessage({
        command: "onGraphOptionChanged",
        graphOption,
      });
    });
    </script>
    `;
  }

  setStyleScripts() {
    return ` 
    <script>  
    // format texts
    const texts = document.getElementsByClassName("text");        
    for(let i = 0; i < texts.length; i++){
      let text = texts[i];  

      let filename = text.innerHTML.split("/").pop(); 
      filename = filename !== undefined ? filename : text.innerHTML;  
      text.innerHTML = filename  

    } 

    const nodeList = document.querySelectorAll(".nodes > .node")  

    for(let _node of nodeList){   
      // Apply blur on node that not exist    
      if(_node.__data__.properties.isFileVirtual){  
        _node.classList.add("blur"); 
        console.log("NOt exist: ", _node);
      } 

      // Highlight links of a selected (mouseovered) nodes 
      _node.addEventListener("mouseover", function(){ 
        const nodeId = _node.__data__.id;  

        const relList = document.querySelectorAll(".relationships > .relationship");
        for(let rel of relList){  
          if(rel.__data__.startNode === nodeId && !rel.__data__.properties.isBacklink)
            {rel.classList.add("highlighted");}
        }
      });  

      _node.addEventListener("mouseout", function(){ 
        const nodeId = _node.__data__.id;  

        const relList = document.querySelectorAll(".relationships > .relationship");
        for(let rel of relList){  
          if(rel.__data__.startNode === nodeId)
            {rel.classList.remove("highlighted");}
        }
      });

      _node.addEventListener("mouseover", function(){ 
        const nodeId = _node.__data__.id;  

        const relList = document.querySelectorAll(".relationships > .relationship");
        for(let rel of relList){  
          if(rel.__data__.startNode === nodeId)
            {rel.classList.add("highlighted");}
        }
      });
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
    .blur{
      opacity:80%;
    }
    .text{ 
      margin-top: 100px; 
      background-color: #000000;  
      fill:${this.getTextColor()}
    } 

    .highlighted{  
      fill: red;Reseu

    }

    </style>
  </head>
  <body>
  <div class="container">  
    <h3>Currently supports outgoing links (forward links) only</h3>
    ${this.generateConfigPanel()}
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
    ${this.setStyleScripts()}
    ${this.setTextScript()}
  </body>
</html>
  `;
  }
}
