# Test Suite

Comprehensive tests for benchmarking and validating the Obsidian Visualizer extension.

## Quick Start

```bash
npm test
```

## Test Files

- **benchmark.test.ts** - Performance benchmarks (parse time, rebuild time, memory)
- **obsiFileTracker.test.ts** - File tracking and link extraction tests
- **graphCreator.test.ts** - Graph generation tests
- **memoryManagement.test.ts** - Memory leak detection
- **performanceRegression.test.ts** - Performance regression tracking
- **debounce.test.ts** - Future: debounce tests
- **incrementalUpdate.test.ts** - Future: incremental update tests

## What You Can Benchmark

### ✅ Rebuild Times Per Edit
```bash
npm test | grep "Average rebuild time"
```

### ✅ Memory Usage
```bash
npm test | grep "Memory"
```

### ✅ Parse Performance
```bash
npm test | grep "Full Workspace Parse"
```

## Before/After Comparison

```bash
# Before optimization
npm test 2>&1 | tee before.log

# After optimization
npm test 2>&1 | tee after.log

# Compare
diff before.log after.log
```

## Test Workspace

Tests use sample markdown files in `asset/sample-notes/` with wiki-style links for testing graph generation.
