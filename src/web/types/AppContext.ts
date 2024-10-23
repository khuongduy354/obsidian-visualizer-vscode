import { GraphCreator } from "../GraphCreator";
import { URIHandler } from "../URIHandler";
import { ObsiFilesTracker } from "../ObsiFilesTracker";
import { GraphOption } from "../types/GraphOption";
import * as vscode from "vscode";

export type AppContext = {
  graphBuilder: GraphCreator;
  uriHandler: URIHandler;
  globalGraph: any;
  graphOption: GraphOption;
  watcher: vscode.FileSystemWatcher;
  obsiFilesTracker: ObsiFilesTracker;
};
