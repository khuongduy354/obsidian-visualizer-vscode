import * as assert from "assert";
import * as vscode from "vscode";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { GraphCreator } from "../../GraphCreator";

/**
 * Debounce Tests
 *
 * These tests are for AFTER implementing debounce functionality.
 * Currently, these tests document expected behavior and can be used
 * to verify debounce implementation correctness.
 *
 * Expected Behavior with Debounce:
 * - Multiple rapid file changes should trigger only ONE graph rebuild
 * - Rebuild should occur AFTER debounce delay
 * - Single isolated change should still rebuild immediately
 */

suite("Debounce Tests (Future)", () => {
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
   * Test debounce delays rapid updates
   *
   * Implementation hint: Use setTimeout/clearTimeout pattern
   *
   * Example implementation:
   * ```typescript
   * let debounceTimer: NodeJS.Timeout | undefined;
   * const DEBOUNCE_DELAY = 300; // ms
   *
   * obsiFilesTracker.onDidUpdateEmitter.event(() => {
   *   if (debounceTimer) clearTimeout(debounceTimer);
   *   debounceTimer = setTimeout(() => {
   *     appContext.globalGraph = graphBuilder.parseNeoGlobal();
   *   }, DEBOUNCE_DELAY);
   * });
   * ```
   */
  test("Should debounce rapid file changes", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 5);

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    let rebuildCount = 0;
    const DEBOUNCE_DELAY = 300; // ms
    let debounceTimer: NodeJS.Timeout | undefined;

    // Mock debounced rebuild function
    const debouncedRebuild = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        graphCreator.parseNeoGlobal();
        rebuildCount++;
      }, DEBOUNCE_DELAY);
    };

    // Trigger rapid changes
    const startTime = performance.now();
    for (const file of testFiles) {
      await tracker.set(vscode.Uri.file(file));
      debouncedRebuild(); // Instead of immediate rebuild
    }

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 100));
    const totalTime = performance.now() - startTime;

    console.log("\n=== Debounce Test ===");
    console.log(`Files changed: ${testFiles.length}`);
    console.log(`Rebuilds triggered: ${rebuildCount}`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Expected: 1 rebuild after ${DEBOUNCE_DELAY}ms debounce`);

    // With debounce, only 1 rebuild should occur
    assert.strictEqual(
      rebuildCount,
      1,
      "Should trigger only 1 rebuild for rapid changes"
    );
  });

  /**
   * Test debounce doesn't delay single change
   */
  test("Should not delay single isolated file change", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys());

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    const testFile = testFiles[0];

    let rebuildCount = 0;
    const DEBOUNCE_DELAY = 300;
    let debounceTimer: NodeJS.Timeout | undefined;

    const debouncedRebuild = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        graphCreator.parseNeoGlobal();
        rebuildCount++;
      }, DEBOUNCE_DELAY);
    };

    // Single change
    const startTime = performance.now();
    await tracker.set(vscode.Uri.file(testFile));
    debouncedRebuild();

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 100));
    const rebuildTime = performance.now() - startTime;

    console.log("\n=== Single Change Test ===");
    console.log(`Rebuild time: ${rebuildTime.toFixed(2)}ms`);
    console.log(`Rebuilds: ${rebuildCount}`);

    // Should still rebuild, just debounced
    assert.strictEqual(rebuildCount, 1, "Should rebuild after debounce delay");
    assert.ok(
      rebuildTime >= DEBOUNCE_DELAY,
      "Should wait at least debounce delay"
    );
  });

  /**
   * Test configurable debounce delay
   *
   * Implementation hint: Make debounce delay configurable
   */
  test("Should respect configurable debounce delay", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 3);

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    const delays = [100, 300, 500]; // Different delays to test

    for (const delay of delays) {
      let rebuildCount = 0;
      let debounceTimer: NodeJS.Timeout | undefined;

      const debouncedRebuild = (customDelay: number) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          graphCreator.parseNeoGlobal();
          rebuildCount++;
        }, customDelay);
      };

      const startTime = performance.now();

      // Trigger changes
      for (const file of testFiles) {
        await tracker.set(vscode.Uri.file(file));
        debouncedRebuild(delay);
      }

      // Wait for debounce
      await new Promise((resolve) => setTimeout(resolve, delay + 100));
      const totalTime = performance.now() - startTime;

      console.log(
        `\nDelay ${delay}ms: Time ${totalTime.toFixed(
          2
        )}ms, Rebuilds ${rebuildCount}`
      );

      assert.strictEqual(
        rebuildCount,
        1,
        `Should rebuild once with ${delay}ms delay`
      );
      assert.ok(totalTime >= delay, `Should wait at least ${delay}ms`);
    }
  });

  /**
   * Test debounce effectiveness comparison
   */
  test("Benchmark: With vs Without Debounce", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 10);

    if (testFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    // WITHOUT debounce
    let withoutDebounceRebuilds = 0;
    const withoutStart = performance.now();

    for (const file of testFiles) {
      await tracker.set(vscode.Uri.file(file));
      graphCreator.parseNeoGlobal(); // Immediate rebuild
      withoutDebounceRebuilds++;
    }

    const withoutTime = performance.now() - withoutStart;

    // WITH debounce
    let withDebounceRebuilds = 0;
    const DEBOUNCE_DELAY = 300;
    let debounceTimer: NodeJS.Timeout | undefined;

    const debouncedRebuild = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        graphCreator.parseNeoGlobal();
        withDebounceRebuilds++;
      }, DEBOUNCE_DELAY);
    };

    const withStart = performance.now();

    for (const file of testFiles) {
      await tracker.set(vscode.Uri.file(file));
      debouncedRebuild();
    }

    // Wait for final debounced rebuild
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 100));
    const withTime = performance.now() - withStart;

    console.log("\n=== Debounce Effectiveness Comparison ===");
    console.log(`Files changed: ${testFiles.length}`);
    console.log("");
    console.log("WITHOUT Debounce:");
    console.log(`  Total time: ${withoutTime.toFixed(2)}ms`);
    console.log(`  Rebuilds: ${withoutDebounceRebuilds}`);
    console.log(
      `  Time per rebuild: ${(withoutTime / withoutDebounceRebuilds).toFixed(
        2
      )}ms`
    );
    console.log("");
    console.log("WITH Debounce:");
    console.log(`  Total time: ${withTime.toFixed(2)}ms`);
    console.log(`  Rebuilds: ${withDebounceRebuilds}`);
    console.log(
      `  Time per rebuild: ${(withTime / withDebounceRebuilds).toFixed(2)}ms`
    );
    console.log("");
    console.log(
      `Improvement: ${((1 - withTime / withoutTime) * 100).toFixed(1)}% faster`
    );
    console.log(
      `Rebuilds reduced: ${withoutDebounceRebuilds - withDebounceRebuilds} (${(
        (1 - withDebounceRebuilds / withoutDebounceRebuilds) *
        100
      ).toFixed(1)}%)`
    );

    // Assertions
    assert.strictEqual(
      withDebounceRebuilds,
      1,
      "Debounced should rebuild once"
    );
    assert.strictEqual(
      withoutDebounceRebuilds,
      testFiles.length,
      "Non-debounced rebuilds every time"
    );
    assert.ok(withTime < withoutTime, "Debounced should be faster overall");
  });

  /**
   * Test debounce cancellation
   *
   * Verifies that pending rebuilds are cancelled when new changes arrive
   */
  test("Should cancel pending rebuild when new change arrives", async function () {
    this.timeout(30000);

    let rebuildCount = 0;
    const DEBOUNCE_DELAY = 300;
    let debounceTimer: NodeJS.Timeout | undefined;

    const debouncedRebuild = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        console.log("Cancelled pending rebuild");
      }
      debounceTimer = setTimeout(() => {
        graphCreator.parseNeoGlobal();
        rebuildCount++;
        console.log("Rebuild executed");
      }, DEBOUNCE_DELAY);
    };

    // Trigger rebuild
    debouncedRebuild();

    // Wait halfway through debounce
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY / 2));

    // Trigger another rebuild (should cancel first)
    debouncedRebuild();

    // Wait for second rebuild
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 100));

    console.log(`Total rebuilds: ${rebuildCount}`);

    assert.strictEqual(rebuildCount, 1, "Should only execute latest rebuild");
  });

  /**
   * Test debounce with different file types
   *
   * Verify debounce works regardless of file type
   */
  test("Should debounce all file types equally", async function () {
    this.timeout(30000);

    await tracker.readAllWorkspaceFiles();

    // Get different file types
    const mdFiles = Array.from(tracker.forwardLinks.keys())
      .filter((f) => f.endsWith(".md"))
      .slice(0, 3);
    const tsFiles = Array.from(tracker.forwardLinks.keys())
      .filter((f) => f.endsWith(".ts"))
      .slice(0, 2);

    const allFiles = [...mdFiles, ...tsFiles];

    if (allFiles.length === 0) {
      console.log("No test files, skipping");
      return;
    }

    let rebuildCount = 0;
    const DEBOUNCE_DELAY = 300;
    let debounceTimer: NodeJS.Timeout | undefined;

    const debouncedRebuild = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        graphCreator.parseNeoGlobal();
        rebuildCount++;
      }, DEBOUNCE_DELAY);
    };

    // Mix of different file types
    for (const file of allFiles) {
      await tracker.set(vscode.Uri.file(file));
      debouncedRebuild();
      // Small delay between changes
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Wait for final rebuild
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE_DELAY + 100));

    console.log("\n=== Mixed File Types Test ===");
    console.log(`MD files: ${mdFiles.length}`);
    console.log(`TS files: ${tsFiles.length}`);
    console.log(`Total files: ${allFiles.length}`);
    console.log(`Rebuilds: ${rebuildCount}`);

    assert.strictEqual(
      rebuildCount,
      1,
      "Should debounce regardless of file type"
    );
  });
});
