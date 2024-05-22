import * as vscode from "vscode";
import { URIHandler } from "./URIHandler";
import { ObsiFile, ObsiFilesTracker } from "./ObsiFilesTracker";

type GraphOption = {
  forwardLinks: boolean;
  backwardLinks: boolean;
  attachments: boolean;
};

export class GraphCreator {
  localGraph: Map<string, Array<string>> = new Map();
  localBacklinks: Map<string, Array<string>> = new Map();
  globalNeoFormat: any = null;
  localNeoFormat: any = null;
  globalGraph: Map<string, Array<string>> = new Map();
  mdList: string[] = [];
  uriHandler: URIHandler;
  obsiFilesTracker: ObsiFilesTracker;

  constructor(
    obsiFilesTracker: ObsiFilesTracker,
    uriHandler: URIHandler = new URIHandler()
  ) {
    this.uriHandler = uriHandler;
    this.obsiFilesTracker = obsiFilesTracker;
  }

  async readDirRecursively(start: string, currentParent: string) {
    // let path = currentParent + start + "/";
    let filePath = URIHandler.joinPath(currentParent, start);

    let entries = await vscode.workspace.fs.readDirectory(
      this.getFullUri(filePath)
    );

    for (let entry of entries) {
      if (entry[1] === 1) {
        const isMd = entry[0].split(".").pop() === "md";
        if (isMd) this.mdList.push(URIHandler.joinPath(filePath, entry[0]));
      }
      if (entry[1] === 2) {
        await this.readDirRecursively(entry[0], filePath);
      }
    }
  }

  getFullUri(path: string, isRel = true) {
    return this.uriHandler.getFullURI(path, isRel);
  }

  parseNeoGlobal() {
    const target = this.obsiFilesTracker;

    let result: any = {
      nodes: [],
      relationships: [],
    };

    for (const [file, forwardFiles] of target.forwardLinks.entries()) {
      // node creation
      result.nodes.push({
        id: file.path,
        labels: ["File"],
        properties: {
          fileFs: file.fullPath,
        },
      });

      // forward links
      for (let forwardFile of forwardFiles) {
        // TODO: this make sure that relation to non-exist files must point to a node
        // file not exist check
        if (!target.files.has(forwardFile.path)) {
          result.nodes.push({
            id: forwardFile,
            labels: ["File"],
            properties: {
              fileFs: forwardFile.path,
            },
          });
          // target.set(relNode, []);
        }

        result.relationships.push({
          id: file.path + forwardFile.path,
          type: "LINKS_TO",
          startNode: file,
          endNode: forwardFile,
          properties: {},
        });
      }
    }

    const final = {
      results: [
        {
          columns: ["File"],
          data: [
            {
              graph: {
                ...result,
              },
            },
          ],
        },
      ],
    };

    return final;
    // see sample format in helper/sampleNeo4j.js
  }

  // async parseGlobalGraph() {
  //   const start = "/";
  //   this.mdList = [];

  //   await this.readDirRecursively(start, "");

  //   this.globalGraph = new Map();
  //   const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;

  //   for (let currentFile of this.mdList) {
  //     if (!this.globalGraph.has(currentFile)) {
  //       // get all links of current file
  //       const content = (
  //         await vscode.workspace.openTextDocument(this.getFullUri(currentFile))
  //       ).getText();
  //       const backLinks = [...content.toString().matchAll(linkRegex)];
  //       const filePaths = backLinks.map((backLink) => {
  //         return backLink[1];
  //       });

  //       // set global graph
  //       this.globalGraph.set(currentFile, filePaths);
  //     }
  //   }
  // }
  // async parseLocalGraph(start: string) {
  //   // for each file, insert into map in file_path-links_to_file_path format

  //   this.localGraph = new Map();
  //   let queue = [start];
  //   const linkRegex = /(?<!\!)\[\[(.*?)\]\]/g;

  //   while (queue.length > 0) {
  //     const currentFile = queue.pop();
  //     if (!currentFile) break;

  //     if (!this.localGraph.has(currentFile)) {
  //       let content = null;
  //       try {
  //         // get all links of current file
  //         content = (
  //           await vscode.workspace.openTextDocument(
  //             this.getFullUri(currentFile, false)
  //           )
  //         )
  //           .getText()
  //           .toString();
  //       } catch (err) {
  //         //empty file
  //         this.localGraph.set(currentFile, []);
  //         continue;
  //       }
  //       if (!content) continue;

