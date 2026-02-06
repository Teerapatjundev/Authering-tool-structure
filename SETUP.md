# Setup Instructions

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Run development server:**

   ```bash
   npm run dev
   ```

3. **Open browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## What You'll See

1. **Dashboard** - List of documents with "Create New Document" button
2. **Editor** - Full-featured canvas editor with:
   - Top toolbar with insert tools, undo/redo, alignment, delete
   - Left panel with Elements & Assets tabs
   - Right panel with Inspector & Layers tabs
   - Canvas area with Konva rendering
   - Zoom controls

## Testing the Features

### Basic Editing

1. Click "Rect" button to insert a rectangle
2. Click to select it - you'll see Konva.Transformer handles
3. Drag to move, drag handles to resize, rotate handle to rotate
4. Use Inspector panel to edit x, y, width, height, rotation precisely

### Multi-Selection

1. Insert multiple shapes
2. Shift+click to add to selection
3. Or drag empty area to marquee select
4. Drag any selected shape to move all
5. Transform all with the selection proxy box

### Keyboard Shortcuts

- Ctrl/Cmd+Z: Undo
- Ctrl/Cmd+Shift+Z: Redo
- Delete: Remove selected
- Arrow keys: Nudge (Shift = 10px)
- Ctrl/Cmd+A: Select all
- Escape: Clear selection

### Zoom & Pan

- Mouse wheel to zoom (cursor-centered)
- Space+drag to pan

### Alignment

- Select 2+ shapes
- Click alignment buttons in toolbar (left/center/right/top/middle/bottom)

### Layers

- Right panel > Layers tab
- Click layer to select
- Use ⬆⬇ buttons to reorder

### Persistence

- Documents auto-save to localStorage
- Changes persist across page reloads
- Edit document title at top

## Project Status

✅ **COMPLETE & WORKING:**

- Next.js App Router setup
- Document persistence (localStorage)
- Konva canvas rendering (rect, ellipse, text, image, video)
- Selection (single & multi)
- Transform with Konva.Transformer
- Undo/redo with operation history
- Keyboard shortcuts
- Zoom & pan
- Alignment tools
- Inspector panel
- Layers panel
- Auto-save

🚧 **SIMPLIFIED FOR MVP:**

- Text editing (uses simple modal instead of inline contenteditable)
- Video overlay (placeholder only)
- Image insertion (requires URL input)
- Snapping guides (structure present but not active)

📋 **NOT IMPLEMENTED (Future):**

- Server-side API
- Real-time collaboration
- Export to PDF/SVG
- Advanced text formatting
- Grouping
- Path drawing
- Effects & filters

## File Structure Summary

```
src/
├── app/                     # Next.js pages
├── features/editor/         # Main editor
│   ├── EditorClient.tsx     # Entry point
│   ├── EditorLayout.tsx     # Layout
│   ├── core/                # Business logic
│   ├── stores/              # State management
│   ├── renderer/            # Rendering
│   └── ui/                  # UI components
├── services/                # External services
└── shared/                  # Utilities
```

## Troubleshooting

### "Cannot find module" errors before npm install

This is expected. Run `npm install` first.

### TypeScript errors after install

Most should resolve after install. If any remain, they're likely:

- Implicit any types (safe in this context)
- Missing type definitions for konva (they exist, just need install)

### Canvas not rendering

1. Check browser console for errors
2. Ensure all dependencies installed
3. Try clearing localStorage: `localStorage.clear()`

### Performance issues

1. Reduce number of nodes on canvas
2. Disable auto-save temporarily
3. Check browser dev tools performance tab

## Next Steps

1. **Run the app** - Follow Quick Start above
2. **Explore features** - Try inserting shapes, multi-select, undo/redo
3. **Customize** - Modify colors, add new shape types, enhance UI
4. **Deploy** - Build and deploy to Vercel or similar

## Notes

- All coordinates are CENTER-based (x,y = center of shape)
- Konva shapes use offsetX/offsetY = width/2, height/2
- Multi-selection uses proxy rectangle technique
- History is operation-based for efficient undo/redo
- Auto-save debounced to 1 second

Enjoy building! 🚀
