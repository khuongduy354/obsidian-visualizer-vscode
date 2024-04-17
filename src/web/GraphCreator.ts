import * as vscode from "vscode";
export class GraphCreator {
  localGraph: Map<vscode.Uri, Array<vscode.Uri>>;
  d3Format: any = null;

  constructor() {
    this.localGraph = new Map();
  }

  getScheme(): string {
    // Check if the runtime environment is VS Code on the web
    if (vscode.env.appHost === "web") {
      return "vscode-web";
    } else {
      return "file"; // On desktop, use the 'file' scheme
    }
  }
  async parseLocalGraph(start: vscode.Uri) {
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
          await vscode.workspace.openTextDocument(currentFile)
        ).getText();
        const backLinks = [...content.toString().matchAll(linkRegex)];
        const filePaths = backLinks.map((backLink) => {
          return vscode.Uri.parse("vscode-test-web://" + backLink[1]);
        });

        // add to queue
        queue = queue.concat(filePaths);

        this.localGraph.set(currentFile, filePaths);
      }
    }
  }

  parseD3Format() {
    let result: any = {
      nodes: [],
      relationships: [],
    };

    for (const [key, value] of this.localGraph.entries()) {
      const currNode = key.fsPath;
      result.nodes.push({
        id: currNode,
        labels: ["File"],
        properties: {
          fileUri: key,
        },
      });

      for (let relUri of value) {
        const relNode = relUri.fsPath;
        result.relationships.push({
          id: currNode + relNode,
          type: "LINKS_TO",
          startNode: currNode,
          endNode: relNode,
          properties: {},
        });
      }
    }

    this.d3Format = {
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
  }
  getD3Format() {
    if (!this.d3Format) this.parseD3Format();

    return this.d3Format;
  }

  getLocalGraphMap() {
    return this.localGraph;
  }

  // async getLocalGraph(filePath: vscode.Uri) {
  // // 1. read file, add node, add relationship,
  // // 2. queue every links of that file
  // // 3. repeat 1 and 2 until queue is empty
  // // make sure each file is visited once

  // const visitedFiles = new Set<string>();
  // const linkRegex = /\[\[(.*?)\]\]/g;

  // // starting file
  // const queue = [filePath.fsPath];

  // while (queue.length > 0) {
  //   const currentFile = queue.pop();
  //   if (!currentFile) break;

  //   // ensure file is visited once
  //   if (!visitedFiles.has(currentFile)) {
  //     visitedFiles.add(currentFile);

  //     // read file
  //     const content = (
  //       await vscode.workspace.fs.readFile(vscode.Uri.file(currentFile))
  //     ).toString();

  //     // add node

  //     //  add relationship
  //     const backLinks = [...content.matchAll(linkRegex)];

  //     for (let backLink of backLinks) {
  //       // 0 is the full match, 1 is the first group (content inside the [[]])
  //       const link = backLink[1];

  //       // add relationship

  //       // queue every links of that file

  //       // const file = resolveFile(link);
  //       // if (!visitedFiles.has(file)) {
  //       // visitedFiles.add(file);
  //       // queue.push(link);
  //       //   updateLocalGraph(vscode.Uri.file(link));
  //       // }
  //     }
  //   }
  // }
  // }

  //   getLocalGraph(filePath: string) {}
}

// D3.js data format
// {
//     "nodes": [
//         {
//             "id": "1",
//             "labels": ["User"],
//             "properties": {
//                 "userId": "eisman"
//             }
//         },
//         {
//             "id": "8",
//             "labels": ["Project"],
//             "properties": {
//                 "name": "neo4jd3",
//                 "title": "neo4jd3.js",
//                 "description": "Neo4j graph visualization using D3.js.",
//                 "url": "https://eisman.github.io/neo4jd3"
//             }
//         }
//     ],
//     "relationships": [
//         {
//             "id": "7",
//             "type": "DEVELOPES",
//             "startNode": "1",
//             "endNode": "8",
//             "properties": {
//                 "from": 1470002400000
//             },
//             "source": "1",
//             "target": "8",
//             "linknum": 1
//         }
//     ]
// }