  //       const backLinks = [...content.matchAll(linkRegex)];
  //       let filePaths = backLinks.map((backLink) => {
  //         return backLink[1];
  //       });

  //       // attempt resolving full path
  //       // const filePathsProm = filePaths.map(async (filePath) => {
  //       //   // path is absolute, no resolve
  //       //   if (this.obsiFilesTracker.isAbs(filePath)) return filePath;

  //       //   // already available
  //       //   let fullPath = this.obsiFilesTracker.getFullPath(filePath);
  //       //   if (fullPath !== undefined) return fullPath;

  //       //   // previously scan all but failed, skip
  //       //   if (this.obsiFilesTracker.failedScans.has(filePath)) return undefined;

  //       //   await this.obsiFilesTracker.scanFullPath();
  //       //   fullPath = this.obsiFilesTracker.getFullPath(filePath);
  //       //   if (fullPath !== undefined) return fullPath;

  //       //   // scan all but failed
  //       //   this.obsiFilesTracker.failedScans.add(filePath);
  //       //   return undefined;
  //       // });

  //       // filePaths = (await Promise.all(filePathsProm)).filter(
  //       //   (fp) => fp !== undefined
  //       // ) as string[];

  //       queue = queue.concat(filePaths);

  //       // set backlinks
  //       // TODO: bug when filename overlap, but since i skip absolute path above, it should be fine
  //       filePaths.forEach((filePath) => {
  //         if (!this.localBacklinks.has(filePath)) {
  //           this.localBacklinks.set(filePath, [currentFile]);
  //         } else {
  //           this.localBacklinks.get(filePath)?.push(currentFile);
  //         }
  //       });

  //       // set this file forward link
  //       this.localGraph.set(currentFile, filePaths);
  //     }
  //   }
  //   console.log("Local graph: ", this.localGraph.size);
  // }

  parseNeoLocal(
    localPath: string,
    options: GraphOption | undefined = undefined
  ) {
    const startFile = this.obsiFilesTracker.files.get(localPath);

    if (startFile === undefined || startFile === null)
      throw new Error("File not exist or tracked, please rerun extension.");

    // TODO: add options
    if (options !== undefined) {
    }

    // base format
    let result: any = {
      nodes: [
        {
          id: startFile.path,
          labels: ["File"],
          properties: {
            fileFs: startFile.fullPath,
          },
        },
      ],
      relationships: [],
    };

    // duplicate check, I don't use a Set, cuz check exist cost more than Map
    const addedNodes = new Map<ObsiFile, boolean>();
    const addedRels = new Map<string, boolean>();

    // FORWARD LINKS
    const forwardFiles =
      this.obsiFilesTracker.forwardLinks.get(startFile) || [];
    // if (forwardFiles === undefined || forwardFiles === null)
    //   throw new Error("File not exist or tracked, please rerun extension.");

    for (let forwardFile of forwardFiles) {
      // node
      if (!addedNodes.has(forwardFile)) {
        result.nodes.push({
          id: forwardFile.path,
          labels: ["File"],
          properties: {
            fileFs: forwardFile.fullPath,
          },
        });
        addedNodes.set(forwardFile, true);
      }

      // forward link
      const linkId = startFile.path + forwardFile.path;
      if (!addedRels.has(linkId)) {
        result.relationships.push({
          id: linkId,
          type: "LINKS_TO",
          startNode: startFile.path,
          endNode: forwardFile.path,
          properties: {},
        });
        addedRels.set(linkId, true);
      }
    }

    // BACKLINKS
    const backFiles = this.obsiFilesTracker.backLinks.get(startFile) || [];
    // if (!Array.isArray(backFiles))

    for (const backFile of backFiles) {
      // node
      if (!addedNodes.has(backFile)) {
        result.nodes.push({
          id: backFile.path,
          labels: ["File"],
          properties: {
            fileFs: backFile.fullPath,
          },
        });
        addedNodes.set(backFile, true);
      }

      // backlinks
      const linkId = backFile.path + startFile.path;
      if (!addedRels.has(linkId)) {
        result.relationships.push({
          id: linkId,
          type: "LINKS_TO",
          startNode: backFile.path,
          endNode: startFile.fullPath,
          properties: {},
        });
        addedRels.set(linkId, true);
      }
    }

    const final = {
      results: [
        {
          columns: ["File"],
          data: [
            {
              graph: {
                ...result,
              },
            },
          ],
        },
      ],
    };

    return final;
  }
}
