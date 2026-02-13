import * as vscode from "vscode";
import { WebviewEventHandlers } from "../types/WebViewEventHandlers";
import { GraphOption } from "../types/GraphOption";
import { AppContext } from "../AppContext";
import { CustomGraphRenderer } from "./CustomGraphRenderer";

export class GraphWebView {
  context: vscode.ExtensionContext;
  panel: vscode.WebviewPanel | undefined;
  graphOption: GraphOption;
  graphData: string = "";
  states: {
    searchInput: string;
    searchCursorPos: number;
    restoreFocusToSearch: boolean;
    graphSettings: Record<string, number>;
  } = {
    searchInput: "",
    searchCursorPos: 0,
    restoreFocusToSearch: false,
    graphSettings: {
      nodeSize: 6,
      fontSize: 14,
      repulsionForce: 2000,
      linkDistance: 300,
      linkStrength: 0.002,
      centerForce: 0.01,
      collisionRadius: 40,
      velocityDecay: 0.4,
    },
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

    // Load graph settings from VSCode config as defaults
    const config = vscode.workspace.getConfiguration(
      "obsidianVisualizer.graph",
    );
    this.states.graphSettings = {
      nodeSize: config.get("nodeSize", 6),
      fontSize: config.get("fontSize", 14),
      repulsionForce: config.get("repulsionForce", 2000),
      linkDistance: config.get("linkDistance", 300),
      linkStrength: config.get("linkStrength", 0.002),
      centerForce: config.get("centerForce", 0.01),
      collisionRadius: config.get("collisionRadius", 40),
      velocityDecay: config.get("velocityDecay", 0.4),
    };
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
    this.states.restoreFocusToSearch = false;
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

  loadLibs(_panel: vscode.WebviewPanel) {
    // No external libraries needed - renderer is fully self-contained
    return {};
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
            this.states.restoreFocusToSearch = true;
            if (onSearchChanged) onSearchChanged(message.searchFilter);
            this.refresh();
            break;
          case "onGraphSettingChanged": {
            // Just save state, live update already applied in webview
            const settingKey =
              message.setting as keyof typeof this.states.graphSettings;
            this.states.graphSettings[settingKey] = message.value;
            break;
          }
          default:
            console.error("Unknown command: ", message.command);
            break;
        }
      },
      undefined,
      this.context.subscriptions,
    );
  }

  getGraphConfig() {
    return JSON.stringify(this.states.graphSettings);
  }

  generateConfigPanel() {
    const s = this.states.graphSettings;
    return `   
        <div class="config-panel">
            <div class="control-group">
                <h3>Links</h3>
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
                <h3>Visual</h3>
                <div class="slider-container">
                    <label>Node Size: <span id="nodeSize-value">${s.nodeSize}</span></label>
                    <input type="range" id="nodeSize" min="2" max="50" value="${s.nodeSize}" step="1">
                </div>
                <div class="slider-container">
                    <label>Font Size: <span id="fontSize-value">${s.fontSize}</span></label>
                    <input type="range" id="fontSize" min="6" max="30" value="${s.fontSize}" step="1">
                </div>
            </div>
            
            <div class="control-group">
                <h3>Forces</h3>
                <div class="slider-container">
                    <label>Repulsion: <span id="repulsionForce-value">${s.repulsionForce}</span></label>
                    <input type="range" id="repulsionForce" min="100" max="5000" value="${s.repulsionForce}" step="100">
                </div>
                <div class="slider-container">
                    <label>Link Distance: <span id="linkDistance-value">${s.linkDistance}</span></label>
                    <input type="range" id="linkDistance" min="30" max="800" value="${s.linkDistance}" step="10">
                </div>
                <div class="slider-container">
                    <label>Link Strength: <span id="linkStrength-value">${s.linkStrength}</span></label>
                    <input type="range" id="linkStrength" min="0.001" max="0.1" value="${s.linkStrength}" step="0.001">
                </div>
                <div class="slider-container">
                    <label>Center Force: <span id="centerForce-value">${s.centerForce}</span></label>
                    <input type="range" id="centerForce" min="0" max="0.1" value="${s.centerForce}" step="0.01">
                </div>
                <div class="slider-container">
                    <label>Collision Radius: <span id="collisionRadius-value">${s.collisionRadius}</span></label>
                    <input type="range" id="collisionRadius" min="10" max="100" value="${s.collisionRadius}" step="5">
                </div>
                <div class="slider-container">
                    <label>Damping: <span id="velocityDecay-value">${s.velocityDecay}</span></label>
                    <input type="range" id="velocityDecay" min="0.1" max="0.9" value="${s.velocityDecay}" step="0.1">
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
                    <input value="${this.states.searchInput}" type="text" id="search" class="search-input" placeholder="Search files...">
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

    // Graph settings sliders
    const settingIds = ['nodeSize', 'fontSize', 'repulsionForce', 'linkDistance', 'linkStrength', 'centerForce', 'collisionRadius', 'velocityDecay'];
    settingIds.forEach(function(id) {
      const slider = document.getElementById(id);
      const valueSpan = document.getElementById(id + '-value');
      slider.addEventListener('input', function() {
        const value = parseFloat(this.value);
        valueSpan.textContent = value;
        
        // Update renderer live if it exists
        if (window.globalRenderer && window.globalRenderer.updateSettings) {
          const settings = {};
          settings[id] = value;
          window.globalRenderer.updateSettings(settings);
        }
        
        vscode.postMessage({
          command: "onGraphSettingChanged",
          setting: id,
          value: value
        });
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

    // Restore focus to search if we just came from a search refresh
    ${
      this.states.restoreFocusToSearch
        ? `
    (function() {
      var el = document.getElementById('search');
      if (el) {
        el.focus();
        var pos = ${this.states.searchCursorPos};
        setTimeout(function(){ el.selectionStart = el.selectionEnd = pos; }, 0);
      }
    })();
    `
        : ""
    }
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

  getGraphWebViewHtml(_libs: Record<string, never>, data: string) {
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
      width: 100vw;
      height: 100vh;
    }
    
    .container {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    h3 {
      margin: 10px 20px;
      flex-shrink: 0;
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

    /* Slider controls */
    .slider-container {
        margin-bottom: 12px;
    }
    
    .slider-container label {
        display: block;
        font-size: 12px;
        margin-bottom: 4px;
        color: var(--text-color);
    }
    
    .slider-container input[type="range"] {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--vscode-input-background, #3c3c3c);
        outline: none;
        -webkit-appearance: none;
    }
    
    .slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--accent-color);
        cursor: pointer;
    }
    
    .slider-container input[type="range"]::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--accent-color);
        cursor: pointer;
        border: none;
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

    /* Graph Styles */
    .graph {
        width: 100%;
        flex: 1;
        min-height: 0;
        position: relative;
    }
    
    svg {
        width: 100%;
        height: 100%;
        display: block;
    }
    
    .node {
        fill: var(--vscode-editor-foreground, #cccccc);
        stroke: var(--border-color);
        stroke-width: 2px;
        cursor: pointer;
        transition: all 0.2s;
    }
    
    .node.virtual {
        opacity: 0.3;
        fill: var(--vscode-descriptionForeground, #999);
    }
    
    .node.dimmed {
        opacity: 0.2;
    }
    
    .node.highlighted {
        stroke: var(--accent-color) !important;
        stroke-width: 3px;
        filter: drop-shadow(0 0 8px var(--accent-color));
    }
    
    .link {
        stroke-width: 2;
        fill: none;
        transition: all 0.2s;
    }
    
    .link-forward {
        stroke: var(--link-forward);
    }
    
    .link-backward {
        stroke: var(--link-backward);
    }
    
    .link-bidirectional {
        stroke: var(--link-bidirectional);
    }
    
    .link.dimmed {
        opacity: 0.2;
    }
    
    .link.highlighted {
        stroke-width: 3;
        filter: drop-shadow(0 0 5px currentColor);
    }
    
    .label {
        font-size: 12px;
        fill: var(--text-color);
        pointer-events: none;
        user-select: none;
    }
    
    .label.dimmed {
        opacity: 0.2;
    }
    
    /* Remove old neo4j styles */
    .blur {
      opacity: 0.3;
    }
    </style>
  </head>
  <body>
  <div class="container">  
    <h3>Graph view</h3>
    ${this.generateConfigPanel()}
    <div class="graph"></div> 
  </div>

    <script> 
      console.log("Script loading...");
      
      ${CustomGraphRenderer}
      
      // vscode already acquired in config panel script
      const graphData = ${data};
      
      // Get graph configuration from VSCode settings
      const graphConfig = ${this.getGraphConfig()};
      
      console.log("Graph data:", graphData);
      console.log("Graph config:", graphConfig);
      console.log("Container exists:", document.querySelector(".graph"));
      
      // Wait for DOM to be fully ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGraph);
      } else {
        initGraph();
      }
      
      function initGraph() {
        try {
          window.globalRenderer = new GraphRenderer('.graph', {
            ...graphConfig,
            onNodeDoubleClick: function(properties) {
              vscode.postMessage({
                command: 'onNodeDoubleClick',
                node: { properties: properties }
              });
            }
          });
          window.globalRenderer.render(graphData);
          console.log('Graph rendered successfully');
        } catch (err) {
          console.error('Graph init error:', err);
          document.querySelector('.graph').innerHTML =
            '<div style="color:#f44;padding:20px">Error: ' + err.message + '<br><pre>' + err.stack + '</pre></div>';
        }
      }
    </script> 
  </body>
</html>
  `;
  }
}
