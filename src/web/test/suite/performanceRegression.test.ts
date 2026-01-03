import * as assert from "assert";
import * as vscode from "vscode";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { GraphCreator } from "../../GraphCreator";
import { URIHandler } from "../../URIHandler";

/**
 * Performance Regression Tests
 *
 * These tests establish performance baselines and detect regressions.
 * Run these tests before and after making optimizations to measure impact.
 *
 * Key metrics:
 * - Parse time per file
 * - Graph build time scaling
 * - Update latency
 * - Memory efficiency
 */

interface PerformanceMetrics {
  parseTimeMs: number;
  graphBuildTimeMs: number;
  filesPerSecond: number;
  updateLatencyMs: number;
  memoryUsageMB: number | null;
}

suite("Performance Regression Tests", () => {
  const BASELINE_THRESHOLDS = {
    maxParseTimePerFile: 50, // ms per file
    maxGraphBuildTime: 5000, // ms total
    minFilesPerSecond: 20, // files parsed per second
    maxUpdateLatency: 1000, // ms per update
    maxMemoryGrowthMB: 50, // MB per 1000 files
  };

  let metrics: PerformanceMetrics;

  test("Baseline: Full workspace performance", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    const graphCreator = new GraphCreator(tracker);

    const getMemory = () => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }
      return null;
    };

    const memBefore = getMemory();

    // Measure parse time
    const parseStart = performance.now();
    await tracker.readAllWorkspaceFiles();
    const parseTime = performance.now() - parseStart;

    const fileCount = tracker.forwardLinks.size;

    // Measure graph build time
    const buildStart = performance.now();
    const graph = graphCreator.parseNeoGlobal();
    const buildTime = performance.now() - buildStart;

    const memAfter = getMemory();

    // Calculate metrics
    metrics = {
      parseTimeMs: parseTime,
      graphBuildTimeMs: buildTime,
      filesPerSecond: fileCount / (parseTime / 1000),
      updateLatencyMs: 0, // Measured in separate test
      memoryUsageMB:
        memAfter !== null && memBefore !== null ? memAfter - memBefore : null,
    };

    // Log baseline
    console.log("\n=== PERFORMANCE BASELINE ===");
    console.log(`Files tracked: ${fileCount}`);
    console.log(`Parse time: ${parseTime.toFixed(2)}ms`);
    console.log(`Parse time per file: ${(parseTime / fileCount).toFixed(2)}ms`);
    console.log(`Graph build time: ${buildTime.toFixed(2)}ms`);
    console.log(`Files per second: ${metrics.filesPerSecond.toFixed(2)}`);
    console.log(`Total time: ${(parseTime + buildTime).toFixed(2)}ms`);
    if (metrics.memoryUsageMB !== null) {
      console.log(`Memory used: ${metrics.memoryUsageMB.toFixed(2)}MB`);
      console.log(
        `Memory per file: ${(metrics.memoryUsageMB / fileCount).toFixed(4)}MB`
      );
    }
    console.log(`Nodes: ${graph.results[0].data[0].graph.nodes.length}`);
    console.log(
      `Edges: ${graph.results[0].data[0].graph.relationships.length}`
    );

    // Assert against thresholds
    const parseTimePerFile = parseTime / fileCount;
    assert.ok(
      parseTimePerFile < BASELINE_THRESHOLDS.maxParseTimePerFile,
      `Parse time per file ${parseTimePerFile.toFixed(2)}ms exceeds threshold`
    );
    assert.ok(
      buildTime < BASELINE_THRESHOLDS.maxGraphBuildTime,
      `Graph build time ${buildTime.toFixed(2)}ms exceeds threshold`
    );
    assert.ok(
      metrics.filesPerSecond > BASELINE_THRESHOLDS.minFilesPerSecond,
      `Files per second ${metrics.filesPerSecond.toFixed(2)} below threshold`
    );

    tracker.dispose();
  });

  test("Regression: Update latency over time", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    const graphCreator = new GraphCreator(tracker);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 10);

    const latencies: number[] = [];

    // Measure update latency over multiple iterations
    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      const uri = vscode.Uri.file(file);

      const start = performance.now();
      await tracker.set(uri);
      graphCreator.parseNeoGlobal();
      const latency = performance.now() - start;

      latencies.push(latency);
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    console.log("\n=== UPDATE LATENCY REGRESSION ===");
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Min latency: ${minLatency.toFixed(2)}ms`);
    console.log(`Max latency: ${maxLatency.toFixed(2)}ms`);
    console.log(`Latency variance: ${(maxLatency - minLatency).toFixed(2)}ms`);

    // Check for degradation over time (last should not be much slower than first)
    const firstThree = latencies.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const lastThree = latencies.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const degradation = lastThree - firstThree;

    console.log(`Early average: ${firstThree.toFixed(2)}ms`);
    console.log(`Late average: ${lastThree.toFixed(2)}ms`);
    console.log(
      `Degradation: ${degradation.toFixed(2)}ms (${(
        (degradation / firstThree) *
        100
      ).toFixed(1)}%)`
    );

    assert.ok(
      avgLatency < BASELINE_THRESHOLDS.maxUpdateLatency,
      `Average latency ${avgLatency.toFixed(2)}ms exceeds threshold`
    );
    assert.ok(
      degradation < firstThree * 0.5,
      "Performance should not degrade significantly over time"
    );

    tracker.dispose();
  });

  test("Regression: Memory growth with file operations", async function () {
    this.timeout(60000);

    const getMemory = () => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
      }
      return null;
    };

    if (getMemory() === null) {
      console.log("Memory API not available, skipping");
      return;
    }

    const tracker = new ObsiFilesTracker();
    await tracker.readAllWorkspaceFiles();

    const memSnapshots: number[] = [];
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 100);

    // Take memory snapshots
    for (let i = 0; i < testFiles.length; i++) {
      const file = testFiles[i];
      await tracker.set(vscode.Uri.file(file));

      if (i % 10 === 0) {
        const mem = getMemory();
        if (mem !== null) memSnapshots.push(mem);
      }
    }

    if (memSnapshots.length < 2) {
      console.log("Not enough memory snapshots");
      tracker.dispose();
      return;
    }

    const memGrowth = memSnapshots[memSnapshots.length - 1] - memSnapshots[0];
    const memGrowthPerOp = memGrowth / testFiles.length;

    console.log("\n=== MEMORY GROWTH REGRESSION ===");
    console.log(`Operations: ${testFiles.length}`);
    console.log(`Memory snapshots: ${memSnapshots.length}`);
    console.log(`Initial memory: ${memSnapshots[0].toFixed(2)}MB`);
    console.log(
      `Final memory: ${memSnapshots[memSnapshots.length - 1].toFixed(2)}MB`
    );
    console.log(`Total growth: ${memGrowth.toFixed(2)}MB`);
    console.log(
      `Growth per operation: ${(memGrowthPerOp * 1000).toFixed(4)}KB`
    );

    // Check for linear growth (indicates leak)
    const slope =
      (memSnapshots[memSnapshots.length - 1] - memSnapshots[0]) /
      memSnapshots.length;
    console.log(`Growth slope: ${(slope * 1000).toFixed(4)}KB per snapshot`);

    // Memory should not grow unbounded
    const memGrowthPer1000Files = memGrowthPerOp * 1000;
    assert.ok(
      memGrowthPer1000Files < BASELINE_THRESHOLDS.maxMemoryGrowthMB,
      `Memory growth ${memGrowthPer1000Files.toFixed(
        2
      )}MB per 1000 files exceeds threshold`
    );

    tracker.dispose();
  });

  test("Regression: Lookup performance doesn't degrade", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    await tracker.readAllWorkspaceFiles();

    const allFiles = Array.from(tracker.forwardLinks.keys());

    if (allFiles.length < 100) {
      console.log("Not enough files for lookup test");
      tracker.dispose();
      return;
    }

    // Measure lookup times at different points
    const iterations = 1000;
    const earlyLookups: number[] = [];
    const lateLookups: number[] = [];

    // Early lookups
    for (let i = 0; i < iterations / 2; i++) {
      const file = allFiles[Math.floor(Math.random() * allFiles.length)];
      const start = performance.now();
      tracker.forwardLinks.get(file);
      tracker.backLinks.get(file);
      const duration = performance.now() - start;
      earlyLookups.push(duration);
    }

    // Do some operations
    for (let i = 0; i < 50; i++) {
      const file = allFiles[i % allFiles.length];
      await tracker.set(vscode.Uri.file(file));
    }

    // Late lookups
    for (let i = 0; i < iterations / 2; i++) {
      const file = allFiles[Math.floor(Math.random() * allFiles.length)];
      const start = performance.now();
      tracker.forwardLinks.get(file);
      tracker.backLinks.get(file);
      const duration = performance.now() - start;
      lateLookups.push(duration);
    }

    const avgEarly =
      earlyLookups.reduce((a, b) => a + b, 0) / earlyLookups.length;
    const avgLate = lateLookups.reduce((a, b) => a + b, 0) / lateLookups.length;

    console.log("\n=== LOOKUP PERFORMANCE REGRESSION ===");
    console.log(`Early average: ${avgEarly.toFixed(6)}ms`);
    console.log(`Late average: ${avgLate.toFixed(6)}ms`);
    console.log(
      `Degradation: ${(((avgLate - avgEarly) / avgEarly) * 100).toFixed(2)}%`
    );

    // Lookups should remain O(1) - no degradation
    assert.ok(
      avgLate < avgEarly * 1.5,
      "Lookup performance should not degrade significantly"
    );
    assert.ok(avgLate < 0.1, "Lookups should remain very fast (<0.1ms)");

    tracker.dispose();
  });

  test("Regression: Graph build time scales linearly", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    await tracker.readAllWorkspaceFiles();

    const allFiles = Array.from(tracker.forwardLinks.keys());

    if (allFiles.length < 50) {
      console.log("Not enough files for scaling test");
      tracker.dispose();
      return;
    }

    const testSizes = [
      Math.min(10, allFiles.length),
      Math.min(50, allFiles.length),
      Math.min(100, allFiles.length),
      Math.min(500, allFiles.length),
      allFiles.length,
    ].filter((v, i, arr) => arr.indexOf(v) === i); // Remove duplicates

    const buildTimes: number[] = [];
    const sizes: number[] = [];

    console.log("\n=== GRAPH BUILD SCALING REGRESSION ===");

    for (const size of testSizes) {
      const subsetTracker = new ObsiFilesTracker();
      const subset = allFiles.slice(0, size);

      // Populate subset
      for (const file of subset) {
        const fwdLinks = tracker.forwardLinks.get(file);
        const backLinks = tracker.backLinks.get(file);
        if (fwdLinks) subsetTracker.forwardLinks.set(file, fwdLinks);
        if (backLinks) subsetTracker.backLinks.set(file, backLinks);
      }

      const graphCreator = new GraphCreator(subsetTracker);

      const start = performance.now();
      graphCreator.parseNeoGlobal();
      const buildTime = performance.now() - start;

      buildTimes.push(buildTime);
      sizes.push(size);

      console.log(
        `Size: ${size} files, Build time: ${buildTime.toFixed(2)}ms, ` +
          `Time per file: ${(buildTime / size).toFixed(2)}ms`
      );

      subsetTracker.dispose();
    }

    // Check if scaling is approximately linear
    if (sizes.length >= 3) {
      const timePerFile = buildTimes.map((t, i) => t / sizes[i]);
      const avgTimePerFile =
        timePerFile.reduce((a, b) => a + b, 0) / timePerFile.length;
      const variance = timePerFile.map((t) => Math.abs(t - avgTimePerFile));
      const maxVariance = Math.max(...variance);

      console.log(`Average time per file: ${avgTimePerFile.toFixed(2)}ms`);
      console.log(`Max variance: ${maxVariance.toFixed(2)}ms`);

      // Variance should not be too high (indicating non-linear scaling)
      assert.ok(
        maxVariance < avgTimePerFile * 0.5,
        "Build time should scale approximately linearly"
      );
    }

    tracker.dispose();
  });

  test("Regression: Rapid updates don't cause slowdown", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    const graphCreator = new GraphCreator(tracker);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 20);

    const batchTimes: number[] = [];

    console.log("\n=== RAPID UPDATE REGRESSION ===");

    // Simulate batches of rapid updates
    for (let batch = 0; batch < 5; batch++) {
      const batchStart = performance.now();

      for (const file of testFiles) {
        await tracker.set(vscode.Uri.file(file));
        graphCreator.parseNeoGlobal();
      }

      const batchTime = performance.now() - batchStart;
      batchTimes.push(batchTime);

      console.log(
        `Batch ${batch + 1}: ${batchTime.toFixed(2)}ms, ` +
          `Average per update: ${(batchTime / testFiles.length).toFixed(2)}ms`
      );
    }

    // Check that later batches are not significantly slower
    const firstBatch = batchTimes[0];
    const lastBatch = batchTimes[batchTimes.length - 1];
    const slowdown = lastBatch - firstBatch;
    const slowdownPercent = (slowdown / firstBatch) * 100;

    console.log(`First batch: ${firstBatch.toFixed(2)}ms`);
    console.log(`Last batch: ${lastBatch.toFixed(2)}ms`);
    console.log(
      `Slowdown: ${slowdown.toFixed(2)}ms (${slowdownPercent.toFixed(1)}%)`
    );

    assert.ok(
      slowdownPercent < 50,
      "Rapid updates should not cause significant slowdown over time"
    );

    tracker.dispose();
  });

  test("Performance Summary Report", async function () {
    this.timeout(60000);

    const tracker = new ObsiFilesTracker();
    const graphCreator = new GraphCreator(tracker);

    const parseStart = performance.now();
    await tracker.readAllWorkspaceFiles();
    const parseTime = performance.now() - parseStart;

    const buildStart = performance.now();
    const graph = graphCreator.parseNeoGlobal();
    const buildTime = performance.now() - buildStart;

    const fileCount = tracker.forwardLinks.size;
    const nodeCount = graph.results[0].data[0].graph.nodes.length;
    const edgeCount = graph.results[0].data[0].graph.relationships.length;

    console.log("\n" + "=".repeat(60));
    console.log("PERFORMANCE SUMMARY REPORT");
    console.log("=".repeat(60));
    console.log(`Workspace Size: ${fileCount} files`);
    console.log(`Graph Size: ${nodeCount} nodes, ${edgeCount} edges`);
    console.log(
      `Parse Time: ${parseTime.toFixed(2)}ms (${(parseTime / fileCount).toFixed(
        2
      )}ms per file)`
    );
    console.log(`Build Time: ${buildTime.toFixed(2)}ms`);
    console.log(`Total Time: ${(parseTime + buildTime).toFixed(2)}ms`);
    console.log(
      `Throughput: ${(fileCount / (parseTime / 1000)).toFixed(2)} files/sec`
    );
    console.log("=".repeat(60));

    // Save metrics for comparison (in real scenario, save to file)
    const summary = {
      timestamp: new Date().toISOString(),
      fileCount,
      nodeCount,
      edgeCount,
      parseTimeMs: parseTime,
      buildTimeMs: buildTime,
      totalTimeMs: parseTime + buildTime,
      throughput: fileCount / (parseTime / 1000),
    };

    console.log("\nMetrics JSON:");
    console.log(JSON.stringify(summary, null, 2));

    tracker.dispose();
  });
});
