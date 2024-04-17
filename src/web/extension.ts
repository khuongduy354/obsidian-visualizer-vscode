// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { GraphCreator } from "./GraphCreator";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log("what if i change ");

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json

  // let disposable = vscode.commands.registerCommand(
  //   "obsidian-visualizer.helloWorld",
  //   () => {
  //     // The code you place here will be executed every time your command is executed

  //     // Display a message box to the user
  //     vscode.window.showInformationMessage("Change");
  //   }
  // );

  let disposable2 = vscode.commands.registerTextEditorCommand(
    "obsidian-visualizer.showLocalGraph",
    (textEditor, edit) => {
      // TODO, make sure file is markdown
      // textEditor.document.uri;

      const gCreator = new GraphCreator();
      // console.log(textEditor.document.uri);
      gCreator.parseLocalGraph(textEditor.document.uri).then(() => {
        console.log("done parsing");
        console.log(gCreator.getLocalGraphMap().size);
      });
    }
  );

  context.subscriptions.push(disposable2);
}

// This method is called when your extension is deactivated
export function deactivate() {}
