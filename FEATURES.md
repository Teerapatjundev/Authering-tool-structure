# Canva-like Editor - ฟีเจอร์ใหม่

## UI Improvements (อัปเดตล่าสุด)

### 1. **Canvas Background (แบบ Presentation)**

- กระดาษเป็นสีขาวพร้อมขอบแดง
- พื้นหลังด้านนอกเป็นแบบ gradient (แดง-ขาว-น้ำเงิน)
- เพื่อให้ดูเหมือน presentation paper

### 2. **Grid Background**

- ตารางพื้นหลังแบบจุด (grid dots)
- ช่วยจัดแนวและ positioning
- Major grid (หนาเข้มกว่า) ทุก 100px
- Minor grid (หบาง) ทุก 20px

### 3. **Smart Guides + Snap**

- **Snap Detection**: เมื่อลากอบเจ็กต์เข้าใกล้ขอบของอบเจ็กต์อื่น
  - ตรวจหา: ขอบซ้าย/ขวา, จุดศูนย์กลาง, ช่องว่างระหว่างอบเจ็กต์
  - ทำให้ "ติด" กับจุด snap โดยอัตโนมัติ (snap distance = 8px)
- **Visual Guides**: เส้นสีม่วง (magenta) แบบ dashed
  - แสดงเมื่อไหร่: เมื่อคุณลากอบเจ็กต์ที่มีความสูงใกล้
  - ช่วยให้เห็นว่าจะ snap ไปที่ไหน

### 4. **Dynamic Inspector Panel** (Properties)

#### Single Selection (เลือก 1 item)

- **Position & Size Section**
  - X, Y, Width, Height
  - Real-time editing
- **Transform Section**
  - Rotation (องศา)
  - Opacity (0-100%)
- **Appearance** (สำหรับ Rect/Ellipse)
  - Fill Color (color picker + hex input)
- **Text Properties** (สำหรับ Text nodes)
  - Content (textarea - แก้ไขโดยตรงที่นี่)
  - Font Size
  - Font Family (Arial, Helvetica, Times New Roman, Courier New, Georgia, Verdana)
  - Text Color

#### Multiple Selection (เลือก 2+ items)

- แสดงเฉพาะ properties ทั่วไป
- ข้อความแสดง "X items selected"
- เพื่อหลีกเลี่ยงความสับสน

### 5. **Inline Text Editing**

#### วิธีใช้:

1. **Double-click** ที่ text node
2. **Modal editor** จะเปิดขึ้น
   - Display: white modal with textarea
   - Full text editor experience
3. **Keyboard shortcuts:**
   - `Enter` → สร้างบรรทัดใหม่
   - `Ctrl+Enter` หรือ `Cmd+Enter` → บันทึกแล้วปิด
   - `Esc` → ยกเลิก (ไม่บันทึก)

#### Features:

- Real-time text preview ใน canvas
- Support multiline text ด้วย Enter
- Font size/family ปรับได้จาก Inspector
- Text color ปรับได้จาก Inspector

## File Structure (ไฟล์ที่สำคัญ)

```
src/features/editor/
├── renderer/
│   ├── konva/
│   │   ├── KonvaCanvas.tsx         ← White canvas with red border + grid
│   │   ├── GridLayer.tsx           ← Grid background (ไฟล์ใหม่)
│   │   ├── GuidesLayer.tsx         ← Smart guides visualization
│   │   ├── RenderNodes.tsx         ← Added double-click text edit
│   │   └── EventBridge.ts          ← Added snap detection
│   └── overlays/
│       └── TextEditOverlay.tsx     ← Modal text editor (improved)
│
├── stores/
│   ├── snapGuidesStore.ts          ← Store snap guide positions (ไฟล์ใหม่)
│   ├── textEditStore.ts            ← Store text editing state (ไฟล์ใหม่)
│   └── ...
│
├── ui/
│   └── RightPanel/
│       └── InspectorPanel.tsx      ← Dynamic properties (improved)
│
└── core/
    └── geometry/
        └── snap.ts                 ← Snap detection logic (enhanced)
```

## ฟีเจอร์ที่มีแล้ว (จากเดิม)

✅ Multi-selection & transform
✅ Undo/Redo
✅ Keyboard shortcuts
✅ Zoom & Pan
✅ Alignment tools
✅ Layers panel
✅ Auto-save
✅ Image & Video support

## ฟีเจอร์ที่จะมาต่อ

- [ ] Group/Ungroup
- [ ] More snap options (distribute, space between)
- [ ] Custom snap guides
- [ ] Lock/Unlock layers
- [ ] Layer blending modes
- [ ] Advanced text styling (bold, italic, underline)
- [ ] Export to PDF/PNG

## วิธีทดสอบ

1. **Grid**: ลาก element ดู grid dots
2. **Snap**: ลาก element เข้าใกล้ element อื่น แล้วดูเส้นม่วง
3. **Text Editing**: Double-click text element ทดสอบ Enter สำหรับ newline
4. **Properties**: เลือก element ต่างๆ ดู properties เปลี่ยน

---

**สร้างเมื่อ**: February 6, 2026
**Stack**: Next.js 14 + React 18 + react-konva + Zustand + Tailwind CSS
