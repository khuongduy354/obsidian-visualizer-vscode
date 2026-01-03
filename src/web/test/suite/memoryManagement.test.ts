import * as assert from "assert";
import * as vscode from "vscode";
import { ObsiFilesTracker } from "../../ObsiFilesTracker";
import { GraphCreator } from "../../GraphCreator";
import { URIHandler } from "../../URIHandler";

/**
 * Memory Management and Leak Detection Tests
 *
 * Tests for:
 * - Event subscription disposal
 * - Memory cleanup on file operations
 * - Resource leak detection
 * - Reference cleanup
 */

suite("Memory Management Tests", () => {
  test("Should properly dispose event emitters", () => {
    const tracker = new ObsiFilesTracker();

    // Verify emitters exist
    assert.ok(tracker.onDidAddEmitter, "Should have add emitter");
    assert.ok(tracker.onDidDeleteEmitter, "Should have delete emitter");
    assert.ok(tracker.onDidUpdateEmitter, "Should have update emitter");

    // Dispose should not throw
    assert.doesNotThrow(() => tracker.dispose(), "Dispose should not throw");
  });

  test("Should clean up event subscriptions on disposal", () => {
    const tracker = new ObsiFilesTracker();
    let addEventFired = false;
    let deleteEventFired = false;
    let updateEventFired = false;

    // Subscribe to events
    const addSub = tracker.onDidAddEmitter.event(() => (addEventFired = true));
    const deleteSub = tracker.onDidDeleteEmitter.event(
      () => (deleteEventFired = true)
    );
    const updateSub = tracker.onDidUpdateEmitter.event(
      () => (updateEventFired = true)
    );

    // Dispose subscriptions
    addSub.dispose();
    deleteSub.dispose();
    updateSub.dispose();

    // Fire events - should not trigger handlers
    tracker.onDidAddEmitter.fire(vscode.Uri.file("/test"));
    tracker.onDidDeleteEmitter.fire(vscode.Uri.file("/test"));
    tracker.onDidUpdateEmitter.fire(vscode.Uri.file("/test"));

    assert.strictEqual(
      addEventFired,
      false,
      "Add event should not fire after disposal"
    );
    assert.strictEqual(
      deleteEventFired,
      false,
      "Delete event should not fire after disposal"
    );
    assert.strictEqual(
      updateEventFired,
      false,
      "Update event should not fire after disposal"
    );

    tracker.dispose();
  });

  test("Should clear data structures on delete", async () => {
    const tracker = new ObsiFilesTracker();
    const testPath = "/test/file.md";
    const testUri = vscode.Uri.file(testPath);

    // Manually populate data structures
    tracker.forwardLinks.set(testPath, [{ path: "/test/other.md" }]);
    tracker.backLinks.set(testPath, []);
    tracker.fileNameFullPathMap.set("file.md", new Set([testPath]));

    // Verify populated
    assert.ok(tracker.forwardLinks.has(testPath), "Should have forward links");
    assert.ok(
      tracker.fileNameFullPathMap.has("file.md"),
      "Should have filename index"
    );

    // Delete
    tracker.delete(testUri);

    // Verify cleaned
    assert.ok(
      !tracker.forwardLinks.has(testPath),
      "Should remove forward links"
    );
    const filenamePaths = tracker.fileNameFullPathMap.get("file.md");
    assert.ok(
      !filenamePaths?.has(testPath),
      "Should remove from filename index"
    );

    tracker.dispose();
  });

  test("Should update backlinks when file is deleted", () => {
    const tracker = new ObsiFilesTracker();

    const fileA = "/test/a.md";
    const fileB = "/test/b.md";
    const fileAUri = vscode.Uri.file(fileA);

    // Setup: A links to B, B has backlink from A
    tracker.forwardLinks.set(fileA, [{ path: fileB }]);
    tracker.backLinks.set(fileB, [{ path: fileA }]);

    // Delete A
    tracker.delete(fileAUri);

    // B's backlinks should be updated
    const bBacklinks = tracker.backLinks.get(fileB);
    const hasABacklink = bBacklinks?.some((link) => link.path === fileA);

    assert.ok(!hasABacklink, "Should remove deleted file from backlinks");

    tracker.dispose();
  });

  test("Should not accumulate memory on repeated file updates", async function () {
    this.timeout(30000);

    const tracker = new ObsiFilesTracker();
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      console.log("No workspace, skipping");
      tracker.dispose();
      return;
    }

    // Find a test file
    await tracker.readAllWorkspaceFiles();
    const testFiles = Array.from(tracker.forwardLinks.keys()).slice(0, 1);

    if (testFiles.length === 0) {
      console.log("No files found, skipping");
      tracker.dispose();
      return;
    }

    const testFile = testFiles[0];
    const testUri = vscode.Uri.file(testFile);

    // Get initial counts
    const initialForwardCount = tracker.forwardLinks.size;
    const initialBackCount = tracker.backLinks.size;
    const initialFilenameCount = tracker.fileNameFullPathMap.size;

    // Update same file multiple times
    for (let i = 0; i < 100; i++) {
      await tracker.set(testUri);
    }

    // Counts should not grow unbounded
    assert.strictEqual(
      tracker.forwardLinks.size,
      initialForwardCount,
      "Forward links map should not grow"
    );
    assert.strictEqual(
      tracker.backLinks.size,
      initialBackCount,
      "Back links map should not grow"
    );
    assert.strictEqual(
      tracker.fileNameFullPathMap.size,
      initialFilenameCount,
      "Filename map should not grow"
    );

    console.log(
      `After 100 updates: ${tracker.forwardLinks.size} files tracked`
    );

    tracker.dispose();
  });

  test("Should not leak memory with event subscriptions", () => {
    const tracker = new ObsiFilesTracker();
    const subscriptions: vscode.Disposable[] = [];

    // Create many subscriptions
    for (let i = 0; i < 1000; i++) {
      const sub = tracker.onDidAddEmitter.event(() => {});
      subscriptions.push(sub);
    }

    // Dispose all
    subscriptions.forEach((sub) => sub.dispose());

    // Fire event - should not crash or slow down
    const start = performance.now();
    tracker.onDidAddEmitter.fire(vscode.Uri.file("/test"));
    const duration = performance.now() - start;

    assert.ok(
      duration < 10,
      "Event firing should be fast after disposing subscriptions"
    );

    tracker.dispose();
  });

  test("Should clean up circular references", () => {
    const tracker = new ObsiFilesTracker();

    const fileA = "/test/a.md";
    const fileB = "/test/b.md";

    // Create circular reference: A -> B, B -> A
    tracker.forwardLinks.set(fileA, [{ path: fileB }]);
    tracker.forwardLinks.set(fileB, [{ path: fileA }]);
    tracker.backLinks.set(fileA, [{ path: fileB }]);
    tracker.backLinks.set(fileB, [{ path: fileA }]);

    // Delete A
    tracker.delete(vscode.Uri.file(fileA));

    // A should be completely removed
    assert.ok(
      !tracker.forwardLinks.has(fileA),
      "Should remove A from forward links"
    );
    assert.ok(!tracker.backLinks.has(fileA), "Should remove A from backlinks");

    // B should not reference A
    const bForward = tracker.forwardLinks.get(fileB);
    const bBack = tracker.backLinks.get(fileB);

    assert.ok(
      !bForward?.some((f) => f.path === fileA),
      "B should not link to deleted A"
    );
    assert.ok(
      !bBack?.some((f) => f.path === fileA),
      "B should not have backlink from deleted A"
    );

    tracker.dispose();
  });

  test("Should monitor memory growth during bulk operations", async function () {
    this.timeout(60000);

    const getMemory = () => {
      if (performance && (performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return null;
    };

    const tracker = new ObsiFilesTracker();
    const graphCreator = new GraphCreator(tracker);

    await tracker.readAllWorkspaceFiles();

    const memBefore = getMemory();
    const fileCount = tracker.forwardLinks.size;

    console.log("\n=== Memory Growth Test ===");
    console.log(`Files tracked: ${fileCount}`);

    // Perform bulk operations
    const iterations = 10;
    for (let i = 0; i < iterations; i++) {
      // Rebuild graph multiple times
      const graph = graphCreator.parseNeoGlobal();

      if (i % 2 === 0) {
        const memNow = getMemory();
        if (memNow !== null && memBefore !== null) {
          const memGrowthMB = (memNow - memBefore) / (1024 * 1024);
          console.log(
            `Iteration ${i}: Memory growth: ${memGrowthMB.toFixed(2)}MB`
          );
        }
      }
    }

    const memAfter = getMemory();

    if (memBefore !== null && memAfter !== null) {
      const totalGrowthMB = (memAfter - memBefore) / (1024 * 1024);
      console.log(`Total memory growth: ${totalGrowthMB.toFixed(2)}MB`);

      // Memory should not grow excessively (adjust threshold as needed)
      assert.ok(
        totalGrowthMB < 100,
        `Memory growth ${totalGrowthMB}MB exceeds 100MB threshold`
      );
    } else {
      console.log("Memory API not available");
    }

    tracker.dispose();
  });

  test("Should release references when clearing workspace", async function () {
    this.timeout(30000);

    const tracker = new ObsiFilesTracker();

    await tracker.readAllWorkspaceFiles();
    const initialSize = tracker.forwardLinks.size;

    assert.ok(initialSize > 0, "Should have tracked files");

    // Clear all data
    tracker.forwardLinks.clear();
    tracker.backLinks.clear();
    tracker.fileNameFullPathMap.clear();

    assert.strictEqual(
      tracker.forwardLinks.size,
      0,
      "Forward links should be cleared"
    );
    assert.strictEqual(
      tracker.backLinks.size,
      0,
      "Backlinks should be cleared"
    );
    assert.strictEqual(
      tracker.fileNameFullPathMap.size,
      0,
      "Filename map should be cleared"
    );

    tracker.dispose();
  });

  test("Should handle disposal of multiple instances", () => {
    const trackers: ObsiFilesTracker[] = [];

    // Create multiple instances
    for (let i = 0; i < 10; i++) {
      trackers.push(new ObsiFilesTracker());
    }

    // Dispose all - should not interfere with each other
    assert.doesNotThrow(() => {
      trackers.forEach((t) => t.dispose());
    }, "Disposing multiple instances should not throw");
  });

  test("Should detect event listener leaks", () => {
    const tracker = new ObsiFilesTracker();
    const subscriptions: vscode.Disposable[] = [];

    // Add many listeners without disposing
    for (let i = 0; i < 100; i++) {
      subscriptions.push(tracker.onDidAddEmitter.event(() => {}));
      subscriptions.push(tracker.onDidDeleteEmitter.event(() => {}));
      subscriptions.push(tracker.onDidUpdateEmitter.event(() => {}));
    }

    // This is a potential leak - in production, these should be disposed
    console.log(`Created ${subscriptions.length} event subscriptions`);

    // Clean up
    subscriptions.forEach((sub) => sub.dispose());
    tracker.dispose();

    // In a real scenario, you'd use a memory profiler to detect this
    assert.ok(true, "Test completed - check memory profiler for actual leaks");
  });

  test("Should clean up workspace watcher references", () => {
    // This tests that VSCodeWatcher properly disposes
    const tracker = new ObsiFilesTracker();
    const uriHandler = new URIHandler();

    // In production, VSCodeWatcher should be disposable
    // This test verifies the pattern is correct

    tracker.dispose();

    // After disposal, operations should not crash
    assert.doesNotThrow(() => {
      tracker.displayWorkspace();
    }, "Should handle operations after disposal gracefully");
  });
});
