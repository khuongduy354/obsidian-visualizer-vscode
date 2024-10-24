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
  watcher: vscode.FileSystemWatcher;
  obsiFilesTracker: ObsiFilesTracker;

  constructor(
    graphBuilder: GraphCreator,
    uriHandler: URIHandler,
    globalGraph: FullNeo4jFormat,
    graphOption: GraphOption,
    watcher: vscode.FileSystemWatcher,
    obsiFilesTracker: ObsiFilesTracker
  ) {
    this.graphBuilder = graphBuilder;
    this.uriHandler = uriHandler;
    this.globalGraph = globalGraph;
    this.graphOption = graphOption;
    this.watcher = watcher;
    this.obsiFilesTracker = obsiFilesTracker;
  }
}
