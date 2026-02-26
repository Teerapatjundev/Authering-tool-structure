"use client";

import { Button } from "../../../components/ui/button";
import { useDocStore } from "../stores/docStore";
import { ArrowLeft, Play, Save } from "lucide-react";

export function Navbar() {
  const handleBack = () => {
    window.location.href = "/dashboard";
  };
  const { doc } = useDocStore();

  return (
    <header
      style={{
        padding: "0rem 1.5rem",
        lineHeight: "18px",
        justifyContent: "space-between",
        display: "flex",
        alignItems: "center",
        backgroundColor: "#ED1C24",
        boxShadow: "0px 2px 10px 0px #2E2F3840",
        height: "60px",
      }}
      className="aksorn-font"
    >
      {/* ซ้าย: ปุ่มย้อนกลับ + ชื่อเอกสาร */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="flex items-center justify-center w-9 h-9 rounded-md text-white hover:bg-white/20 transition-colors"
          title="กลับไปหน้า Dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-medium text-white max-w-[200px] truncate">
          {doc?.title || "-"}
        </h1>
      </div>

      {/* ขวา: ปุ่มพรีวิว + บันทึก */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="border-2 border-white text-white bg-transparent hover:bg-white/20 hover:text-white text-base gap-1.5"
        >
          <Play className="h-4 w-4 fill-white" />
          พรีวิว
        </Button>
        <Button
          variant="outline"
          className="border-2 border-white text-white bg-transparent hover:bg-white/20 hover:text-white text-base gap-1.5"
        >
          <Save className="h-5 w-5" />
          บันทึก
        </Button>
      </div>
    </header>
  );
}
