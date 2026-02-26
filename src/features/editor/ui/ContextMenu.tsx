/**
 * ===============================================
 * CONTEXT MENU - เมนูคลิกขวา / กดค้าง
 * ===============================================
 *
 * แสดงเมนูเมื่อคลิกขวาหรือกดค้างที่ Object
 * รองรับ Desktop (right-click) และ Tablet/Mobile (long-press)
 *
 * เมนู:
 * 1. คัดลอก (Copy)
 * 2. คัดลอกเป็น Master (Copy as Master)
 * 3. ลบ (Delete)
 * 4. ─── (divider)
 * 5. จัดตำแหน่ง (Align) → submenu
 * 6. จัดเรียง Layer → submenu
 * 7. ─── (divider)
 * 8. ล็อค / ปลดล็อค
 * 9. รวมกลุ่ม (Group)
 * 10. แยกกลุ่ม (Ungroup) - แสดงเฉพาะเมื่อมีกลุ่มอยู่
 */

"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useContextMenuStore } from "../stores/contextMenuStore";
import { useSelectionStore } from "../stores/selectionStore";
import { useDocStore } from "../stores/docStore";
import { copy, paste, deleteSelected } from "../core/commands/clipboard";
import {
  alignNodes,
  reorderLayer,
  toggleLock,
  groupNodes,
  ungroupNodes,
  hasGroup,
  allInSameGroup,
} from "../core/commands/contextMenu";

// =============================================
// ICONS (inline SVG paths)
// =============================================
function CopyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function PasteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  );
}

function AlignIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <line x1="21" y1="10" x2="3" y2="10" />
      <line x1="21" y1="6" x2="3" y2="6" />
      <line x1="21" y1="14" x2="3" y2="14" />
      <line x1="21" y1="18" x2="3" y2="18" />
    </svg>
  );
}

function LayerIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function UnlockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 019.9-1" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="2" width="8" height="8" rx="1" />
      <rect x="14" y="2" width="8" height="8" rx="1" />
      <rect x="2" y="14" width="8" height="8" rx="1" />
      <rect x="14" y="14" width="8" height="8" rx="1" />
    </svg>
  );
}

function UngroupIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="2" width="8" height="8" rx="1" strokeDasharray="2 2" />
      <rect x="14" y="2" width="8" height="8" rx="1" strokeDasharray="2 2" />
      <rect x="2" y="14" width="8" height="8" rx="1" strokeDasharray="2 2" />
      <rect x="14" y="14" width="8" height="8" rx="1" strokeDasharray="2 2" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// =============================================
