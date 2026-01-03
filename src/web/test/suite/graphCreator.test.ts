import * as assert from "assert";
import * as vscode from "vscode";
import { GraphCreator } from "../../GraphCreator";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { URIHandler } from "../../URIHandler";
import { GraphOption } from "../../types/GraphOption";

/**
 * Unit Tests for GraphCreator
 *
 * Tests graph generation:
 * - Global graph creation
 * - Local graph with depth options
 * - Neo4j format compliance
 * - Graph filtering options
 */

suite("GraphCreator Tests", () => {
  let graphCreator: GraphCreator;
  let obsiFilesTracker: ObsiFilesTracker;
  let uriHandler: URIHandler;

  setup(() => {
    uriHandler = new URIHandler();
    obsiFilesTracker = new ObsiFilesTracker(uriHandler);
    graphCreator = new GraphCreator(obsiFilesTracker, uriHandler);
  });

  teardown(() => {
    obsiFilesTracker.dispose();
  });

  test("Should create global graph from tracked files", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const globalGraph = graphCreator.parseNeoGlobal();

    assert.ok(globalGraph, "Should return graph");
    assert.ok(globalGraph.results, "Should have results array");
    assert.strictEqual(globalGraph.results.length, 1, "Should have one result");

    const data = globalGraph.results[0].data[0];
    assert.ok(data.graph, "Should have graph object");
    assert.ok(data.graph.nodes, "Should have nodes array");
    assert.ok(data.graph.relationships, "Should have relationships array");

    console.log(
      `Global graph: ${data.graph.nodes.length} nodes, ${data.graph.relationships.length} edges`
    );
  });

  test("Should create local graph from specific file", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const allFiles = Array.from(obsiFilesTracker.forwardLinks.keys());

    if (allFiles.length === 0) {
      console.log("No files to test, skipping");
      return;
    }

    const testFile = allFiles[0];
    const localGraph = graphCreator.parseNeoLocal(testFile);

    assert.ok(localGraph, "Should return local graph");
    assert.ok(localGraph.results, "Should have results");

    const data = localGraph.results[0].data[0];
    assert.ok(
      data.graph.nodes.length > 0,
      "Should have at least the center node"
    );

    // Center node should be the test file
    const centerNode = data.graph.nodes.find(
      (n) => n.properties.path === testFile
    );
    assert.ok(centerNode, "Should include center file as node");

    console.log(
      `Local graph for ${testFile}: ${data.graph.nodes.length} nodes, ${data.graph.relationships.length} edges`
    );
  });

  test("Should respect forward/backward link options", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const allFiles = Array.from(obsiFilesTracker.forwardLinks.keys());

    if (allFiles.length === 0) {
      console.log("No files to test, skipping");
      return;
    }

    // Find a file with both forward and backward links
    let testFile: string | undefined;
    for (const file of allFiles) {
      const hasForward =
        (obsiFilesTracker.forwardLinks.get(file)?.length || 0) > 0;
      const hasBackward =
        (obsiFilesTracker.backLinks.get(file)?.length || 0) > 0;
      if (hasForward && hasBackward) {
        testFile = file;
        break;
      }
    }

    if (!testFile) {
      console.log("No file with both link types found, skipping");
      return;
    }

    // Test forward only
    const forwardOnlyOptions: GraphOption = {
      forwardLinks: true,
      backwardLinks: false,
    };
    const forwardGraph = graphCreator.parseNeoLocal(
      testFile,
      forwardOnlyOptions
    );

    // Test backward only
    const backwardOnlyOptions: GraphOption = {
      forwardLinks: false,
      backwardLinks: true,
    };
    const backwardGraph = graphCreator.parseNeoLocal(
      testFile,
      backwardOnlyOptions
    );

    // Test both
    const bothOptions: GraphOption = {
      forwardLinks: true,
      backwardLinks: true,
    };
    const bothGraph = graphCreator.parseNeoLocal(testFile, bothOptions);

    const forwardNodeCount = forwardGraph.results[0].data[0].graph.nodes.length;
    const backwardNodeCount =
      backwardGraph.results[0].data[0].graph.nodes.length;
    const bothNodeCount = bothGraph.results[0].data[0].graph.nodes.length;

    console.log(`Forward only: ${forwardNodeCount} nodes`);
    console.log(`Backward only: ${backwardNodeCount} nodes`);
    console.log(`Both: ${bothNodeCount} nodes`);

    // Both should have at least as many nodes as individual options
    assert.ok(
      bothNodeCount >= forwardNodeCount,
      "Both should include forward links"
    );
    assert.ok(
      bothNodeCount >= backwardNodeCount,
      "Both should include backward links"
    );
  });

  test("Should respect depth option in local graph", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const allFiles = Array.from(obsiFilesTracker.forwardLinks.keys());

    // Find a well-connected file
    let testFile: string | undefined;
    for (const file of allFiles) {
      const linkCount =
        (obsiFilesTracker.forwardLinks.get(file)?.length || 0) +
        (obsiFilesTracker.backLinks.get(file)?.length || 0);
      if (linkCount > 2) {
        testFile = file;
        break;
      }
    }

    if (!testFile) {
      console.log("No well-connected file found, skipping");
      return;
    }

    // Note: Depth parameter not yet implemented in GraphOption type
    // This test is a placeholder for future depth functionality
    const options: GraphOption = { forwardLinks: true, backwardLinks: true };

    const graph1 = graphCreator.parseNeoLocal(testFile, options);
    const graph2 = graphCreator.parseNeoLocal(testFile, options);

    const nodes1 = graph1.results[0].data[0].graph.nodes.length;
    const nodes2 = graph2.results[0].data[0].graph.nodes.length;

    console.log(`Graph 1: ${nodes1} nodes`);
    console.log(`Graph 2: ${nodes2} nodes`);
    console.log(`Note: Depth parameter to be added to GraphOption type`);

    // For now, just verify graphs are generated
    assert.ok(nodes1 > 0, "Should generate graph");
    assert.strictEqual(nodes1, nodes2, "Should generate consistent graphs");
  });

  test("Should create valid Neo4j format", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const graph = graphCreator.parseNeoGlobal();

    // Validate structure
    assert.ok(graph.results, "Should have results");
    assert.ok(Array.isArray(graph.results), "Results should be array");
    assert.ok(graph.results[0].columns, "Should have columns");
    assert.ok(graph.results[0].data, "Should have data");
    assert.ok(graph.results[0].data[0].graph, "Should have graph");

    const graphData = graph.results[0].data[0].graph;

    // Validate nodes
    assert.ok(Array.isArray(graphData.nodes), "Nodes should be array");
    graphData.nodes.forEach((node, idx) => {
      assert.ok(node.id !== undefined, `Node ${idx} should have id`);
      assert.ok(node.labels, `Node ${idx} should have labels`);
      assert.ok(node.properties, `Node ${idx} should have properties`);
      assert.ok(node.properties.name, `Node ${idx} should have name property`);
      assert.ok(node.properties.path, `Node ${idx} should have path property`);
    });

    // Validate relationships
    assert.ok(
      Array.isArray(graphData.relationships),
      "Relationships should be array"
    );
    graphData.relationships.forEach((rel, idx) => {
      assert.ok(rel.id !== undefined, `Relationship ${idx} should have id`);
      assert.ok(rel.type, `Relationship ${idx} should have type`);
      assert.ok(
        rel.startNode !== undefined,
        `Relationship ${idx} should have startNode`
      );
      assert.ok(
        rel.endNode !== undefined,
        `Relationship ${idx} should have endNode`
      );
    });
  });

  test("Should handle files with no links", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();

    // Find a file with no links
    let isolatedFile: string | undefined;
    for (const [file, links] of obsiFilesTracker.forwardLinks) {
      const backlinks = obsiFilesTracker.backLinks.get(file) || [];
      if (links.length === 0 && backlinks.length === 0) {
        isolatedFile = file;
        break;
      }
    }

    if (!isolatedFile) {
      console.log("No isolated file found, skipping");
      return;
    }

    const localGraph = graphCreator.parseNeoLocal(isolatedFile);
    const data = localGraph.results[0].data[0].graph;

    // Should have at least the center node
    assert.strictEqual(data.nodes.length, 1, "Should have only center node");
    assert.strictEqual(
      data.relationships.length,
      0,
      "Should have no relationships"
    );
    assert.strictEqual(
      data.nodes[0].properties.path,
      isolatedFile,
      "Should be the isolated file"
    );
  });

  test("Should include virtual nodes for non-existent files", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const graph = graphCreator.parseNeoGlobal();
    const data = graph.results[0].data[0].graph;

    // Find virtual nodes (nodes without fullURI)
    const virtualNodes = data.nodes.filter((node) => !node.properties.fullURI);

    console.log(`Virtual nodes (non-existent files): ${virtualNodes.length}`);

    // Virtual nodes should be marked appropriately
    virtualNodes.forEach((node) => {
      assert.ok(node.properties.name, "Virtual node should have name");
      assert.ok(node.properties.path, "Virtual node should have path");
      assert.strictEqual(
        node.properties.fullURI,
        undefined,
        "Virtual node should not have fullURI"
      );
    });
  });

  test("Should create consistent node IDs", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();

    // Generate graph twice
    const graph1 = graphCreator.parseNeoGlobal();
    const graph2 = graphCreator.parseNeoGlobal();

    const nodes1 = graph1.results[0].data[0].graph.nodes;
    const nodes2 = graph2.results[0].data[0].graph.nodes;

    // Should have same number of nodes
    assert.strictEqual(
      nodes1.length,
      nodes2.length,
      "Should have consistent node count"
    );

    // Node IDs should be based on path (deterministic)
    const nodeMap1 = new Map(nodes1.map((n) => [n.properties.path, n.id]));
    const nodeMap2 = new Map(nodes2.map((n) => [n.properties.path, n.id]));

    for (const [path, id1] of nodeMap1) {
      const id2 = nodeMap2.get(path);
      assert.strictEqual(id1, id2, `Node ID for ${path} should be consistent`);
    }
  });

  test("Should create valid relationships between existing nodes", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const graph = graphCreator.parseNeoGlobal();
    const data = graph.results[0].data[0].graph;

    const nodeIds = new Set(data.nodes.map((n) => n.id));

    // All relationships should reference existing nodes
    data.relationships.forEach((rel, idx) => {
      assert.ok(
        nodeIds.has(rel.startNode),
        `Relationship ${idx} startNode should reference existing node`
      );
      assert.ok(
        nodeIds.has(rel.endNode),
        `Relationship ${idx} endNode should reference existing node`
      );
    });
  });

  test("Should handle empty workspace gracefully", () => {
    // Don't read workspace files
    const graph = graphCreator.parseNeoGlobal();
    const data = graph.results[0].data[0].graph;

    assert.strictEqual(data.nodes.length, 0, "Should have no nodes");
    assert.strictEqual(
      data.relationships.length,
      0,
      "Should have no relationships"
    );
  });
});
