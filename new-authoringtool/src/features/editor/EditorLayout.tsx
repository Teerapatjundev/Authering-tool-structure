/**
 * ===============================================
 * EDITOR LAYOUT - Layout Component
 * ===============================================
 *
 * Layout สำหรับ Editor ประกอบด้วย:
 * - TopBar: แถบด้านบน
 * - LeftSidebar: แผงเพิ่ม elements
 * - RightSidebar: แผงแก้ไข properties
 *
 * แยก layout ออกจาก EditorClient เพื่อ:
 * - โครงสร้างชัดเจน
 * - Overlay ไม่ลอยเหนือ layout
 */

"use client";

// import { TopBar } from "./ui/TopBar";
import { LeftSidebar } from "./ui/LeftSidebar";
import { RightSidebar } from "./ui/RightSidebar";
import { FloatingToolbar } from "./ui/FloatingToolbar";
import { Navbar } from "./ui/Navbar";

interface EditorLayoutProps {
  children: React.ReactNode;
}

export function EditorLayout({ children }: EditorLayoutProps) {
  return (
    <div className="flex flex-col w-full h-full bg-gray-100">
      {/* Top Bar - เครื่องมือและ zoom - z-index สูงกว่า canvas */}
      <div className="relative z-50">
        <Navbar />
        {/* <TopBar /> */}
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Elements - z-index สูงกว่า canvas */}
        <div className="relative z-40">
          <LeftSidebar />
        </div>

        {/* Canvas container - ให้ children (KonvaCanvas + Overlays) */}
        <div className="relative flex-1 overflow-hidden">
          {/* Floating Toolbar - Select/Pan + Undo/Redo ลอยเหนือ canvas */}
          <FloatingToolbar />
          {children}
        </div>

        {/* Right Sidebar - Properties - z-index สูงกว่า canvas */}
        <div className="relative z-40">
          <RightSidebar />
        </div>
      </div>
    </div>
  );
}
