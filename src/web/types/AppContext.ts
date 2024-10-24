import { GraphCreator } from "../GraphCreator";
import { URIHandler } from "../URIHandler";
import { ObsiFilesTracker } from "../ObsiFilesTracker";
import { GraphOption } from "../types/GraphOption";
import * as vscode from "vscode";
import { FullNeo4jFormat } from "./Neo4j";

type AppContext = {
  graphBuilder: GraphCreator;
  uriHandler: URIHandler;
  globalGraph: FullNeo4jFormat;
  graphOption: GraphOption;
  watcher: vscode.FileSystemWatcher;
  obsiFilesTracker: ObsiFilesTracker;
};
