import * as vscode from "vscode";
import { ObsiFilesTracker } from "./ObsiFilesTracker";

/**
 * Provides autocomplete for [[]] and []() markdown links
 * Suggests files from the workspace with intelligent resolution
 */
export class LinkCompletionProvider implements vscode.CompletionItemProvider {
  constructor(private obsiFilesTracker: ObsiFilesTracker) {}

  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext,
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    // Check if we're inside [[ or [](
    const wikiLinkMatch = linePrefix.match(/\[\[([^\]]*)?$/);
    const mdLinkMatch = linePrefix.match(/\]\(([^\)]*)?$/);

    if (!wikiLinkMatch && !mdLinkMatch) {
      return undefined;
    }

    const isWikiLink = !!wikiLinkMatch;
    const currentInput = isWikiLink
      ? wikiLinkMatch![1] || ""
      : mdLinkMatch![1] || "";

    // Get all tracked files
    const completions: vscode.CompletionItem[] = [];

    for (const [
      fap,
      obsiFiles,
    ] of this.obsiFilesTracker.forwardLinks.entries()) {
      const filename = this.obsiFilesTracker.extractFileName(fap);
      const filenameNoExt = filename.replace(/\.md$/, "");

      const item = new vscode.CompletionItem(
        filenameNoExt,
        vscode.CompletionItemKind.File,
      );

      // Detail shows full path for disambiguation
      item.detail = fap;

      // Insert text depends on link type
      if (isWikiLink) {
        // For [[]], insert just the filename (obsidian style)
        item.insertText = filenameNoExt;
      } else {
        // For [](), insert relative or absolute path
        item.insertText = fap;
      }

      // Sort by relevance: exact match > starts with > contains
      if (filenameNoExt.toLowerCase() === currentInput.toLowerCase()) {
        item.sortText = "0_" + filenameNoExt;
      } else if (
        filenameNoExt.toLowerCase().startsWith(currentInput.toLowerCase())
      ) {
        item.sortText = "1_" + filenameNoExt;
      } else if (
        filenameNoExt.toLowerCase().includes(currentInput.toLowerCase())
      ) {
        item.sortText = "2_" + filenameNoExt;
      } else {
        item.sortText = "3_" + filenameNoExt;
      }

      // Filter to only show relevant matches
      if (
        currentInput === "" ||
        filenameNoExt.toLowerCase().includes(currentInput.toLowerCase()) ||
        fap.toLowerCase().includes(currentInput.toLowerCase())
      ) {
        completions.push(item);
      }
    }

    return completions;
  }
}
