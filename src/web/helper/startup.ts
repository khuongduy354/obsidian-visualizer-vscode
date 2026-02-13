import { URIHandler } from "../URIHandler";
import { ObsiFilesTracker } from "../ObsiFilesTracker";
import { WatcherService } from "../WatcherService";
import { GraphCreator } from "../GraphCreator";
import { GraphOption } from "../types/GraphOption";
import * as vscode from "vscode";
import { AppContext } from "../AppContext";

export function startup(): AppContext {
  // initial run
  const uriHandler = new URIHandler();
  const obsiFilesTracker = new ObsiFilesTracker();

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
    obsiFilesTracker,
  );

  // create centralized watcher (owns all event wiring + debounce + incremental updates)
  const watcherService = new WatcherService(
    obsiFilesTracker,
    graphBuilder,
    appContext,
  );
  appContext.watcherService = watcherService;

  // init workspace scan
  vscode.window.showInformationMessage(
    "ObsiVis: Reading all workspace files, only open graphs when ready!",
  );
  obsiFilesTracker
    .readAllWorkspaceFiles()
    .then(() => {
      vscode.window.showInformationMessage("Obsivis: Files read finished!!");
      console.log("Finished reading all workspace files");
      obsiFilesTracker.displayWorkspace();
      appContext.globalGraph = graphBuilder.parseNeoGlobal();
      console.log(
        "Finished parsing global graph",
        appContext.globalGraph.results[0].data[0].graph,
      );
    })
    .catch((err) => {
      console.error("FILE READ ERR: ", err);
    });

  return appContext;
}
