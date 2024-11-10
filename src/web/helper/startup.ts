import { URIHandler } from "../URIHandler";
import { ObsiFilesTracker } from "../ObsiFilesTracker";
import { setWatcher } from "../VSCodeWatcher";
import { GraphCreator } from "../GraphCreator";
import { GraphOption } from "../types/GraphOption";
import * as vscode from "vscode";
// import { AppContext } from "../types/AppContext";
import { AppContext } from "../AppContext";

export function startup(): AppContext {
  // initial run
  const uriHandler = new URIHandler();
  const obsiFilesTracker = new ObsiFilesTracker();
  const watcher = setWatcher(obsiFilesTracker);

  // init graph builder
  const graphBuilder = new GraphCreator(obsiFilesTracker);
  let globalGraph = graphBuilder.simplifiedToFullGraph({
    nodes: [],
    relationships: [],
  });
  let graphOption: GraphOption = { forwardLinks: true, backwardLinks: true };

  // creates appContext
  const appContext = new AppContext(
    graphBuilder,
    uriHandler,
    globalGraph,
    graphOption,
    watcher,
    obsiFilesTracker
  );

  // init workspace scan
  obsiFilesTracker
    .readAllWorkspaceFiles()
    .then(() => {
      console.log("Finished reading all workspace files");
      obsiFilesTracker.displayWorkspace();
      appContext.globalGraph = graphBuilder.parseNeoGlobal();
      console.log("Finished parsing global graph", globalGraph);
    })
    .catch((err) => {
      console.error("FILE READ ERR: ", err);
    });

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
  return appContext;
}
