import * as vscode from "vscode";
import { WebviewEventHandlers } from "../types/WebViewEventHandlers";
import { GraphOption } from "../types/GraphOption";
import { AppContext } from "../AppContext";

export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;
  graphOption: GraphOption;
  graphData: string = "";
  states = {
    searchInput: "",
    searchCursorPos: 0,
  };

  appContext: AppContext;

  constructor(
    context: vscode.ExtensionContext,
    appContext: AppContext,
    graphOption: GraphOption = { forwardLinks: true, backwardLinks: true },
  ) {
    this.context = context;
    this.appContext = appContext;
    this.graphOption = graphOption;
  }

  reloadGlobalGraph() {
    if (!this.appContext) return;
    // Reuse appContext.globalGraph if options match (already parsed by WatcherService),
    // otherwise re-parse with this webview's own graphOption.
    const optionsMatch =
      this.graphOption.forwardLinks ===
        this.appContext.graphOption.forwardLinks &&
      this.graphOption.backwardLinks ===
        this.appContext.graphOption.backwardLinks;

    const newData = optionsMatch
      ? this.appContext.globalGraph
      : this.appContext.graphBuilder.parseNeoGlobal(this.graphOption);

    this.graphData = JSON.stringify(newData);
    this.refresh();
  }

  refresh() {
    if (!this.panel) throw new Error("Panel not initialized");

    const libs = this.loadLibs(this.panel as vscode.WebviewPanel);
    this.panel.webview.html = this.getGraphWebViewHtml(libs, this.graphData);
  }
  initializeWebView(_graphData: any, panelName: string) {
    const panel = vscode.window.createWebviewPanel(
      "graphView",
      panelName,
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    const libs = this.loadLibs(panel);

    const graphData: string =
      typeof _graphData === "string" ? _graphData : JSON.stringify(_graphData);
    panel.webview.html = this.getGraphWebViewHtml(libs, graphData);

    this.panel = panel;

    // Listen to global graph updates if this is a global graph
    if (
      panelName === "Global Graph" &&
      this.appContext &&
      this.appContext.onDidGlobalGraphUpdate
    ) {
      const disposable = this.appContext.onDidGlobalGraphUpdate.event(() => {
        if (this.panel && this.panel.visible) {
          this.reloadGlobalGraph();
        }
      });
      // Dispose subscription when panel is closed
      this.panel.onDidDispose(() => {
        disposable.dispose();
      });
    }

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

    const { onNodeDoubleClick, onGraphOptionChanged, onSearchChanged } =
      webviewEventHandlers;

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
          case "onSearchChange":
            this.states.searchInput = message.searchFilter;
            this.states.searchCursorPos = message.cursorPos;
            if (onSearchChanged) onSearchChanged(message.searchFilter);
            this.refresh();
            break;
          default:
            console.error("Unknown command: ", message.command);
            break;
        }
      },
      undefined,
      this.context.subscriptions,
    );
  }

  generateConfigPanel() {
    return `   
        <div class="config-panel">
            <div class="control-group">
                <h3>Settings</h3>
                <div class="toggle-container">
                    <label class="switch">
                        <input type="checkbox" id="forwardLinks" ${
                          this.graphOption.forwardLinks ? "checked" : ""
                        }>
                        <span class="slider round"></span>
                    </label>
                    <span class="label-text">Forward Links</span>
                </div>
                <div class="toggle-container">
                    <label class="switch">
                        <input type="checkbox" id="backwardLinks" ${
                          this.graphOption.backwardLinks ? "checked" : ""
                        }>
                        <span class="slider round"></span>
                    </label>
                    <span class="label-text">Backward Links</span>
                </div> 
            </div>
            <div class="control-group">
                <h3>Legend</h3>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: var(--link-forward);"></div>
                    <span>Forward Links</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: var(--link-backward);"></div>
                    <span>Backward Links</span>
                </div>
                <div class="legend-item">
                    <div class="legend-color" style="background-color: var(--link-bidirectional);"></div>
                    <span>Bidirectional</span>
                </div>
            </div>
            <div class="control-group">
                <h3>Search</h3>
                <div class="search-container">
                    <input autofocus value="${
                      this.states.searchInput
                    }" type="text" id="search" class="search-input" placeholder="Search files...">
                </div>
            </div>
        </div>

    <script>
    const vscode = acquireVsCodeApi();
    let graphOption = ${JSON.stringify(this.graphOption) as string};
    
    document.getElementById('forwardLinks').addEventListener('change', function() {
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


    // SEARCH 
    const searchInput = document.getElementById('search');
    searchInput.addEventListener('input', function() { 
      vscode.postMessage({
        command: "onSearchChange",
        searchFilter: this.value,
        cursorPos: this.selectionStart,
      });
    });

  // autofocus
       window.onload = function() {
      setTimeout(function() {
          let that = document.getElementById("search")
          that.focus();
          // at end
          setTimeout(function(){ that.selectionStart = that.selectionEnd = ${
            this.states.searchCursorPos
          }; }, 0);
      }, 0);
   };
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

    // Apply link categories
    const relations = document.querySelectorAll(".relationships > .relationship");
    for(let rel of relations) {
        if (rel.__data__ && rel.__data__.properties && rel.__data__.properties.linkCategory) {
            rel.classList.add("link-" + rel.__data__.properties.linkCategory);
        }
    }

    </script>
    `;
  }

  getGraphWebViewHtml(
    libs: { neo4jlib: vscode.Uri | string; d3lib: vscode.Uri | string },
    data: string,
  ) {
    return `
<html lang="en">
  <head>
    <title>Obsidian Visualizer</title>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" /> 
    <style> 
    :root {
        --background-color: var(--vscode-editor-background, #1e1e1e);
        --text-color: var(--vscode-editor-foreground, #cccccc);
        --accent-color: var(--vscode-button-background, #007acc);
        --accent-hover: var(--vscode-button-hoverBackground, #0062a3);
        --border-color: var(--vscode-widget-border, #454545);
        --panel-bg: var(--vscode-editorWidget-background, #252526);
        
        /* Link Colors */
        --link-forward: #4caf50; /* Green */
        --link-backward: #f44336; /* Red */
        --link-bidirectional: #9c27b0; /* Purple */
        --link-default: #a5abb6;
    }

    body {
      padding: 0;
      margin: 0;
      background-color: var(--background-color);
      color: var(--text-color);
      font-family: var(--vscode-font-family);
      overflow: hidden;
    }
    
    .container {
      height: 100vh;
      display: flex;
      flex-direction: column;
    }
    
    .neo4jd3 {
      height: 100%;
      width: 100%;
    }

    /* Config Panel */
    .config-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        background: var(--panel-bg);
        border: 1px solid var(--border-color);
        padding: 15px;
        border-radius: 8px;
        z-index: 1000;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        min-width: 200px;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    .config-panel h3 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 14px;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 5px;
    }

    .control-group {
        margin-bottom: 15px;
    }
    
    .toggle-container {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
    }

    .label-text {
        margin-left: 10px;
        font-size: 13px;
    }

    /* Legend */
    .legend-item {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
        font-size: 12px;
    }
    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        margin-right: 8px;
    }

    /* Switch Style */
    .switch {
      position: relative;
      display: inline-block;
      width: 34px;
      height: 20px;
    }

    .switch input { 
      opacity: 0;
      width: 0;
      height: 0;
    }

    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      -webkit-transition: .4s;
      transition: .4s;
    }

    .slider:before {
      position: absolute;
      content: "";
      height: 14px;
      width: 14px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      -webkit-transition: .4s;
      transition: .4s;
    }

    input:checked + .slider {
      background-color: var(--accent-color);
    }

    input:focus + .slider {
      box-shadow: 0 0 1px var(--accent-color);
    }

    input:checked + .slider:before {
      -webkit-transform: translateX(14px);
      -ms-transform: translateX(14px);
      transform: translateX(14px);
    }

    .slider.round {
      border-radius: 20px;
    }

    .slider.round:before {
      border-radius: 50%;
    }

    /* Search */
    .search-input {
        width: 100%;
        padding: 8px;
        background: var(--vscode-input-background, #3c3c3c);
        color: var(--vscode-input-foreground, #cccccc);
        border: 1px solid var(--vscode-input-border, #3c3c3c);
        border-radius: 4px;
        box-sizing: border-box;
    }
    .search-input:focus {
        outline: 1px solid var(--accent-color);
    }

    /* Graph */
    .blur {
      opacity: 0.3;
    }
    
    .text { 
      font-size: 12px;
      fill: var(--text-color);
    } 

    .highlighted {  
      stroke: var(--accent-color) !important;
      stroke-width: 2px;
    }
    
    .node {
        stroke: var(--border-color);
        stroke-width: 1px;
    }

    /* Link Styles */
    .relationship {
        stroke: var(--link-default);
    }
    .relationship path {
        stroke: var(--link-default);
    }
    .link-forward path {
        stroke: var(--link-forward) !important;
    }
    .link-backward path {
        stroke: var(--link-backward) !important;
    }
    .link-bidirectional path {
        stroke: var(--link-bidirectional) !important;
    }
    </style>
  </head>
  <body>
  <div class="container">  
    <h3>Graph view</h3>
    ${this.generateConfigPanel()}
    <div class="graph"></div> 
  </div>

    <script src="${libs.neo4jlib}"></script>
    <script src="${libs.d3lib}"></script> 
    <script> 
      // vscode already acquired in config panel script
       
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
  </body>
</html>
  `;
  }
}
