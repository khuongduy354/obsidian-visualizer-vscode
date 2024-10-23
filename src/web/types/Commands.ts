import * as vscode from "vscode";
export type Commands = {
  showLocalGraphCommand: vscode.Disposable;
  showGlobalGraphCommand: vscode.Disposable;
  forceWorkspaceParseCommand: vscode.Disposable;
};
