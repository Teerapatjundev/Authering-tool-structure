"use client";

import { useState } from "react";
import { Button } from "../../../components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../components/ui/toggle-group";
import { useDocStore } from "../stores/docStore";
import { ArrowLeft, Play, Save } from "lucide-react";

type ViewMode = "desktop" | "mobile";

function DesktopIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 14"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4.8 14V12.4444H6.4V10.8889H1.6C1.16 10.8889 0.783333 10.7366 0.47 10.4319C0.156667 10.1273 0 9.76111 0 9.33333V1.55556C0 1.12778 0.156667 0.761574 0.47 0.456944C0.783333 0.152315 1.16 0 1.6 0H14.4C14.84 0 15.2167 0.152315 15.53 0.456944C15.8433 0.761574 16 1.12778 16 1.55556V9.33333C16 9.76111 15.8433 10.1273 15.53 10.4319C15.2167 10.7366 14.84 10.8889 14.4 10.8889H9.6V12.4444H11.2V14H4.8ZM1.6 9.33333H14.4V1.55556H1.6V9.33333Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MobileIcon({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M6.46667 18C6.06333 18 5.71806 17.8576 5.43083 17.5727C5.14361 17.2879 5 16.9455 5 16.5455V3.45455C5 3.05455 5.14361 2.71212 5.43083 2.42727C5.71806 2.14242 6.06333 2 6.46667 2H13.8C14.2033 2 14.5486 2.14242 14.8358 2.42727C15.1231 2.71212 15.2667 3.05455 15.2667 3.45455V5.70909C15.4867 5.79394 15.6639 5.92727 15.7983 6.10909C15.9328 6.29091 16 6.49697 16 6.72727V8.18182C16 8.41212 15.9328 8.61818 15.7983 8.8C15.6639 8.98182 15.4867 9.11515 15.2667 9.2V16.5455C15.2667 16.9455 15.1231 17.2879 14.8358 17.5727C14.5486 17.8576 14.2033 18 13.8 18H6.46667ZM6.46667 16.5455H13.8V3.45455H6.46667V16.5455ZM10.6558 15.6091C10.7964 15.4697 10.8667 15.297 10.8667 15.0909C10.8667 14.8848 10.7964 14.7121 10.6558 14.5727C10.5153 14.4333 10.3411 14.3636 10.1333 14.3636C9.92556 14.3636 9.75139 14.4333 9.61083 14.5727C9.47028 14.7121 9.4 14.8848 9.4 15.0909C9.4 15.297 9.47028 15.4697 9.61083 15.6091C9.75139 15.7485 9.92556 15.8182 10.1333 15.8182C10.3411 15.8182 10.5153 15.7485 10.6558 15.6091Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Navbar() {
  const handleBack = () => {
    window.location.href = "/dashboard";
  };

  const { doc } = useDocStore();
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");

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

      {/* ขวา: switch Desktop/Mobile + ปุ่มพรีวิว + บันทึก */}
      <div className="flex items-center gap-2">
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(val) => val && setViewMode(val as ViewMode)}
          className="shrink-0 h-9 rounded-lg border-2 border-white bg-transparent p-[3px] gap-[6px]"
        >
          <ToggleGroupItem
            value="desktop"
            title="Desktop"
            className="
      h-full w-[40px] rounded-sm
      !bg-transparent !text-white
      data-[state=on]:!bg-white data-[state=on]:!text-[#ED1C24]
      hover:!bg-white/10
      focus-visible:!ring-0 focus-visible:!ring-offset-0
    "
          >
            <DesktopIcon className="w-5 h-5" />
          </ToggleGroupItem>

          <ToggleGroupItem
            value="mobile"
            title="Mobile"
            className="
      h-full w-[40px] rounded-sm
      !bg-transparent !text-white
      data-[state=on]:!bg-white data-[state=on]:!text-[#ED1C24]
      hover:!bg-white/10
      focus-visible:!ring-0 focus-visible:!ring-offset-0
    "
          >
            <MobileIcon className="w-5 h-5" />
          </ToggleGroupItem>
        </ToggleGroup>
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
