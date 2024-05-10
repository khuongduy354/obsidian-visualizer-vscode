import * as vscode from "vscode";
import { URIHandler } from "./URIHandler";
import { ObsiFilesTracker } from "./ObsiFilesTracker";

export class GraphCreator {
  localGraph: Map<string, Array<string>> = new Map();
  localBacklinks: Map<string, Array<string>> = new Map();
  globalNeoFormat: any = null;
  localNeoFormat: any = null;
  globalGraph: Map<string, Array<string>> = new Map();
  mdList: string[] = [];
  uriHandler: URIHandler;
  obsiFilesTracker: ObsiFilesTracker;

  constructor(uriHandler: URIHandler = new URIHandler()) {
    this.uriHandler = uriHandler;
    this.obsiFilesTracker = new ObsiFilesTracker(uriHandler);
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

  async parseGlobalGraph() {
    const start = "/";
    this.mdList = [];

    await this.readDirRecursively(start, "");

    this.globalGraph = new Map();
    const linkRegex = /\[\[(.*?)\]\]/g;

    for (let currentFile of this.mdList) {
      if (!this.globalGraph.has(currentFile)) {
        // get all links of current file
        const content = (
          await vscode.workspace.openTextDocument(this.getFullUri(currentFile))
        ).getText();
        const backLinks = [...content.toString().matchAll(linkRegex)];
        const filePaths = backLinks.map((backLink) => {
          return backLink[1];
        });

        // directory scan
        this.globalGraph.set(currentFile, filePaths);
      }
    }
  }
  async parseLocalGraph(start: string) {
    // for each file, insert into map in file_path-links_to_file_path format

    this.localGraph = new Map();
    let queue = [start];
    const linkRegex = /\[\[(.*?)\]\]/g;

    while (queue.length > 0) {
      const currentFile = queue.pop();
      if (!currentFile) break;

      if (!this.localGraph.has(currentFile)) {
        let content = null;
        try {
          // get all links of current file
          content = (
            await vscode.workspace.openTextDocument(
              this.getFullUri(currentFile, false)
            )
          )
            .getText()
            .toString();
        } catch (err) {
          //empty file
          this.localGraph.set(currentFile, []);
          continue;
        }
        if (!content) continue;

        const backLinks = [...content.matchAll(linkRegex)];
        let filePaths = backLinks.map((backLink) => {
          return backLink[1];
        });

        // attempt resolving full path
        // const filePathsProm = filePaths.map(async (filePath) => {
        //   // path is absolute, no resolve
        //   if (this.obsiFilesTracker.isAbs(filePath)) return filePath;

        //   // already available
        //   let fullPath = this.obsiFilesTracker.getFullPath(filePath);
        //   if (fullPath !== undefined) return fullPath;

        //   // previously scan all but failed, skip
        //   if (this.obsiFilesTracker.failedScans.has(filePath)) return undefined;

        //   await this.obsiFilesTracker.scanFullPath();
        //   fullPath = this.obsiFilesTracker.getFullPath(filePath);
        //   if (fullPath !== undefined) return fullPath;

        //   // scan all but failed
        //   this.obsiFilesTracker.failedScans.add(filePath);
        //   return undefined;
        // });

        // filePaths = (await Promise.all(filePathsProm)).filter(
        //   (fp) => fp !== undefined
        // ) as string[];

        queue = queue.concat(filePaths);

        // set backlinks
        // TODO: bug when filename overlap, but since i skip absolute path above, it should be fine
        filePaths.forEach((filePath) => {
          if (!this.localBacklinks.has(filePath)) {
            this.localBacklinks.set(filePath, [currentFile]);
          } else {
            this.localBacklinks.get(filePath)?.push(currentFile);
          }
        });

        // set this file forward link
        this.localGraph.set(currentFile, filePaths);
      }
    }
    console.log("Local graph: ", this.localGraph.size);
  }

  parseNeoFormat(isLocal = true) {
    try {
      const target = isLocal ? this.localGraph : this.globalGraph;

      let result: any = {
        nodes: [],
        relationships: [],
      };

      for (const [key, value] of target.entries()) {
        const currNode = key;
        result.nodes.push({
          id: currNode,
          labels: ["File"],
          properties: {
            fileFs: currNode,
          },
        });

        for (let relUri of value) {
          const relNode = relUri;
          if (!target.has(relNode)) continue;
          result.relationships.push({
            id: currNode + relNode,
            type: "LINKS_TO",
            startNode: currNode,
            endNode: relNode,
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

      if (isLocal) {
        this.localNeoFormat = final;
      } else {
        this.globalNeoFormat = final;
      }

      // let sample = {
      //   nodes: [
      //     {
      //       id: "1",
      //       labels: ["User"],
      //       properties: {
      //         userId: "eisman",
      //       },
      //     },
      //     {
      //       id: "8",
      //       labels: ["Project"],
      //       properties: {
      //         name: "neo4jd3",
      //         title: "neo4jd3.js",
      //         description: "Neo4j graph visualization using D3.js.",
      //         url: "https://eisman.github.io/neo4jd3",
      //       },
      //     },
      //   ],
      //   relationships: [
      //     {
      //       id: "7",
      //       type: "DEVELOPES",
      //       startNode: "1",
      //       endNode: "8",
      //       properties: {
      //         from: 1470002400000,
      //       },
      //       source: "1",
      //       target: "8",
      //       linknum: 1,
      //     },
      //   ],
      // };
    } catch (err) {
      console.log("Parseing neo error: ", err);
    }
  }
  getNeoFormat(isLocal = true) {
    if (isLocal) {
      if (!this.localNeoFormat) this.parseNeoFormat(true);
      return this.localNeoFormat;
    } else {
      if (!this.globalNeoFormat) this.parseNeoFormat(false);
      return this.globalNeoFormat;
    }
  }

  getLocalGraphMap() {
    return this.localGraph;
  }

  getGlobalGraphMap() {
    return this.globalGraph;
  }

  //   getLocalGraph(filePath: string) {}
}
