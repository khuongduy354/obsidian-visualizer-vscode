# Graph Customization Settings

## Problem
Large vaults (hundreds of files) create cluttered graphs with overlapping nodes, making visualization unusable. Users needed fine-grained control over graph appearance and physics similar to Obsidian.

## Solution
Added 8 VSCode settings under `obsidianVisualizer.graph.*`:

### Visual Settings
- `nodeSize`: Control node radius (5-50px, default 20)
- `fontSize`: Control label size (6-24px, default 11)

### Physics/Force Settings
- `repulsionForce`: How much nodes push apart (100-3000, default 800)
- `linkDistance`: Target distance between connected nodes (30-500, default 120)
- `linkStrength`: Link attraction force (0.001-0.1, default 0.005)
- `centerForce`: Gravity toward center (0-0.1, default 0.01)
- `collisionRadius`: Collision detection radius (10-100, default 35)
- `velocityDecay`: Friction/damping (0.1-0.9, default 0.4)

## Implementation

1. **package.json**: Added configuration schema with sensible ranges
2. **CustomGraphRenderer.ts**: Modified constructor to accept config params instead of hardcoded values
3. **GraphWebView.ts**: Added `getGraphConfig()` to read VSCode settings and inject them into webview

## Usage

For large vaults, increase `repulsionForce` (e.g., 1500-2000) and `linkDistance` (e.g., 200-300) to spread nodes apart.

For tighter graphs, decrease `repulsionForce` (e.g., 400-600) and `linkDistance` (e.g., 60-100).

## Future Improvements
- Settings UI panel within the graph view
- Per-vault settings (workspace vs user settings)
- Presets for common vault sizes (small/medium/large)
