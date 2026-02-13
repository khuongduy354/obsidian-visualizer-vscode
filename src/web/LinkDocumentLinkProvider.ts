import * as vscode from "vscode";
import { ObsiFilesTracker } from "./ObsiFilesTracker";

/**
 * Provides Ctrl+Click navigation for [[]] and []() markdown links
 * Resolves links using ObsiFilesTracker and opens the target file
 */
export class LinkDocumentLinkProvider implements vscode.DocumentLinkProvider {
  constructor(private obsiFilesTracker: ObsiFilesTracker) {}

  async provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): Promise<vscode.DocumentLink[]> {
    const links: vscode.DocumentLink[] = [];
    const text = document.getText();

    // Match [[...]] wiki-style links
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    let match;

    while ((match = wikiLinkRegex.exec(text)) !== null) {
      const linkText = match[1];
      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      // Resolve the link
      const resolvedPath = await this.obsiFilesTracker.resolveFile(linkText);

      if (resolvedPath) {
        const uri = this.obsiFilesTracker.uriHandler.getFullURI(resolvedPath);
        if (uri) {
          const docLink = new vscode.DocumentLink(range, uri);
          docLink.tooltip = `Open ${linkText}`;
          links.push(docLink);
        }
      }
    }

    // Match []() markdown-style links
    const mdLinkRegex = /\[([^\]]*)\]\(([^\)]+)\)/g;

    while ((match = mdLinkRegex.exec(text)) !== null) {
      const linkPath = match[2];

      // Skip external links
      if (linkPath.startsWith("http://") || linkPath.startsWith("https://")) {
        continue;
      }

      const startPos = document.positionAt(match.index);
      const endPos = document.positionAt(match.index + match[0].length);
      const range = new vscode.Range(startPos, endPos);

      // Resolve the link
      const resolvedPath = await this.obsiFilesTracker.resolveFile(linkPath);

      if (resolvedPath) {
        const uri = this.obsiFilesTracker.uriHandler.getFullURI(resolvedPath);
        if (uri) {
          const docLink = new vscode.DocumentLink(range, uri);
          docLink.tooltip = `Open ${linkPath}`;
          links.push(docLink);
        }
      }
    }

    return links;
  }
}
