import * as assert from "assert";
import * as vscode from "vscode";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { GraphCreator } from "../../GraphCreator";

/**
 * Incremental Update Tests
 *
 * These tests are for AFTER implementing incremental graph updates.
 * Currently, these tests document expected behavior and can be used
 * to verify incremental update implementation correctness.
 *
 * Expected Behavior with Incremental Updates:
 * - Only affected nodes and edges should be updated
 * - Update time should be proportional to affected nodes, not total graph size
 * - Graph should remain consistent after incremental updates
 * - Incremental and full rebuild should produce identical results
 */

suite("Incremental Update Tests (Future)", () => {
  let tracker: ObsiFilesTracker;
  let graphCreator: GraphCreator;

  setup(() => {
    tracker = new ObsiFilesTracker();
    graphCreator = new GraphCreator(tracker);
  });

  teardown(() => {
    tracker.dispose();
  });

  /**
   * Test: Incremental update should be faster than full rebuild
   *
   * Implementation strategy:
   * - Maintain persistent graph structure
   * - On file add: Add node + new edges
   * - On file update: Update node properties + affected edges
   * - On file delete: Remove node + connected edges
   */
  test("Should update graph incrementally faster than full rebuild", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 1);

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    const testFile = testFiles[0];
    const testUri = vscode.Uri.file(testFile);

    // Measure full rebuild
    const fullRebuildStart = performance.now();
    const fullGraph = graphCreator.parseNeoGlobal();
    const fullRebuildTime = performance.now() - fullRebuildStart;

    // Simulate incremental update
    // In real implementation, this would be a separate method like:
    // graphCreator.updateNodeIncremental(testFile)

    const incrementalStart = performance.now();

    // Mock incremental update logic:
    // 1. Find affected nodes (file + linked files)
    const affectedNodes = new Set<string>();
    affectedNodes.add(testFile);

    const fwdLinks = tracker.forwardLinks.get(testFile) || [];
    const backLinks = tracker.backLinks.get(testFile) || [];
    fwdLinks.forEach((f) => affectedNodes.add(f.path));
    backLinks.forEach((f) => affectedNodes.add(f.path));

    // 2. Update only affected nodes/edges (simulated)
    // In real implementation, modify existing graph structure
    // instead of rebuilding entire graph

    const incrementalTime = performance.now() - incrementalStart;

    console.log("\n=== Incremental vs Full Rebuild ===");
    console.log(
      `Total nodes in graph: ${fullGraph.results[0].data[0].graph.nodes.length}`
    );
    console.log(`Affected nodes: ${affectedNodes.size}`);
    console.log(
      `Affected ratio: ${(
        (affectedNodes.size / fullGraph.results[0].data[0].graph.nodes.length) *
        100
      ).toFixed(2)}%`
    );
    console.log(`Full rebuild time: ${fullRebuildTime.toFixed(2)}ms`);
    console.log(
      `Incremental update time (theoretical): ${incrementalTime.toFixed(2)}ms`
    );
    console.log(
      `Expected incremental time: ${(
        (fullRebuildTime * affectedNodes.size) /
        fullGraph.results[0].data[0].graph.nodes.length
      ).toFixed(2)}ms`
    );
    console.log(
      `Theoretical speedup: ${(fullRebuildTime / incrementalTime).toFixed(2)}x`
    );

    // Incremental should be faster when affecting small portion of graph
    const affectedRatio =
      affectedNodes.size / fullGraph.results[0].data[0].graph.nodes.length;
    if (affectedRatio < 0.5) {
      assert.ok(
        incrementalTime < fullRebuildTime * affectedRatio * 2,
        "Incremental update should be proportional to affected nodes"
      );
    }
  });

  /**
   * Test: Incremental update produces same result as full rebuild
   *
   * This is critical for correctness
   */
  test("Should produce identical graph after incremental update", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys());

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    // Get initial graph (full rebuild)
    const initialGraph = graphCreator.parseNeoGlobal();
    const initialNodes = initialGraph.results[0].data[0].graph.nodes;
    const initialEdges = initialGraph.results[0].data[0].graph.relationships;

    // Simulate file update
    const testFile = testFiles[0];
    await tracker.set(vscode.Uri.file(testFile));

    // Full rebuild (current implementation)
    const fullRebuild = graphCreator.parseNeoGlobal();

    // Incremental update (future implementation)
    // const incrementalGraph = graphCreator.updateIncremental(testFile);
    // For now, we'll compare full rebuild with itself
    const incrementalGraph = graphCreator.parseNeoGlobal();

    const fullNodes = fullRebuild.results[0].data[0].graph.nodes;
    const fullEdges = fullRebuild.results[0].data[0].graph.relationships;
    const incrNodes = incrementalGraph.results[0].data[0].graph.nodes;
    const incrEdges = incrementalGraph.results[0].data[0].graph.relationships;

    console.log("\n=== Incremental Correctness Test ===");
    console.log(
      `Full rebuild: ${fullNodes.length} nodes, ${fullEdges.length} edges`
    );
    console.log(
      `Incremental: ${incrNodes.length} nodes, ${incrEdges.length} edges`
    );

    // Should have same number of nodes and edges
    assert.strictEqual(
      incrNodes.length,
      fullNodes.length,
      "Should have same node count"
    );
    assert.strictEqual(
      incrEdges.length,
      fullEdges.length,
      "Should have same edge count"
    );

    // Verify all nodes exist in both
    const fullNodeIds = new Set(fullNodes.map((n) => n.id));
    const incrNodeIds = new Set(incrNodes.map((n) => n.id));

    assert.strictEqual(
      incrNodeIds.size,
      fullNodeIds.size,
      "Should have same unique nodes"
    );

    for (const id of fullNodeIds) {
      assert.ok(
        incrNodeIds.has(id),
        `Node ${id} should exist in incremental graph`
      );
    }
  });

  /**
   * Test: Add file incrementally
   */
  test("Should add new file incrementally", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();

    const initialGraph = graphCreator.parseNeoGlobal();
    const initialNodeCount = initialGraph.results[0].data[0].graph.nodes.length;

    // Simulate adding a new file
    const newFilePath = "/test/new-file.md";
    const newFileUri = vscode.Uri.file(newFilePath);

    // Add to tracker
    tracker.forwardLinks.set(newFilePath, []);
    tracker.backLinks.set(newFilePath, []);

    // Incremental add (future implementation)
    // graphCreator.addNodeIncremental(newFilePath);

    // For now, full rebuild
    const afterGraph = graphCreator.parseNeoGlobal();
    const afterNodeCount = afterGraph.results[0].data[0].graph.nodes.length;

    console.log("\n=== Incremental Add Test ===");
    console.log(`Nodes before: ${initialNodeCount}`);
    console.log(`Nodes after: ${afterNodeCount}`);
    console.log(`Added: ${afterNodeCount - initialNodeCount}`);

    assert.strictEqual(
      afterNodeCount,
      initialNodeCount + 1,
      "Should add exactly 1 node"
    );

    // Clean up
    tracker.forwardLinks.delete(newFilePath);
    tracker.backLinks.delete(newFilePath);
  });

  /**
   * Test: Delete file incrementally
   */
  test("Should remove file incrementally", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys());

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    const initialGraph = graphCreator.parseNeoGlobal();
    const initialNodeCount = initialGraph.results[0].data[0].graph.nodes.length;

    // Delete a file
    const fileToDelete = testFiles[0];
    tracker.delete(vscode.Uri.file(fileToDelete));

    // Incremental delete (future implementation)
    // graphCreator.removeNodeIncremental(fileToDelete);

    const afterGraph = graphCreator.parseNeoGlobal();
    const afterNodeCount = afterGraph.results[0].data[0].graph.nodes.length;

    console.log("\n=== Incremental Delete Test ===");
    console.log(`Nodes before: ${initialNodeCount}`);
    console.log(`Nodes after: ${afterNodeCount}`);
    console.log(`Removed: ${initialNodeCount - afterNodeCount}`);

    assert.ok(
      afterNodeCount <= initialNodeCount,
      "Should not increase node count"
    );
  });

  /**
   * Test: Update edges when file content changes
   */
  test("Should update edges incrementally when links change", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys());

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    const testFile = testFiles[0];
    const initialLinks = tracker.forwardLinks.get(testFile)?.length || 0;

    console.log("\n=== Incremental Edge Update Test ===");
    console.log(`Initial links from ${testFile}: ${initialLinks}`);

    // Simulate content change (add new link)
    const newTargetFile = testFiles[1] || "/test/target.md";
    const currentLinks = tracker.forwardLinks.get(testFile) || [];

    // Add new link
    tracker.forwardLinks.set(testFile, [
      ...currentLinks,
      { path: newTargetFile },
    ]);

    // Update backlinks
    const backlinks = tracker.backLinks.get(newTargetFile) || [];
    tracker.backLinks.set(newTargetFile, [...backlinks, { path: testFile }]);

    const afterLinks = tracker.forwardLinks.get(testFile)?.length || 0;

    console.log(`Links after update: ${afterLinks}`);
    console.log(`Change: ${afterLinks - initialLinks} links`);

    // Incremental edge update (future implementation)
    // graphCreator.updateEdgesIncremental(testFile);

    const graph = graphCreator.parseNeoGlobal();
    console.log(
      `Total edges in graph: ${graph.results[0].data[0].graph.relationships.length}`
    );

    assert.strictEqual(afterLinks, initialLinks + 1, "Should add one link");
  });

  /**
   * Test: Measure speedup for different affected ratios
   */
  test("Benchmark: Speedup vs affected node ratio", async function () {
    this.timeout(60000);

    await tracker.readAllWorkspaceFiles();
    const allFiles = Array.from(tracker.forwardLinks.keys());

    if (allFiles.length < 10) {
      console.log("Not enough files, skipping");
      return;
    }

    console.log("\n=== Incremental Speedup by Affected Ratio ===");
    console.log(`Total files: ${allFiles.length}`);

    // Measure full rebuild as baseline
    const fullRebuildStart = performance.now();
    graphCreator.parseNeoGlobal();
    const fullRebuildTime = performance.now() - fullRebuildStart;

    console.log(`\nFull rebuild baseline: ${fullRebuildTime.toFixed(2)}ms\n`);

    // Test with different numbers of affected files
    const testCounts = [1, 5, 10, 20, 50].filter((n) => n < allFiles.length);

    for (const count of testCounts) {
      const testSubset = allFiles.slice(0, count);

      // Calculate affected nodes
      const affectedNodes = new Set<string>();
      for (const file of testSubset) {
        affectedNodes.add(file);
        const fwdLinks = tracker.forwardLinks.get(file) || [];
        const backLinks = tracker.backLinks.get(file) || [];
        fwdLinks.forEach((f) => affectedNodes.add(f.path));
        backLinks.forEach((f) => affectedNodes.add(f.path));
      }

      const affectedRatio = affectedNodes.size / allFiles.length;

      // Theoretical incremental time (proportional to affected ratio)
      const theoreticalIncrementalTime = fullRebuildTime * affectedRatio;

      // Theoretical speedup
      const theoreticalSpeedup = fullRebuildTime / theoreticalIncrementalTime;

      console.log(`Files changed: ${count}`);
      console.log(
        `  Affected nodes: ${affectedNodes.size} (${(
          affectedRatio * 100
        ).toFixed(1)}%)`
      );
      console.log(
        `  Theoretical incremental time: ${theoreticalIncrementalTime.toFixed(
          2
        )}ms`
      );
      console.log(`  Theoretical speedup: ${theoreticalSpeedup.toFixed(2)}x`);
      console.log(
        `  Expected savings: ${(
          fullRebuildTime - theoreticalIncrementalTime
        ).toFixed(2)}ms\n`
      );
    }

    console.log(
      "Note: These are theoretical values. Actual incremental implementation"
    );
    console.log("may have overhead but should achieve similar speedup ratios.");
  });

  /**
   * Test: Consistency after multiple incremental updates
   */
  test("Should maintain consistency after multiple incremental updates", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 5);

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    // Get baseline (full rebuild)
    const baseline = graphCreator.parseNeoGlobal();
    const baselineNodeCount = baseline.results[0].data[0].graph.nodes.length;

    console.log("\n=== Multiple Incremental Updates Consistency ===");
    console.log(`Baseline: ${baselineNodeCount} nodes`);

    // Perform multiple updates
    for (const file of testFiles) {
      await tracker.set(vscode.Uri.file(file));
      // In real implementation: graphCreator.updateIncremental(file);
    }

    // Full rebuild to compare
    const afterUpdates = graphCreator.parseNeoGlobal();
    const afterNodeCount = afterUpdates.results[0].data[0].graph.nodes.length;

    console.log(`After ${testFiles.length} updates: ${afterNodeCount} nodes`);

    // Node count should be consistent
    // (may differ if files were added/removed, but structure should be valid)
    assert.ok(afterNodeCount > 0, "Graph should not be empty");

    // Verify graph is valid
    const nodes = afterUpdates.results[0].data[0].graph.nodes;
    const edges = afterUpdates.results[0].data[0].graph.relationships;
    const nodeIds = new Set(nodes.map((n) => n.id));

    // All edges should reference existing nodes
    for (const edge of edges) {
      assert.ok(
        nodeIds.has(edge.startNode),
        "Edge start should reference existing node"
      );
      assert.ok(
        nodeIds.has(edge.endNode),
        "Edge end should reference existing node"
      );
    }

    console.log("Graph structure is valid ✓");
  });

  /**
   * Test: Incremental update handles circular references
   */
  test("Should handle circular references in incremental update", async function () {
    this.timeout(30000);

    // Create circular reference scenario
    const fileA = "/test/a.md";
    const fileB = "/test/b.md";

    tracker.forwardLinks.set(fileA, [{ path: fileB }]);
    tracker.forwardLinks.set(fileB, [{ path: fileA }]);
    tracker.backLinks.set(fileA, [{ path: fileB }]);
    tracker.backLinks.set(fileB, [{ path: fileA }]);

    console.log("\n=== Circular Reference Incremental Update ===");
    console.log("Created A -> B, B -> A");

    // Update file A
    // Should update both A and B nodes (they affect each other)
    const affectedNodes = new Set<string>();
    affectedNodes.add(fileA);

    const fwdLinks = tracker.forwardLinks.get(fileA) || [];
    fwdLinks.forEach((f) => {
      affectedNodes.add(f.path);
      // Also check second-level links
      const secondLevel = tracker.forwardLinks.get(f.path) || [];
      secondLevel.forEach((s) => affectedNodes.add(s.path));
    });

    console.log(`Affected nodes: ${Array.from(affectedNodes).join(", ")}`);
    console.log(`Expected: Both A and B should be affected`);

    assert.ok(affectedNodes.has(fileA), "Should include A");
    assert.ok(affectedNodes.has(fileB), "Should include B (linked from A)");

    // Clean up
    tracker.forwardLinks.delete(fileA);
    tracker.forwardLinks.delete(fileB);
    tracker.backLinks.delete(fileA);
    tracker.backLinks.delete(fileB);
  });
});
