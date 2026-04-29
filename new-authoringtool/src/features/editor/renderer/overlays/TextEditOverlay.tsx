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

  /** คำนวณความสูงของข้อความเมื่อ word-wrap ที่ความกว้างคงที่ */
  const calculateWrappedHeight = useCallback(
    (
      text: string,
      fontSize: number,
      fontFamily: string,
      fontStyle: string | undefined,
      maxWidth: number,
      padding: number = 0,
    ) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return Math.max(fontSize * 1.5, 24);
      const weight = fontStyle?.includes("bold") ? "bold" : "normal";
      const italic = fontStyle?.includes("italic") ? "italic" : "normal";
      ctx.font = `${italic} ${weight} ${fontSize}px ${fontFamily}`.trim();
      const innerWidth = Math.max(1, maxWidth - 2 * padding);
      const lineHeight = fontSize * 1.2;
      let totalLines = 0;
      for (const paragraph of text.split("\n")) {
        if (!paragraph) { totalLines++; continue; }
        const words = paragraph.split(" ");
        let currentLine = "";
        for (const word of words) {
          const candidate = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(candidate).width > innerWidth && currentLine) {
            totalLines++;
            currentLine = word;
          } else {
            currentLine = candidate;
          }
        }
        totalLines++;
      }
      return Math.max(
        totalLines * lineHeight + 2 * padding + 10,
        fontSize * 1.5 + 2 * padding,
      );
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
    const { doc } = useDocStore.getState();
    if (!doc) return;

    const op: DeleteOp = {
      type: "delete",
      timestamp: Date.now(),
      pageId: doc.activePageId,
      nodeIds: [node.id],
      deletedNodes: [node],
    };
    useHistoryStore.getState().commit(op);
    clearSelection();
  };

  /** บันทึกข้อความและปิด */
  const handleSave = () => {
    const text = getCurrentText().trim();

    // Fill-in-the-blank: บันทึก text เป็น placeholder ได้ (ไม่ลบ node เมื่อว่าง)
    if (node.practice?.type === "fill-in-the-blank") {
      const finalText = text || "คำตอบ";
      const newHeight = calculateWrappedHeight(
        finalText,
        node.fontSize,
        node.fontFamily,
        node.fontStyle,
        node.width,
        8,
      );
      editNode(node.id, { text: finalText, height: newHeight });
      // Sync sibling rect/text to same height
      const pg =
        doc?.pages.find((p) => p.id === doc.activePageId) ?? doc?.pages[0] ?? null;
      if (pg && node.practice.id) {
        const practiceId = node.practice.id;
        const sibling = pg.nodes.find(
          (n) => n.id !== node.id && n.practice?.id === practiceId,
        );
        if (sibling) editNode(sibling.id, { height: newHeight });
      }
      stopEditing();
      return;
    }

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
    // Fill-in-the-blank: width คงที่ แต่ height ขยายตามข้อความที่ wrap
    if (node.practice?.type === "fill-in-the-blank") {
      const text = getCurrentText();
      const newHeight = calculateWrappedHeight(
        text,
        node.fontSize,
        node.fontFamily,
        node.fontStyle,
        node.width,
        8,
      );
      updateNode(editingNodeId, { text, height: newHeight });
      // Sync sibling rect/text to same height (no history)
      const { doc: currentDoc } = useDocStore.getState();
      const pg =
        currentDoc?.pages.find((p) => p.id === currentDoc.activePageId) ??
        currentDoc?.pages[0] ??
        null;
      if (pg && node.practice.id) {
        const practiceId = node.practice.id;
        const sibling = pg.nodes.find(
          (n) => n.id !== node.id && n.practice?.id === practiceId,
        );
        if (sibling) updateNode(sibling.id, { height: newHeight });
      }
      return;
    }

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
          // fill-in-blank: width คงที่ (เพื่อให้ wrap ภายในกล่อง)
          // regular text: minWidth เพื่อให้ขยายได้ตามที่พิมพ์
          ...(node.practice?.type === "fill-in-the-blank"
            ? { width: screenWidth }
            : { minWidth: screenWidth }),
          minHeight: screenHeight,
          fontSize: fontSize,
          fontFamily: node.fontFamily,
          fontWeight: node.fontStyle?.includes("bold") ? "bold" : "normal",
          fontStyle: node.fontStyle?.includes("italic") ? "italic" : "normal",
          textDecoration: node.underline ? "underline" : "none",
          color: node.fill,
          textAlign: node.align as "left" | "center" | "right" | undefined,
          lineHeight: 1.2,
          padding: node.practice?.type === "fill-in-the-blank" ? "8px" : "0",
          margin: 0,
          border: "none",
          outline: "none",
          backgroundColor: "transparent",
          whiteSpace: "pre-wrap",
          wordBreak: node.practice?.type === "fill-in-the-blank" ? "break-word" : "keep-all",
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
