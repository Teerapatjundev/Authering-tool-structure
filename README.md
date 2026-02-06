# Canvas Editor

A Canva-like visual editor built with Next.js (App Router), TypeScript, React, and Konva.

## Features

- ✅ **Multi-selection**: Shift-click, marquee select, multi-drag
- ✅ **Transform controls**: Resize, rotate with Konva.Transformer
- ✅ **Undo/Redo**: Operation-based history
- ✅ **Auto-save**: Automatic saving to localStorage
- ✅ **Keyboard shortcuts**: Comprehensive keyboard support
- ✅ **Alignment tools**: Align left/center/right/top/middle/bottom
- ✅ **Layer management**: Bring to front, send to back
- ✅ **Inspector panel**: Edit properties of selected elements
- ✅ **Zoom & Pan**: Mouse wheel zoom, Space+drag pan
- ✅ **Multiple node types**: Rectangle, Ellipse, Text, Image, Video

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### Build

```bash
npm run build
npm start
```

## Keyboard Shortcuts

- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z** or **Ctrl/Cmd + Y**: Redo
- **Ctrl/Cmd + A**: Select all
- **Ctrl/Cmd + C**: Copy
- **Ctrl/Cmd + X**: Cut
- **Ctrl/Cmd + V**: Paste
- **Delete/Backspace**: Delete selected
- **Escape**: Clear selection
- **Arrow keys**: Nudge selected (Shift = 10px)
- **Space + Drag**: Pan canvas
- **Mouse wheel**: Zoom (cursor-centered)

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── dashboard/                # Document list
│   ├── editor/[docId]/           # Editor page
│   └── api/                      # API routes (placeholder)
│
├── features/editor/              # Main editor feature
│   ├── EditorClient.tsx          # Editor entry with keyboard shortcuts
│   ├── EditorLayout.tsx          # Layout with panels
│   │
│   ├── core/                     # Core logic
│   │   ├── doc/                  # Document types & schema
│   │   ├── commands/             # Command pattern for actions
│   │   ├── history/              # Undo/redo operations
│   │   ├── geometry/             # Bounds, hit-test, snap, transforms
│   │   └── io/                   # Export utilities
│   │
│   ├── stores/                   # Zustand state management
│   │   ├── docStore.ts           # Document state
│   │   ├── selectionStore.ts    # Selection state
│   │   ├── viewStore.ts          # Viewport state
│   │   ├── toolStore.ts          # Active tool
│   │   ├── uiStore.ts            # UI state (panels, modals)
│   │   └── assetsStore.ts        # Assets management
│   │
│   ├── renderer/                 # Rendering layer
│   │   ├── konva/                # Konva canvas & shapes
│   │   │   ├── KonvaCanvas.tsx
│   │   │   ├── RenderNodes.tsx
│   │   │   ├── SelectionController.tsx
│   │   │   ├── GuidesLayer.tsx
│   │   │   └── EventBridge.ts
│   │   └── overlays/             # DOM overlays (text edit, video)
│   │
│   ├── ui/                       # UI components
│   │   ├── TopBar/               # Toolbar with tools & controls
│   │   ├── LeftPanel/            # Elements & assets panels
│   │   ├── RightPanel/           # Inspector & layers panels
│   │   ├── Modals/               # Modal dialogs
│   │   └── Toasts/               # Toast notifications
│   │
│   └── assets/                   # Asset management
│       ├── imageCache.ts
│       └── fontLoader.ts
│
├── services/                     # External services
│   └── api/                      # API clients
│       ├── docs.service.ts       # Document persistence (localStorage)
│       ├── assets.service.ts
│       └── export.service.ts
│
└── shared/                       # Shared utilities
    ├── utils/
    └── styles/
```

## Architecture

### State Management

- **Zustand** with Immer for immutable state updates
- Separate stores for different concerns (document, selection, view, tools, UI)

### Command Pattern

All user actions are executed through commands that can be undone/redone:

- `InsertOp`, `DeleteOp`, `MoveOp`, `TransformOp`, `EditOp`, `ArrangeOp`

### Coordinate System

- **Center-based coordinates**: All nodes use (x, y) as their center point
- Konva shapes use `offsetX` and `offsetY` set to half dimensions
- This ensures proper rotation and scaling behavior

### Multi-Selection & Transform

- Selection proxy rectangle for multi-selection
- Konva.Transformer applies delta transforms to all selected nodes
- Transform committed on `onTransformEnd` to history

### Persistence

- Documents stored in localStorage via `docsService`
- Auto-save on operation commit (debounced)
- Schema validation with Zod

## Future Enhancements

- [ ] Server-side persistence API
- [ ] Real-time collaboration
- [ ] More shape types (polygon, star, path)
- [ ] Grouping & hierarchy
- [ ] Effects & filters
- [ ] Export to PDF, SVG
- [ ] Template library
- [ ] Animation timeline
- [ ] Plugin system

## License

MIT
# authering-tool-structure
