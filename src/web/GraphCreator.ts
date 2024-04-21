import * as vscode from "vscode";

export class GraphCreator {
  localGraph: Map<string, Array<string>>;
  globalNeoFormat: any = null;
  localNeoFormat: any = null;
  scheme: string;
  globalGraph: Map<string, Array<string>>;
  mdList: string[] = [];

  constructor(scheme: string) {
    this.localGraph = new Map();
    this.globalGraph = new Map();
    this.scheme = scheme;
  }
  joinPath(...args: string[]) {
    let res = "";
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "") continue;
      if (!args[i].startsWith("/") && !res.endsWith("/")) {
        args[i] = "/" + args[i];
      }
      res += args[i];
    }

    return res;
  }
  async readDirRecursively(start: string, currentParent: string) {
    // let path = currentParent + start + "/";
    let filePath = this.joinPath(currentParent, start);

    let entries = await vscode.workspace.fs.readDirectory(
      vscode.Uri.from({
        scheme: this.scheme,
        path: filePath,
      })
    );

    for (let entry of entries) {
      if (entry[1] === 1) {
        const isMd = entry[0].split(".").pop() === "md";
        if (isMd) this.mdList.push(this.joinPath(filePath, entry[0]));
      }
      if (entry[1] === 2) {
        await this.readDirRecursively(entry[0], filePath);
      }
    }
  }

  getFullUri(fsPath: string) {
    return vscode.Uri.from({ scheme: this.scheme, path: fsPath });
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
        // get all links of current file
        const content = (
          await vscode.workspace.openTextDocument(this.getFullUri(currentFile))
        ).getText();
        const backLinks = [...content.toString().matchAll(linkRegex)];
        const filePaths = backLinks.map((backLink) => {
          return backLink[1];
        });

        // add to queue
        queue = queue.concat(filePaths);

        this.localGraph.set(currentFile, filePaths);
      }
    }
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
