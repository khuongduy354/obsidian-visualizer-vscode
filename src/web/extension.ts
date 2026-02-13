import * as vscode from "vscode";
import { GraphOption } from "./types/GraphOption";
import { GraphWebView } from "./webview/GraphWebView";
import { startup } from "./helper/startup";
import { setupCommands } from "./commands";
import { LinkCompletionProvider } from "./LinkCompletionProvider";

export function activate(context: vscode.ExtensionContext) {
  try {
    let appContext = startup();
    let commands = setupCommands(appContext, context);

    // Register link completion provider for markdown files
    const linkCompletionProvider = new LinkCompletionProvider(
      appContext.obsiFilesTracker,
    );
    const completionDisposable =
      vscode.languages.registerCompletionItemProvider(
        { language: "markdown", scheme: "*" },
        linkCompletionProvider,
        "[", // trigger on [
        "(", // trigger on (
      );

    context.subscriptions.push(
      commands.forceWorkspaceParseCommand,
      commands.showLocalGraphCommand,
      commands.showGlobalGraphCommand,
      appContext.obsiFilesTracker,
      completionDisposable,
    );

    // push watcher service if available
    if (appContext.watcherService) {
      context.subscriptions.push(appContext.watcherService);
    }

    // dispose AppContext event emitters on deactivation
    context.subscriptions.push({ dispose: () => appContext.dispose() });
  } catch (e) {
    console.error(e);
  }
}

export function deactivate() {}
