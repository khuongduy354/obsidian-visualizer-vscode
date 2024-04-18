import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { GraphCreator } from "../../GraphCreator";
// import * as myExtension from '../../extension';

suite("Web Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Sample test", () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});

suite("Graph Creator test", () => {
  const gCreator = new GraphCreator();
  const fsPath =
    "/static/devextensions/src/web/test/suite/asset/sample-notes/test copy 2.md";
  const startUri = vscode.Uri.from({
    scheme: "http",
    path: fsPath,
    authority: "localhost:3000",
  });

  test("Parse js Map correctly", async () => {
    await gCreator.parseLocalGraph(startUri);
    const graphMap = gCreator.getLocalGraphMap();

    // 2 nodes in total
    assert.strictEqual(graphMap.size, 2);

    // map must include starting file
    assert.strictEqual(graphMap.has(startUri), true);

    // starting file (test copy 2.md) has 1 link
    assert.strictEqual(graphMap.get(startUri)?.length, 1);
  });

  test("Parse to neo format correctly", async () => {
    await gCreator.parseLocalGraph(startUri);
    let neoFormat = gCreator.getNeoFormat();

    // const sample = {
    //   results: [
    //     {
    //       data: [
    //         {
    //           graph: {
    //             nodes: [
    //               {
    //                 id: "/markdowns/test copy 2.md",
    //                 labels: ["File"],
    //                 properties: {
    //                   fileUri: {},
    //                 },
    //               },
    //             ],
    //             relationships: [
    //               {
    //                 id: "/markdowns/test copy 2.md/markdowns/test copy 3.md",
    //                 type: "LINKS_TO",
    //                 startNode: "/markdowns/test copy 2.md",
    //                 endNode: "/markdowns/test copy 3.md",
    //                 properties: {},
    //               },
    //             ],
    //           },
    //         },
    //       ],
    //     },
    //   ],
    // };

    neoFormat = neoFormat.results[0].data[0].graph;

    // 2 nodes and 1 relationship
    assert.strictEqual(neoFormat.relationships.length, 1);
    assert.strictEqual(neoFormat.nodes.length, 2);

    // node properties
    assert.strictEqual(neoFormat.nodes[0].hasOwnProperty("labels"), true);
    assert.strictEqual(neoFormat.nodes[0].hasOwnProperty("id"), true);
    assert.strictEqual(neoFormat.nodes[0].hasOwnProperty("properties"), true);
    assert.strictEqual(
      neoFormat.nodes[0].properties.hasOwnProperty("fileUri"),
      true
    );

    // relationship properties
    assert.strictEqual(neoFormat.relationships[0].hasOwnProperty("id"), true);
    assert.strictEqual(neoFormat.relationships[0].hasOwnProperty("type"), true);
    assert.strictEqual(
      neoFormat.relationships[0].hasOwnProperty("startNode"),
      true
    );
    assert.strictEqual(
      neoFormat.relationships[0].hasOwnProperty("endNode"),
      true
    );
  });
});