// SUB-MENU COMPONENT
// =============================================
interface SubMenuProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SubMenu({ label, icon, children }: SubMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);
  const [subStyle, setSubStyle] = useState<React.CSSProperties>({});

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setIsOpen(false), 150);
  };

  // ปรับตำแหน่ง SubMenu ไม่ให้ทะลุขอบจอ
  useLayoutEffect(() => {
    if (!isOpen || !subRef.current || !parentRef.current) return;
    const sub = subRef.current.getBoundingClientRect();
    const parent = parentRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    const style: React.CSSProperties = {};

    // ถ้าทะลุขวา → เปิดไปทางซ้ายแทน
    if (parent.right + sub.width + 4 > vw - pad) {
      style.left = "auto";
      style.right = "100%";
      style.marginLeft = 0;
      style.marginRight = 4;
    }

    // ถ้าทะลุล่าง → เลื่อนขึ้น
    if (sub.bottom > vh - pad) {
      style.top = "auto";
      style.bottom = 0;
    }

    setSubStyle(style);
  }, [isOpen]);

  return (
    <div
      ref={parentRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onTouchStart={handleEnter}
    >
      <button
        className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="mr-3 text-gray-400">{icon}</span>
        <span className="flex-1 text-left">{label}</span>
        <ChevronRight />
      </button>

      {isOpen && (
        <div
          ref={subRef}
          className="absolute left-full top-0 ml-1 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[160px] py-1 z-[9999]"
          style={subStyle}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// =============================================
// MENU ITEM
// =============================================
interface MenuItemProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}

function MenuItem({ label, icon, onClick, danger, disabled }: MenuItemProps) {
  return (
    <button
      className={`flex items-center w-full px-3 py-2 text-sm transition-colors
        ${disabled ? "text-gray-300 cursor-not-allowed" : ""}
        ${danger && !disabled ? "text-red-600 hover:bg-red-50" : ""}
        ${!danger && !disabled ? "text-gray-700 hover:bg-blue-50 hover:text-blue-700" : ""}
      `}
      onClick={() => {
        if (!disabled) onClick();
      }}
      disabled={disabled}
    >
      {icon && <span className="mr-3 text-gray-400">{icon}</span>}
      {!icon && <span className="mr-3 w-4" />}
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

function Divider() {
  return <div className="my-1 border-t border-gray-100" />;
}

// =============================================
// MAIN CONTEXT MENU COMPONENT
// =============================================
export function ContextMenu() {
  const { isOpen, x, y, close } = useContextMenuStore();
  const { getSelectedIds } = useSelectionStore();
  const { doc } = useDocStore();
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: 0, y: 0 });

  // =============================================
  // คลิกนอกเมนู → ปิด
  // =============================================
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as HTMLElement)
      ) {
        close();
      }
    };

    // ใช้ setTimeout เพื่อไม่ให้ event ที่เปิดเมนูถูกจับ
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen, close]);

  // =============================================
  // ปรับตำแหน่งเมนูไม่ให้ทะลุขอบจอ
  // =============================================
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) {
      setAdjustedPos({ x, y });
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8; // ระยะขอบ

    let ax = x;
    let ay = y;

    // ทะลุขวา
    if (ax + rect.width > vw - pad) {
      ax = vw - rect.width - pad;
    }
    // ทะลุล่าง
    if (ay + rect.height > vh - pad) {
      ay = vh - rect.height - pad;
    }
    // ทะลุซ้าย
    if (ax < pad) ax = pad;
    // ทะลุบน
    if (ay < pad) ay = pad;

    setAdjustedPos({ x: ax, y: ay });
  }, [isOpen, x, y]);

  // =============================================
  // Escape → ปิด
  // =============================================
  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, close]);

  // =============================================
  // ตรวจสอบสถานะ
  // =============================================
  if (!isOpen || !doc) return null;

  const selectedIds = getSelectedIds();
  const hasSelection = selectedIds.length > 0;
  const multipleSelected = selectedIds.length >= 2;

  // ตรวจสอบว่ามี node ที่ล็อคอยู่หรือไม่
  const selectedNodes = doc.nodes.filter((n) => selectedIds.includes(n.id));
  const allLocked =
    selectedNodes.length > 0 && selectedNodes.every((n) => n.locked);
  const isGrouped = hasGroup();
  const isSameGroup = allInSameGroup();

  // =============================================
  // Helper: run action แล้วปิดเมนู
  // =============================================
  const exec = (fn: () => void) => {
    fn();
    close();
  };

  // =============================================
  // ตำแหน่ง - ให้เมนูไม่หลุดออกจากขอบจอ
  // =============================================
  const menuStyle: React.CSSProperties = {
    position: "fixed",
    left: adjustedPos.x,
    top: adjustedPos.y,
    zIndex: 9999,
  };

  return (
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white border border-gray-200 rounded-lg shadow-2xl min-w-[200px] py-1 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ===== เมื่อ lock ทั้งหมด → แสดงแค่ปุ่มปลดล็อค ===== */}
      {allLocked ? (
        <MenuItem
          label="ปลดล็อค (Unlock)"
          icon={<UnlockIcon />}
          onClick={() => exec(toggleLock)}
        />
      ) : (
        <>
          {/* ===== คัดลอก (Copy) ===== */}
          <MenuItem
            label="คัดลอก (Copy)"
            icon={<CopyIcon />}
            onClick={() => exec(copy)}
            disabled={!hasSelection}
          />

          {/* ===== วาง (Paste) ===== */}
          <MenuItem
            label="วาง (Paste)"
            icon={<PasteIcon />}
            onClick={() => exec(paste)}
          />

          {/* ===== ลบ (Delete) ===== */}
          <MenuItem
            label="ลบ (Delete)"
            icon={<DeleteIcon />}
            onClick={() => exec(deleteSelected)}
            disabled={!hasSelection}
            danger
          />

          <Divider />

          {/* ===== จัดตำแหน่ง (Align) ===== */}
          <SubMenu label="จัดตำแหน่ง (Align)" icon={<AlignIcon />}>
            <MenuItem
              label="ชิดซ้าย"
              onClick={() => exec(() => alignNodes("left"))}
              disabled={!multipleSelected}
            />
            <MenuItem
              label="กึ่งกลางแนวนอน"
              onClick={() => exec(() => alignNodes("center-h"))}
              disabled={!multipleSelected}
            />
            <MenuItem
              label="ชิดขวา"
              onClick={() => exec(() => alignNodes("right"))}
              disabled={!multipleSelected}
            />
            <Divider />
            <MenuItem
              label="ชิดบน"
              onClick={() => exec(() => alignNodes("top"))}
              disabled={!multipleSelected}
            />
            <MenuItem
              label="กึ่งกลางแนวตั้ง"
              onClick={() => exec(() => alignNodes("center-v"))}
              disabled={!multipleSelected}
            />
            <MenuItem
              label="ชิดล่าง"
              onClick={() => exec(() => alignNodes("bottom"))}
              disabled={!multipleSelected}
            />
          </SubMenu>

          {/* ===== จัดเรียง Layer ===== */}
          <SubMenu label="จัดเรียง Layer" icon={<LayerIcon />}>
            <MenuItem
              label="นำไปบนสุด"
              onClick={() => exec(() => reorderLayer("bring-to-front"))}
              disabled={!hasSelection}
            />
            <MenuItem
              label="เลื่อนขึ้น"
              onClick={() => exec(() => reorderLayer("bring-forward"))}
              disabled={!hasSelection}
            />
            <MenuItem
              label="เลื่อนลง"
              onClick={() => exec(() => reorderLayer("send-backward"))}
              disabled={!hasSelection}
            />
            <MenuItem
              label="ส่งไปล่างสุด"
              onClick={() => exec(() => reorderLayer("send-to-back"))}
              disabled={!hasSelection}
            />
          </SubMenu>

          <Divider />

          {/* ===== Lock ===== */}
          <MenuItem
            label="ล็อค (Lock)"
            icon={<LockIcon />}
            onClick={() => exec(toggleLock)}
            disabled={!hasSelection}
          />

          {/* ===== รวมกลุ่ม (Group) - ซ่อนเมื่อ nodes ที่เลือกอยู่ใน group เดียวกันอยู่แล้ว ===== */}
          {multipleSelected && !isSameGroup && (
            <MenuItem
              label="รวมกลุ่ม (Group)"
              icon={<GroupIcon />}
              onClick={() => exec(groupNodes)}
            />
          )}

          {/* ===== แยกกลุ่ม (Ungroup) - แสดงเฉพาะเมื่อมีกลุ่ม ===== */}
          {isGrouped && (
            <MenuItem
              label="แยกกลุ่ม (Ungroup)"
              icon={<UngroupIcon />}
              onClick={() => exec(ungroupNodes)}
            />
          )}
        </>
      )}
    </div>
  );
}
