/**
 * ===============================================
 * TEXT EDIT OVERLAY - แก้ไขข้อความแบบ Inline
 * ===============================================
 *
 * Input ที่วางทับบน text node สำหรับแก้ไขข้อความ
 * เหมือน Canva - พิมพ์ตรงๆ บน canvas
 *
 * Flow:
 * 1. Double-click text node บน canvas
 * 2. Input แสดงทับตำแหน่ง text (ไม่มีกรอบ)
 * 3. พิมพ์ข้อความได้ - ขยาย width/height ตามตัวอักษร
 * 4. Enter = ขึ้นบรรทัดใหม่
 * 5. Escape หรือ คลิกที่อื่น = บันทึกและปิด
 * 6. ถ้าลบ text หมด = ลบ node ทิ้ง
 *
 * ไม่มี auto line wrap - ข้อความจะยาวตามที่พิมพ์
 * กรอบ text จะขยายตามความยาวข้อความ
 */

"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useDocStore } from "../../stores/docStore";
import { useViewStore } from "../../stores/viewStore";
import { useSelectionStore } from "../../stores/selectionStore";
import { useTextEditStore } from "../../stores/textEditStore";
import { useHistoryStore } from "../../core/history/historyStore";
import { editNode } from "../../core/commands/edit";
import { TextNode } from "../../core/doc/types";
import { DeleteOp } from "../../core/history/ops";

export function TextEditOverlay() {
  const { editingNodeId, editingText, stopEditing } = useTextEditStore();
  const inputRef = useRef<HTMLDivElement>(null);
  const { doc, updateNode } = useDocStore();
  const { viewport, worldToScreen } = useViewStore();
  const { clearSelection } = useSelectionStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const activePage =
    doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;

  // หา node ที่กำลังแก้ไข
  const node = activePage?.nodes.find(
    (n) => n.id === editingNodeId && n.type === "text",
  ) as TextNode | undefined;

  // คำนวณขนาดจากข้อความ
  const calculateTextSize = useCallback(
    (text: string, fontSize: number, fontFamily: string) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return { width: 200, height: fontSize * 1.2 };

      ctx.font = `${fontSize}px ${fontFamily}`;
      const lines = text.split("\n");
      let maxWidth = 0;
      lines.forEach((line) => {
        const metrics = ctx.measureText(line || " ");
        maxWidth = Math.max(maxWidth, metrics.width);
      });

      const lineHeight = fontSize * 1.2;
      const height = Math.max(lines.length * lineHeight, lineHeight);

      return {
        width: Math.max(maxWidth + 20, 50), // minimum 50px, add padding
        height: Math.max(height + 10, fontSize * 1.5), // minimum height
      };
    },
    [],
  );

  // ตั้งค่าเริ่มต้นเมื่อเริ่มแก้ไข
  useEffect(() => {
    if (editingNodeId && inputRef.current && !isInitialized) {
      // Set initial text
      inputRef.current.innerText = editingText || "";
      // Focus and move cursor to end
      inputRef.current.focus();
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false); // false = collapse to end
      sel?.removeAllRanges();
      sel?.addRange(range);
      setIsInitialized(true);
    }
  }, [editingNodeId, editingText, isInitialized]);

  // Reset initialization when editing stops
  useEffect(() => {
    if (!editingNodeId) {
      setIsInitialized(false);
    }
  }, [editingNodeId]);

  // ถ้าไม่มีการแก้ไข → ไม่แสดง
  if (!editingNodeId || !node) return null;

  /** อ่านข้อความจาก contentEditable */
  const getCurrentText = () => {
    return inputRef.current?.innerText || "";
  };

  /** ลบ text node */
  const deleteTextNode = () => {
    const op: DeleteOp = {
      type: "delete",
      timestamp: Date.now(),
      nodeIds: [node.id],
      deletedNodes: [node],
    };
    useHistoryStore.getState().commit(op);
    clearSelection();
  };

  /** บันทึกข้อความและปิด */
  const handleSave = () => {
    const text = getCurrentText().trim();

    // ถ้าไม่มี text → ลบ node
    if (!text) {
      stopEditing();
      deleteTextNode();
      return;
    }

    const { width, height } = calculateTextSize(
      text,
      node.fontSize,
      node.fontFamily,
    );
    // Commit to history
    editNode(node.id, { text: text, width, height });
    stopEditing();
  };

  /** จัดการ keyboard shortcuts */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Escape = บันทึกและปิด
    if (e.key === "Escape") {
      e.preventDefault();
      handleSave();
    }
    // Enter = ขึ้นบรรทัดใหม่ (allow default behavior)
  };

  /** Handle input change - อัพเดท width/height real-time */
  const handleInput = () => {
    const text = getCurrentText();
    const { width, height } = calculateTextSize(
      text,
      node.fontSize,
      node.fontFamily,
    );
    // อัพเดท width/height แบบ real-time (ไม่บันทึก history)
    updateNode(editingNodeId, {
      text: text,
      width,
      height,
    });
  };

  /** คลิกที่ overlay background = บันทึกและปิด */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleSave();
    }
  };

  // คำนวณตำแหน่ง screen
  const screenPos = worldToScreen(node.x, node.y);
  const screenWidth = node.width * viewport.zoom;
  const screenHeight = node.height * viewport.zoom;
  const fontSize = node.fontSize * viewport.zoom;

  return (
    <div
      className="absolute inset-0"
      onClick={handleBackdropClick}
      style={{ pointerEvents: "auto" }}
    >
      {/* Contenteditable div ทับบน text node - โปร่งใสทั้งหมด */}
      <div
        ref={inputRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        style={{
          position: "absolute",
          left: screenPos.x - screenWidth / 2,
          top: screenPos.y - screenHeight / 2,
          minWidth: screenWidth,
          minHeight: screenHeight,
          fontSize: fontSize,
          fontFamily: node.fontFamily,
          fontWeight: node.fontStyle?.includes("bold") ? "bold" : "normal",
          fontStyle: node.fontStyle?.includes("italic") ? "italic" : "normal",
          textDecoration: node.underline ? "underline" : "none",
          color: node.fill,
          textAlign: node.align as "left" | "center" | "right" | undefined,
          lineHeight: 1.2,
          padding: "0",
          margin: 0,
          border: "none",
          outline: "none",
          backgroundColor: "transparent",
          whiteSpace: "pre-wrap",
          wordBreak: "keep-all",
          overflow: "visible",
          transform: `rotate(${node.rotation}deg)`,
          transformOrigin: "top left",
          caretColor: node.fill,
          cursor: "text",
        }}
      />
    </div>
  );
}
