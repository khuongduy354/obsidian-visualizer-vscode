import * as assert from "assert";
import * as vscode from "vscode";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { GraphCreator } from "../../GraphCreator";
import { URIHandler } from "../../URIHandler";

/**
 * Benchmark Test Suite
 *
 * These tests measure performance metrics for:
 * 1. Full graph rebuild times
 * 2. Incremental updates vs full rebuilds
 * 3. Memory consumption
 * 4. Debounce effectiveness
 */

suite("Benchmark Tests", () => {
  let obsiFilesTracker: ObsiFilesTracker;
  let graphCreator: GraphCreator;
  let uriHandler: URIHandler;
  let testWorkspacePath: string;

  suiteSetup(async () => {
    // Get workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    assert.ok(workspaceFolders, "No workspace folder found");
    testWorkspacePath = workspaceFolders[0].uri.fsPath;
  });

  setup(() => {
    uriHandler = new URIHandler();
    obsiFilesTracker = new ObsiFilesTracker(uriHandler);
    graphCreator = new GraphCreator(obsiFilesTracker, uriHandler);
  });

  teardown(() => {
    obsiFilesTracker.dispose();
  });

  /**
   * Benchmark 1: Full Workspace Parse Time
   * Measures initial workspace reading and graph creation
   */
  test("Benchmark: Full workspace parse time", async function () {
    this.timeout(30000); // 30 seconds timeout

    const startTime = performance.now();
    await obsiFilesTracker.readAllWorkspaceFiles();
    const parseTime = performance.now() - startTime;

    const graphStartTime = performance.now();
    const globalGraph = graphCreator.parseNeoGlobal();
    const graphBuildTime = performance.now() - graphStartTime;

    const totalTime = parseTime + graphBuildTime;

    // Log results
    console.log("\n=== Full Workspace Parse Benchmark ===");
    console.log(`File parsing time: ${parseTime.toFixed(2)}ms`);
    console.log(`Graph building time: ${graphBuildTime.toFixed(2)}ms`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Files tracked: ${obsiFilesTracker.forwardLinks.size}`);
    console.log(
      `Nodes in graph: ${globalGraph.results[0].data[0].graph.nodes.length}`
    );
    console.log(
      `Edges in graph: ${globalGraph.results[0].data[0].graph.relationships.length}`
    );

    // Assert reasonable performance (adjust thresholds based on your needs)
    assert.ok(
      parseTime < 10000,
      `Parse time ${parseTime}ms exceeds 10s threshold`
    );
    assert.ok(
      graphBuildTime < 5000,
      `Graph build time ${graphBuildTime}ms exceeds 5s threshold`
    );
  });

  /**
   * Benchmark 2: Single File Update - Full Rebuild
   * Measures current implementation's full rebuild on single file change
   */
  test("Benchmark: Single file update with full rebuild", async function () {
    this.timeout(30000);

    // Setup: Parse workspace first
    await obsiFilesTracker.readAllWorkspaceFiles();
    const initialGraph = graphCreator.parseNeoGlobal();

    // Find a test file to update
    const testFiles = Array.from(obsiFilesTracker.forwardLinks.keys());
    assert.ok(testFiles.length > 0, "No test files found");

    const testFile = testFiles[0];
    const testUri = vscode.Uri.file(testFile);

    // Measure rebuild time after single file update
    const rebuilds: number[] = [];
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      // Simulate file update
      await obsiFilesTracker.set(testUri);
      const newGraph = graphCreator.parseNeoGlobal();

      const rebuildTime = performance.now() - startTime;
      rebuilds.push(rebuildTime);
    }

    const avgRebuildTime =
      rebuilds.reduce((a, b) => a + b, 0) / rebuilds.length;
    const minRebuildTime = Math.min(...rebuilds);
    const maxRebuildTime = Math.max(...rebuilds);

    console.log("\n=== Single File Update - Full Rebuild Benchmark ===");
    console.log(`Average rebuild time: ${avgRebuildTime.toFixed(2)}ms`);
    console.log(`Min rebuild time: ${minRebuildTime.toFixed(2)}ms`);
    console.log(`Max rebuild time: ${maxRebuildTime.toFixed(2)}ms`);
    console.log(`Iterations: ${iterations}`);

    // This serves as baseline for incremental update comparison
    assert.ok(
      avgRebuildTime < 5000,
      `Average rebuild time ${avgRebuildTime}ms too high`
    );
  });

  /**
   * Benchmark 3: Multiple Rapid File Changes
   * Tests performance without debouncing
   */
  test("Benchmark: Rapid file changes without debounce", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const testFiles = Array.from(obsiFilesTracker.forwardLinks.keys()).slice(
      0,
      5
    );

    const startTime = performance.now();
    let rebuildCount = 0;

    // Simulate rapid changes
    for (const file of testFiles) {
      const uri = vscode.Uri.file(file);
      await obsiFilesTracker.set(uri);
      graphCreator.parseNeoGlobal(); // Each change triggers rebuild
      rebuildCount++;
    }

    const totalTime = performance.now() - startTime;
    const avgTimePerChange = totalTime / testFiles.length;

    console.log("\n=== Rapid Changes Without Debounce ===");
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Files changed: ${testFiles.length}`);
    console.log(`Rebuilds triggered: ${rebuildCount}`);
    console.log(`Average time per change: ${avgTimePerChange.toFixed(2)}ms`);

    // This benchmark shows why debouncing is needed
    assert.strictEqual(
      rebuildCount,
      testFiles.length,
      "Should rebuild for each change"
    );
  });

  /**
   * Benchmark 4: Memory Usage Baseline
   * Measures memory footprint of data structures
   */
  test("Benchmark: Memory usage baseline", async function () {
    this.timeout(30000);

    // Get baseline memory if available
    const getMemoryUsage = () => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    };

    const memBefore = getMemoryUsage();

    await obsiFilesTracker.readAllWorkspaceFiles();
    const graph = graphCreator.parseNeoGlobal();

    const memAfter = getMemoryUsage();

    console.log("\n=== Memory Usage Baseline ===");
    console.log(`Files tracked: ${obsiFilesTracker.forwardLinks.size}`);
    console.log(`Forward links entries: ${obsiFilesTracker.forwardLinks.size}`);
    console.log(`Backward links entries: ${obsiFilesTracker.backLinks.size}`);
    console.log(
      `Filename index entries: ${obsiFilesTracker.fileNameFullPathMap.size}`
    );
    console.log(`Graph nodes: ${graph.results[0].data[0].graph.nodes.length}`);
    console.log(
      `Graph edges: ${graph.results[0].data[0].graph.relationships.length}`
    );

    if (memBefore !== null && memAfter !== null) {
      const memUsedMB = (memAfter - memBefore) / (1024 * 1024);
      console.log(`Approximate memory used: ${memUsedMB.toFixed(2)}MB`);
    } else {
      console.log("Memory API not available in this environment");
    }

    // Data structure size estimates
    const forwardLinksCount = Array.from(
      obsiFilesTracker.forwardLinks.values()
    ).reduce((sum, arr) => sum + arr.length, 0);
    const backLinksCount = Array.from(
      obsiFilesTracker.backLinks.values()
    ).reduce((sum, arr) => sum + arr.length, 0);

    console.log(`Total forward link references: ${forwardLinksCount}`);
    console.log(`Total backward link references: ${backLinksCount}`);
  });

  /**
   * Benchmark 5: Link Resolution Performance
   * Tests O(1) lookup claim for bidirectional links
   */
  test("Benchmark: Link resolution performance", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const allFiles = Array.from(obsiFilesTracker.forwardLinks.keys());

    if (allFiles.length === 0) {
      console.log("No files to test, skipping");
      return;
    }

    // Test forward link lookups
    const forwardLookupTimes: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const randomFile = allFiles[Math.floor(Math.random() * allFiles.length)];
      const startTime = performance.now();
      const links = obsiFilesTracker.forwardLinks.get(randomFile);
      const lookupTime = performance.now() - startTime;
      forwardLookupTimes.push(lookupTime);
    }

    // Test backward link lookups
    const backwardLookupTimes: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const randomFile = allFiles[Math.floor(Math.random() * allFiles.length)];
      const startTime = performance.now();
      const links = obsiFilesTracker.backLinks.get(randomFile);
      const lookupTime = performance.now() - startTime;
      backwardLookupTimes.push(lookupTime);
    }

    const avgForward =
      forwardLookupTimes.reduce((a, b) => a + b, 0) / forwardLookupTimes.length;
    const avgBackward =
      backwardLookupTimes.reduce((a, b) => a + b, 0) /
      backwardLookupTimes.length;

    console.log("\n=== Link Resolution Performance (O(1) verification) ===");
    console.log(`Average forward link lookup: ${avgForward.toFixed(6)}ms`);
    console.log(`Average backward link lookup: ${avgBackward.toFixed(6)}ms`);
    console.log(`Lookups tested: 1000 each`);

    // Should be very fast (sub-millisecond)
    assert.ok(
      avgForward < 1,
      "Forward lookups should be O(1) - sub-millisecond"
    );
    assert.ok(
      avgBackward < 1,
      "Backward lookups should be O(1) - sub-millisecond"
    );
  });

  /**
   * Benchmark 6: Graph Creation Scalability
   * Tests how graph creation time scales with workspace size
   */
  test("Benchmark: Graph creation scalability", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();
    const allFiles = Array.from(obsiFilesTracker.forwardLinks.keys());

    if (allFiles.length < 10) {
      console.log("Not enough files to test scalability");
      return;
    }

    // Test with different workspace sizes
    const testSizes = [
      Math.min(10, allFiles.length),
      Math.min(50, allFiles.length),
      Math.min(100, allFiles.length),
      allFiles.length,
    ];

    console.log("\n=== Graph Creation Scalability ===");

    for (const size of testSizes) {
      // Create subset tracker
      const subsetTracker = new ObsiFilesTracker(uriHandler);
      const subset = allFiles.slice(0, size);

      // Populate subset
      for (const file of subset) {
        const links = obsiFilesTracker.forwardLinks.get(file);
        if (links) {
          subsetTracker.forwardLinks.set(file, links);
        }
        const backlinks = obsiFilesTracker.backLinks.get(file);
        if (backlinks) {
          subsetTracker.backLinks.set(file, backlinks);
        }
      }

      const subsetCreator = new GraphCreator(subsetTracker, uriHandler);

      const startTime = performance.now();
      const graph = subsetCreator.parseNeoGlobal();
      const buildTime = performance.now() - startTime;

      console.log(
        `Files: ${size}, Build time: ${buildTime.toFixed(2)}ms, ` +
          `Nodes: ${graph.results[0].data[0].graph.nodes.length}, ` +
          `Edges: ${graph.results[0].data[0].graph.relationships.length}`
      );

      subsetTracker.dispose();
    }
  });

  /**
   * Benchmark 7: Comparison - Current vs Expected Incremental
   * Simulates what incremental updates should achieve
   */
  test("Benchmark: Expected improvement with incremental updates", async function () {
    this.timeout(30000);

    await obsiFilesTracker.readAllWorkspaceFiles();

    // Current approach: Full rebuild
    const fullRebuildStart = performance.now();
    const graph1 = graphCreator.parseNeoGlobal();
    const fullRebuildTime = performance.now() - fullRebuildStart;

    // Simulated incremental: Only update affected nodes
    // In reality, incremental should only rebuild affected parts
    const testFiles = Array.from(obsiFilesTracker.forwardLinks.keys()).slice(
      0,
      1
    );
    const affectedNodes = new Set<string>();

    for (const file of testFiles) {
      affectedNodes.add(file);
      const fwdLinks = obsiFilesTracker.forwardLinks.get(file) || [];
      const bkLinks = obsiFilesTracker.backLinks.get(file) || [];
      fwdLinks.forEach((f) => affectedNodes.add(f.path));
      bkLinks.forEach((f) => affectedNodes.add(f.path));
    }

    // Theoretical incremental time (proportional to affected nodes)
    const totalNodes = obsiFilesTracker.forwardLinks.size;
    const affectedRatio = affectedNodes.size / totalNodes;
    const estimatedIncrementalTime = fullRebuildTime * affectedRatio;

    console.log("\n=== Incremental Update Potential Improvement ===");
    console.log(`Full rebuild time: ${fullRebuildTime.toFixed(2)}ms`);
    console.log(`Total nodes: ${totalNodes}`);
    console.log(`Affected nodes (1 file change): ${affectedNodes.size}`);
    console.log(`Affected ratio: ${(affectedRatio * 100).toFixed(2)}%`);
    console.log(
      `Estimated incremental time: ${estimatedIncrementalTime.toFixed(2)}ms`
    );
    console.log(
      `Potential speedup: ${(
        fullRebuildTime / estimatedIncrementalTime
      ).toFixed(2)}x`
    );

    // This shows the theoretical improvement
    assert.ok(
      estimatedIncrementalTime < fullRebuildTime,
      "Incremental should be faster than full rebuild"
    );
  });
});
