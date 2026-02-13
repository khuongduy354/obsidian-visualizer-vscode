import { GraphCreator } from "./GraphCreator";
import { URIHandler } from "./URIHandler";
import { ObsiFilesTracker } from "./ObsiFilesTracker";
import { GraphOption } from "./types/GraphOption";
import { FullNeo4jFormat } from "./types/Neo4j";
import * as vscode from "vscode";

export class AppContext {
  graphBuilder: GraphCreator;
  uriHandler: URIHandler;
  globalGraph: FullNeo4jFormat;
  graphOption: GraphOption;
  obsiFilesTracker: ObsiFilesTracker;

  // WatcherService is set after construction (circular dep: it needs AppContext)
  watcherService?: vscode.Disposable;

  constructor(
    graphBuilder: GraphCreator,
    uriHandler: URIHandler,
    globalGraph: FullNeo4jFormat,
    graphOption: GraphOption,
    obsiFilesTracker: ObsiFilesTracker,
  ) {
    this.graphBuilder = graphBuilder;
    this.uriHandler = uriHandler;
    this.globalGraph = globalGraph;
    this.graphOption = graphOption;
    this.obsiFilesTracker = obsiFilesTracker;
  }

  setGraphOption(option: GraphOption) {
    this.graphOption = option;
  }
}
