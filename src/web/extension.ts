import * as vscode from "vscode";
import { GraphOption } from "./types/GraphOption";
import { GraphWebView } from "./webview/GraphWebView";
import { startup } from "./helper/startup";
import { setupCommands } from "./commands";

export function activate(context: vscode.ExtensionContext) {
  try {
    let appContext = startup();
    let commands = setupCommands(appContext, context);

    // commands

    context.subscriptions.push(
      commands.forceWorkspaceParseCommand,
      commands.showLocalGraphCommand,
      commands.showGlobalGraphCommand,
      appContext.watcher,
      appContext.obsiFilesTracker
    );
  } catch (e) {
    console.error(e);
  }
}

export function deactivate() {}
