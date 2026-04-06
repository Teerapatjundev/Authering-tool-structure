# Canvas Editor - Minimal Core

Canvas Editor พื้นฐานสำหรับการเรียนรู้ สร้างด้วย **Next.js**, **TypeScript**, **React-Konva**, และ **Zustand**

## Features พื้นฐานที่รองรับ

- ✅ **ลาก (Drag)** - ลาก nodes ไปมาบน canvas
- ✅ **เพิ่ม Node** - เพิ่ม rect, ellipse, text, image, video
- ✅ **Selection** - เลือก node เดียว หรือหลาย nodes (marquee select)
- ✅ **Transform** - ย่อขยาย/หมุน nodes
- ✅ **Group Selection** - ลากคลุมเลือกหลาย nodes
- ✅ **Text Editing** - double-click เพื่อแก้ไขข้อความ
- ✅ **Video Overlay** - แสดง video ทับ canvas
- ✅ **Undo/Redo** - ย้อนกลับ/ทำซ้ำ
- ✅ **Pan & Zoom** - เลื่อน & ซูม canvas
- ✅ **Snap** - จัดตำแหน่งอัตโนมัติ
- ✅ **Auto-save** - บันทึกลง IndexedDB อัตโนมัติ

## โครงสร้างโปรเจค

```
src/features/editor/
├── EditorClient.tsx          # Component หลัก + keyboard shortcuts
├── core/
│   ├── doc/
│   │   ├── types.ts          # Type definitions (Node, Document, etc.)
│   │   └── migrate.ts        # สร้าง empty document
│   ├── commands/
│   │   ├── index.ts          # Export ทุก commands
│   │   ├── insert.ts         # เพิ่ม nodes (rect, ellipse, text, image, video)
│   │   ├── selection.ts      # selectAll, clearSelection
│   │   ├── transform.ts      # commitMove, commitTransform, nudgeSelection
│   │   ├── edit.ts           # editNode (แก้ไข properties)
│   │   └── clipboard.ts      # copy, cut, paste, delete, duplicate
│   ├── geometry/
│   │   ├── bounds.ts         # คำนวณ bounds
│   │   ├── hitTest.ts        # หา node ที่คลิก
│   │   └── snap.ts           # snap เข้ากับ node อื่น
│   └── history/
│       ├── ops.ts            # Operation types + inverseOp
│       └── historyStore.ts   # Undo/Redo store
├── stores/
│   ├── docStore.ts           # Document state
│   ├── selectionStore.ts     # Selection state
│   ├── viewStore.ts          # Viewport (pan/zoom)
│   ├── toolStore.ts          # Active tool
│   ├── textEditStore.ts      # Text editing state
│   └── snapGuidesStore.ts    # Snap guide lines
└── renderer/
    ├── konva/
    │   ├── KonvaCanvas.tsx   # Canvas หลัก
    │   ├── RenderNodes.tsx   # Render ทุก nodes
    │   ├── EventBridge.ts    # จัดการ mouse events
    │   ├── SelectionController.tsx  # Transform handles
    │   └── GuidesLayer.tsx   # เส้น snap guides
    └── overlays/
        ├── OverlayRoot.tsx   # รวม overlays
        ├── TextEditOverlay.tsx  # Modal แก้ไขข้อความ
        └── VideoOverlay.tsx  # Video player
```

## Data Flow

```
User Action
    │
    ▼
EventBridge (mouse events) ──► Commands (insert, transform, etc.)
    │                              │
    │                              ▼
    │                         HistoryStore.commit(op)
    │                              │
    │                              ▼
    │                         applyOperation()
    │                              │
    ▼                              ▼
Stores (doc, selection, view) ◄───┘
    │
    ▼
React re-render
    │
    ▼
Konva Canvas (RenderNodes, SelectionController)
```

## Keyboard Shortcuts

| Keys                  | Action            |
| --------------------- | ----------------- |
| Ctrl+Z                | Undo              |
| Ctrl+Y / Ctrl+Shift+Z | Redo              |
| Ctrl+A                | เลือกทั้งหมด      |
| Ctrl+C                | Copy              |
| Ctrl+X                | Cut               |
| Ctrl+V                | Paste             |
| Delete / Backspace    | ลบ                |
| Escape                | ยกเลิกเลือก       |
| Arrow Keys            | เลื่อน nodes 1px  |
| Shift + Arrow Keys    | เลื่อน nodes 10px |

## การใช้งาน

### 1. เริ่มต้น Development

```bash
npm install
npm run dev
```

เปิด http://localhost:3000/editor/demo

### 2. เพิ่ม Node ด้วยโค้ด

```typescript
import {
  insertRect,
  insertText,
  insertEllipse,
} from "@/features/editor/core/commands";

// เพิ่มสี่เหลี่ยม
insertRect(500, 300, 100, 100);

// เพิ่มข้อความ
insertText(600, 400, "Hello World");

// เพิ่มวงรี
insertEllipse(700, 500, 150, 100);
```

### 3. แก้ไข Node

```typescript
import { editNode } from "@/features/editor/core/commands";

// เปลี่ยนสี
editNode("node_abc123", { fill: "#ff0000" });

// เปลี่ยนข้อความ
editNode("node_text456", { text: "New Text", fontSize: 32 });
```

### 4. Transform Node

```typescript
import { commitTransform } from "@/features/editor/core/commands";

// ย่อขยาย + หมุน
commitTransform([
  {
    id: "node_abc123",
    changes: {
      width: 200,
      height: 150,
      rotation: 45,
    },
  },
]);
```

## Node Types

### BaseNode (ทุก node มี)

```typescript
{
  id: string; // รหัสเฉพาะ
  type: NodeType; // "rect" | "ellipse" | "text" | "image" | "video"
  x: number; // ตำแหน่ง X (กึ่งกลาง)
  y: number; // ตำแหน่ง Y (กึ่งกลาง)
  width: number;
  height: number;
  rotation: number; // องศา
  opacity: number; // 0-1
  locked: boolean;
  visible: boolean;
}
```

### RectNode

```typescript
{
  ...BaseNode,
  type: "rect",
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}
```

### EllipseNode

```typescript
{
  ...BaseNode,
  type: "ellipse",
  fill: string;
  stroke?: string;
  strokeWidth?: number;
}
```

### TextNode

```typescript
{
  ...BaseNode,
  type: "text",
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  fontStyle?: "normal" | "bold" | "italic";
  align?: "left" | "center" | "right";
}
```

### ImageNode

```typescript
{
  ...BaseNode,
  type: "image",
  src: string;  // URL รูปภาพ
}
```

### VideoNode

```typescript
{
  ...BaseNode,
  type: "video",
  src: string;  // URL วิดีโอ
}
```

## License

MIT
