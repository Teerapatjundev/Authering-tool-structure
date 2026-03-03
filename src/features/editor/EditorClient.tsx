/**
 * ===============================================
 * EDITOR CLIENT - Main Editor Component
 * ===============================================
 *
 * Component หลักของ Canvas Editor
 *
 * ความรับผิดชอบ:
 * 1. โหลด document จาก docId
 * 2. จัดการ keyboard shortcuts
 * 3. Render canvas และ overlays
 * 4. รองรับ drag & drop รูปภาพจากภายนอก
 * 5. รองรับ drag & drop elements จาก sidebar (Rectangle, Ellipse, Text)
 *
 * Keyboard Shortcuts:
 * - V: Select tool
 * - H: Pan/Hand tool
 * - Ctrl+Z: Undo
 * - Ctrl+Y / Ctrl+Shift+Z: Redo
 * - Ctrl+A: เลือกทั้งหมด
 * - Ctrl+C: Copy
 * - Ctrl+X: Cut
 * - Ctrl+V: Paste
 * - Alt+Drag: Duplicate แล้วลาก (แบบ Canva)
 * - Ctrl+S: Save
 * - Ctrl+G: Group
 * - Ctrl+Shift+G: Ungroup
 * - Delete / Backspace: ลบ
 * - Escape: ยกเลิกเลือก
 * - Arrow keys: เลื่อน nodes (Shift = เลื่อน 10px)
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDocStore } from "./stores/docStore";
import { useHistoryStore } from "./core/history/historyStore";
import { useToolStore } from "./stores/toolStore";
import { useViewStore } from "./stores/viewStore";
import { selectAll, clearSelection } from "./core/commands/selection";
import { deleteSelected, copy, paste, cut } from "./core/commands/clipboard";
import { nudgeSelection } from "./core/commands/transform";
import {
  insertImage,
  insertRect,
  insertEllipse,
  insertText,
  insertPracticeCard,
  insertConnectionPair,
} from "./core/commands/insert";
import { groupNodes, ungroupNodes } from "./core/commands/contextMenu";
import { KonvaCanvas } from "./renderer/konva/KonvaCanvas";
import { OverlayRoot } from "./renderer/overlays/OverlayRoot";
import { EditorLayout } from "./EditorLayout";
import { ContextMenu } from "./ui/ContextMenu";

interface EditorClientProps {
  docId: string;
}

export function EditorClient({ docId }: EditorClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loadDoc, doc } = useDocStore();
  const { undo, redo } = useHistoryStore();
  const { setTool } = useToolStore();
  const { centerDocument } = useViewStore();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggingElementType, setDraggingElementType] = useState<string | null>(null);

  // Canvas size state
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  // ===============================================
  // โหลด Document
  // ===============================================
  useEffect(() => {
    loadDoc(docId);
  }, [docId, loadDoc]);

  // Center document when loaded or canvas size changes
  useEffect(() => {
    if (doc && canvasSize.width > 0 && canvasSize.height > 0) {
      centerDocument(
        doc.width,
        doc.height,
        canvasSize.width,
        canvasSize.height,
      );
    }
  }, [doc?.id, canvasSize.width, canvasSize.height, centerDocument]);

  // ===============================================
  // Resize Observer - อัพเดท canvas size
  // ===============================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setCanvasSize({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };

    // Initial size
    updateSize();

    // Observe resize
    const observer = new ResizeObserver(updateSize);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  // ===============================================
  // Drag & Drop - รองรับการลากรูปจากภายนอก
  // รองรับทั้ง Desktop และ iOS/MacBook
  // ===============================================
  const handleDragOver = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
    
    const dt =
      (e as React.DragEvent).dataTransfer || (e as DragEvent).dataTransfer;
    if (!dt) return;

    const isElementType = dt.types?.includes("application/element-type");
    const isPracticeType = dt.types?.includes("application/practice-type");

    if (isElementType) {
      const type = dt.getData?.("application/element-type");
      setDraggingElementType(type || "element");
      return;
    }

    if (isPracticeType) {
      const title = dt.getData?.("application/practice-title");
      const type = dt.getData?.("application/practice-type");
      setDraggingElementType(title || type || "practice");
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if leaving the container entirely
    const relatedTarget = (e as React.DragEvent).relatedTarget as Node | null;
    if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
      setIsDraggingOver(false);
      setDraggingElementType(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent | DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      setDraggingElementType(null);

      const { screenToWorld } = useViewStore.getState();
      const container = containerRef.current;
      if (!container || !doc) return;

      // คำนวณตำแหน่ง drop ใน world coordinates
      const rect = container.getBoundingClientRect();
      const clientX = "clientX" in e ? e.clientX : (e as DragEvent).clientX;
      const clientY = "clientY" in e ? e.clientY : (e as DragEvent).clientY;
      const worldPos = screenToWorld(clientX - rect.left, clientY - rect.top);

      // ตรวจสอบว่า drop อยู่ใน canvas bounds หรือไม่
      const dropX = Math.max(50, Math.min(doc.width - 50, worldPos.x));
      const dropY = Math.max(50, Math.min(doc.height - 50, worldPos.y));

      // ตรวจสอบว่าเป็นการลาก element type หรือไม่
      const elementType =
        (e as React.DragEvent).dataTransfer?.getData?.("application/element-type") ||
        (e as DragEvent).dataTransfer?.getData?.("application/element-type");

      const practiceType =
        (e as React.DragEvent).dataTransfer?.getData?.("application/practice-type") ||
        (e as DragEvent).dataTransfer?.getData?.("application/practice-type");

      if (practiceType) {
        const title =
          (e as React.DragEvent).dataTransfer?.getData?.(
            "application/practice-title",
          ) ||
          (e as DragEvent).dataTransfer?.getData?.("application/practice-title") ||
          practiceType;

        const description =
          (e as React.DragEvent).dataTransfer?.getData?.(
            "application/practice-description",
          ) ||
          (e as DragEvent).dataTransfer?.getData?.(
            "application/practice-description",
          ) ||
          "";

        if (practiceType === "connection") {
          insertConnectionPair(dropX, dropY, title, description);
        } else {
          insertPracticeCard(dropX, dropY, title, description);
        }
        return;
      }

      if (elementType) {
        // สร้าง element ตามประเภทที่ลาก
        switch (elementType) {
          case "rect":
            insertRect(dropX, dropY, 150, 100);
            break;
          case "ellipse":
            insertEllipse(dropX, dropY, 120, 120);
            break;
          case "text":
            insertText(dropX, dropY, "Enter text");
            break;
        }
        return;
      }

      // จัดการไฟล์ที่ถูก drop
      const items =
        (e as React.DragEvent).dataTransfer?.items ||
        (e as DragEvent).dataTransfer?.items;
      const files =
        (e as React.DragEvent).dataTransfer?.files ||
        (e as DragEvent).dataTransfer?.files;

      // ตรวจสอบ URL จาก drag (เช่น ลาก URL จาก browser)
      const text =
        (e as React.DragEvent).dataTransfer?.getData?.("text/uri-list") ||
        (e as React.DragEvent).dataTransfer?.getData?.("text/plain");

      if (text && (text.startsWith("http://") || text.startsWith("https://"))) {
        // ถ้าเป็น URL รูปภาพ
        if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(text)) {
          loadImageFromUrl(text, dropX, dropY);
          return;
        }
      }

      // จัดการไฟล์รูปภาพ
      if (files && files.length > 0) {
        Array.from(files).forEach((file, index) => {
          if (file.type.startsWith("image/")) {
            const offsetX = index * 20; // Offset สำหรับหลายไฟล์
            const offsetY = index * 20;
            loadImageFromFile(file, dropX + offsetX, dropY + offsetY);
          }
        });
        return;
      }

      // รองรับ items API (สำหรับ iOS/macOS)
      if (items) {
        Array.from(items).forEach((item, index) => {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              const offsetX = index * 20;
              const offsetY = index * 20;
              loadImageFromFile(file, dropX + offsetX, dropY + offsetY);
            }
          }
        });
      }
    },
    [doc],
  );

  // Helper: โหลดรูปจาก URL
  const loadImageFromUrl = useCallback((url: string, x: number, y: number) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      // คำนวณ size ให้พอดี (max 400px)
      const maxSize = 400;
      let width = img.width;
      let height = img.height;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width *= scale;
        height *= scale;
      }
      insertImage(x, y, url, Math.round(width), Math.round(height));
    };
    img.onerror = () => {
      console.error("Failed to load image from URL:", url);
    };
    img.src = url;
  }, []);

  // Helper: โหลดรูปจากไฟล์ (แปลงเป็น data URL)
  const loadImageFromFile = useCallback((file: File, x: number, y: number) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const img = new Image();
        img.onload = () => {
          // คำนวณ size ให้พอดี (max 400px)
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          if (width > maxSize || height > maxSize) {
            const scale = maxSize / Math.max(width, height);
            width *= scale;
            height *= scale;
          }
          insertImage(x, y, dataUrl, Math.round(width), Math.round(height));
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  }, []);

  // ===============================================
  // Keyboard Shortcuts
  // ใช้ capture phase + หลาย fallback เพื่อรองรับทุก keyboard layout
  // ===============================================
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ข้าม IME composing (ภาษาจีน/ญี่ปุ่น composition)
      if (e.isComposing || e.keyCode === 229) return;

      // ตรวจสอบว่ากำลัง focus อยู่ที่ input/textarea/select/contentEditable หรือไม่
      const active = document.activeElement;
      if (
        active?.tagName === "INPUT" ||
        active?.tagName === "TEXTAREA" ||
        active?.tagName === "SELECT" ||
        (active as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const isCtrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

      // =============================================
      // Helper: ตรวจจับปุ่มข้าม layout ทั้งไทย/อังกฤษ
      // ใช้ 3 fallbacks:
      //   1. e.code   = physical key position (layout-independent)
      //   2. e.key    = character produced (ใช้ได้ตอนภาษาอังกฤษ)
      //   3. e.keyCode = deprecated แต่เชื่อถือได้ข้าม layout
      // =============================================
      const code = e.code;                 // "KeyV", "KeyZ", ...
      const key = e.key.toLowerCase();     // "v", "อ", ...
      const keyCode = e.keyCode;           // 86 (V), 90 (Z), ... ไม่เปลี่ยนตาม layout

      /**
       * ตรวจจับปุ่มตัวอักษร แม้เปลี่ยนภาษา
       * @param targetCode  - e.code ที่ต้องการ เช่น "KeyV"
       * @param targetKey   - e.key ที่ต้องการ เช่น "v"
       * @param targetKeyCode - e.keyCode ที่ต้องการ เช่น 86
       */
      const matchKey = (targetCode: string, targetKey: string, targetKeyCode: number): boolean => {
        return code === targetCode || key === targetKey || keyCode === targetKeyCode;
      };

      // Tool shortcuts (without modifier keys)
      if (!isCtrlOrCmd && !e.altKey) {
        // V = Select tool (keyCode 86)
        if (matchKey("KeyV", "v", 86)) {
          e.preventDefault();
          setTool("select");
          return;
        }
        // H = Pan/Hand tool (keyCode 72)
        if (matchKey("KeyH", "h", 72)) {
          e.preventDefault();
          setTool("pan");
          return;
        }
      }

      // Undo: Ctrl+Z (keyCode 90)
      if (isCtrlOrCmd && matchKey("KeyZ", "z", 90) && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y หรือ Ctrl+Shift+Z
      if (isCtrlOrCmd && (matchKey("KeyY", "y", 89) || (matchKey("KeyZ", "z", 90) && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // Select All: Ctrl+A (keyCode 65)
      if (isCtrlOrCmd && matchKey("KeyA", "a", 65)) {
        e.preventDefault();
        selectAll();
        return;
      }

      // Copy: Ctrl+C (keyCode 67)
      if (isCtrlOrCmd && matchKey("KeyC", "c", 67)) {
        e.preventDefault();
        copy();
        return;
      }

      // Cut: Ctrl+X (keyCode 88)
      if (isCtrlOrCmd && matchKey("KeyX", "x", 88)) {
        e.preventDefault();
        cut();
        return;
      }

      // Paste: Ctrl+V (keyCode 86)
      if (isCtrlOrCmd && matchKey("KeyV", "v", 86)) {
        e.preventDefault();
        paste();
        return;
      }

      // Save: Ctrl+S (keyCode 83)
      if (isCtrlOrCmd && matchKey("KeyS", "s", 83)) {
        e.preventDefault();
        useDocStore.getState().saveDoc();
        return;
      }

      // Ungroup: Ctrl+Shift+G (ต้องเช็คก่อน Group)
      if (isCtrlOrCmd && matchKey("KeyG", "g", 71) && e.shiftKey) {
        e.preventDefault();
        ungroupNodes();
        return;
      }

      // Group: Ctrl+G (keyCode 71)
      if (isCtrlOrCmd && matchKey("KeyG", "g", 71) && !e.shiftKey) {
        e.preventDefault();
        groupNodes();
        return;
      }

      // Delete: Delete / Backspace
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      // Escape: ยกเลิกเลือก
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Arrow keys: เลื่อน nodes
      if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;

        switch (e.key) {
          case "ArrowLeft":
            nudgeSelection(-amount, 0);
            break;
          case "ArrowRight":
            nudgeSelection(amount, 0);
            break;
          case "ArrowUp":
            nudgeSelection(0, -amount);
            break;
          case "ArrowDown":
            nudgeSelection(0, amount);
            break;
        }
      }
    };

    // ใช้ capture phase (true) เพื่อดักจับ event ก่อน Konva หรือ element อื่น
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [undo, redo, setTool]);

  return (
    <EditorLayout>
      {/* Canvas container */}
      <div
        ref={containerRef}
        className={`relative w-full h-full ${
          isDraggingOver
            ? draggingElementType
              ? "bg-blue-100"
              : "bg-blue-100"
            : "bg-gray-300"
        } transition-colors overflow-hidden`}
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <div className="px-6 py-4 text-lg font-medium text-white bg-blue-500 shadow-2xl rounded-xl">
              {draggingElementType
                ? `Drop to create ${draggingElementType}`
                : "📎 Drop image here"}
            </div>
          </div>
        )}
        <KonvaCanvas width={canvasSize.width} height={canvasSize.height} />
        {/* Overlays ต้องมี z-index ต่ำกว่า layout */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <OverlayRoot />
        </div>

        {/* Context Menu (right-click / long-press) */}
        <ContextMenu />
      </div>
    </EditorLayout>
  );
}
