import * as vscode from "vscode";
import { URIHandler } from "./URIHandler";
import { ObsiFile, ObsiFilesTracker } from "./ObsiFilesTracker";
import { GraphOption } from "./types/GraphOption";
import { FullNeo4jFormat, SimplifiedNeo4jFormat } from "./types/Neo4j";

export class GraphCreator {
  uriHandler: URIHandler;
  obsiFilesTracker: ObsiFilesTracker;

  onDidUpdateEmitter = new vscode.EventEmitter<void>();
  // disposables: vscode.Disposable[] = [this.onDidUpdateEmitter];

  constructor(
    obsiFilesTracker: ObsiFilesTracker,
    uriHandler: URIHandler = new URIHandler()
  ) {
    this.uriHandler = uriHandler;
    this.obsiFilesTracker = obsiFilesTracker;

    // i think these can be parse at runtime for more accuracy
    // this.disposables.push(
    //   this.obsiFilesTracker.onDidAddEmitter.event(this.parseNeoGlobal),
    //   this.obsiFilesTracker.onDidDeleteEmitter.event(this.parseNeoGlobal),
    //   this.obsiFilesTracker.onDidUpdateEmitter.event(this.parseNeoGlobal)
    // );
  }

  getFullUri(path: string) {
    return this.uriHandler.getFullURI(path);
  }

  parseNeoLocal(
    localPath: string,
    options: GraphOption | undefined = undefined
  ): FullNeo4jFormat {
    const startFile = this.uriHandler.getFullURI(localPath);

    if (startFile === undefined || startFile === null)
      throw new Error("File not exist or tracked, please rerun extension.");

    let parseFd = true;
    let parseBw = true;
    if (options !== undefined) {
      parseFd = options.forwardLinks;
      parseBw = options.backwardLinks;
    }

    // base format
    let result: SimplifiedNeo4jFormat = {
      nodes: [
        {
          id: startFile.path,
          labels: ["File"],
          properties: {
            fileFs: startFile,
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
      this.obsiFilesTracker.forwardLinks.get(startFile.path) || [];
    // if (forwardFiles === undefined || forwardFiles === null)
    //   throw new Error("File not exist or tracked, please rerun extension.");

    if (parseFd) {
      for (let forwardFile of forwardFiles) {
        // node
        if (!addedNodes.has(forwardFile)) {
          result.nodes.push({
            id: forwardFile.path,
            labels: ["File"],
            properties: {
              fileFs: forwardFile.fullURI,
              isFileVirtual: !this.obsiFilesTracker.forwardLinks.has(
                forwardFile.path
              ), // if keyed, file exist
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
    }

    // BACKLINKS
    const backFiles = this.obsiFilesTracker.backLinks.get(startFile.path) || [];
    console.log("Backlinks of: ", startFile, "is: ", backFiles);
    // if (!Array.isArray(backFiles))

    if (parseBw) {
      for (const backFile of backFiles) {
        // node
        if (!addedNodes.has(backFile)) {
          result.nodes.push({
            id: backFile.path,
            labels: ["File"],
            properties: {
              fileFs: backFile.fullURI,
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
            endNode: startFile.path,
            properties: {},
          });
          addedRels.set(linkId, true);
        }
      }
    }

    return this.simplifiedToFullGraph(result);
  }

  applySearchFilter(
    fullGraph: FullNeo4jFormat,
    searchFilter: string
  ): FullNeo4jFormat {
    let keyword = "";
    let searchMode: "filename" | "path" = "filename";
    searchFilter = searchFilter.trim();
    if (searchFilter === "") return fullGraph; // no search filter (empty string

    // extract keyword, searchMode
    if (searchFilter.startsWith("filename:")) {
      keyword = searchFilter.split("filename:")[1];
      searchMode = "filename";
    } else if (searchFilter.startsWith("path:")) {
      keyword = searchFilter.split("path:")[1];
      searchMode = "path";
    } else {
      keyword = searchFilter;
      searchMode = "filename";
    }

    // apply search
    let graph = fullGraph.results[0].data[0].graph;
    let newNodes = [];
    let newRel = [];

    for (let node of graph.nodes) {
      let searchTarget =
        searchMode === "filename"
          ? this.obsiFilesTracker.extractFileName(node.id)
          : node.id;
      if (searchTarget.includes(keyword)) {
        newNodes.push({ ...node });
        for (let rel of graph.relationships) {
          if (rel.startNode === node.id || rel.endNode === node.id) {
            newRel.push({ ...rel });
          }
        }
      }
    }

    return this.simplifiedToFullGraph({
      nodes: newNodes,
      relationships: newRel,
    });
  }
  simplifiedToFullGraph(graph: SimplifiedNeo4jFormat): FullNeo4jFormat {
    const newGraph = {
      results: [
        {
          columns: ["File"],
          data: [
            {
              graph: { ...graph }, // it's a deep copy
            },
          ],
        },
      ],
    };
    return newGraph;
  }

  parseNeoGlobal(
    graphOption: GraphOption | undefined = undefined
  ): FullNeo4jFormat {
    // graph option
    let parseFd = true;
    let parseBw = true;
    if (graphOption !== undefined) {
      parseFd = graphOption.forwardLinks;
      parseBw = graphOption.backwardLinks;
    }

    const target = this.obsiFilesTracker;
    let result: any = {
      nodes: [],
      relationships: [],
    };

    // backlinks
    if (parseBw) {
      for (let [file, backFiles] of this.obsiFilesTracker.backLinks.entries()) {
        for (let backFile of backFiles) {
          result.relationships.push({
            id: file + backFile.path,
            type: "LINKS_TO",
            startNode: file,
            endNode: backFile.path,
            properties: {
              isBacklink: true,
            },
          });
        }
      }
    }

    // node creation
    for (const [file, forwardFiles] of target.forwardLinks.entries()) {
      result.nodes.push({
        id: file,
        labels: ["File"],
        properties: {
          fileFs: this.uriHandler.getFullURI(file),
        },
      });

      // forward links
      for (let forwardFile of forwardFiles) {
        // this make sure that relation to non-exist files must point to a node
        // file not exist check
        if (!target.forwardLinks.has(forwardFile.path)) {
          result.nodes.push({
            id: forwardFile.path,
            labels: ["File"],
            properties: {
              fileFs: forwardFile.fullURI,
              isFileVirtual: true,
            },
          });
          // target.set(relNode, []);
        }

        // ignore if not parse forward
        if (parseFd) {
          result.relationships.push({
            id: file + forwardFile.path,
            type: "LINKS_TO",
            startNode: file,
            endNode: forwardFile.path,
            properties: {},
          });
        }
      }
    }

    return this.simplifiedToFullGraph(result);
    // see sample format in helper/sampleNeo4j.js
  }

  // dispose() {
  //   this.disposables.forEach((d) => d.dispose());
  //   this.disposables = [];
  // }
}
