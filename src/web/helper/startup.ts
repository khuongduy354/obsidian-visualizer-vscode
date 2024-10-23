import { URIHandler } from "../URIHandler";
import { ObsiFilesTracker } from "../ObsiFilesTracker";
import { setWatcher } from "../VSCodeWatcher";
import { GraphCreator } from "../GraphCreator";
import { GraphOption } from "../GraphCreator";
import * as vscode from "vscode";
import { AppContext } from "../types/AppContext";

export function startup(): AppContext {
  // initial run
  const uriHandler = new URIHandler();
  const obsiFilesTracker = new ObsiFilesTracker();
  const watcher = setWatcher(obsiFilesTracker);

  // init workspace scan
  obsiFilesTracker
    .readAllWorkspaceFiles()
    .then(() => {
      vscode.window.showInformationMessage("Files read ");
    })
    .catch((err) => {
      console.error("FILE READ ERR: ", err);
    });

  // init global graph parse
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
  return {
    obsiFilesTracker,
    watcher,
    graphBuilder,
    globalGraph,
    graphOption,
    uriHandler,
  };
}
