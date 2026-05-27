"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { paths } from "@/constants";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../components/ui/toggle-group";
import { useDocStore } from "../stores/docStore";
import { ArrowLeft, Play, Save, X, CircleCheck } from "lucide-react";

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
  const router = useRouter();

  const handleBack = () => {
    router.push(paths.dashboard);
  };

  const { doc, saveDoc } = useDocStore();
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSaveSuccessOpen, setIsSaveSuccessOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("html5");

  const canSubmitSave = fileName.trim().length > 0 && fileType.length > 0;

  const handleOpenSaveModal = () => {
    setFileName((doc?.title || "").trim());
    setFileType("html5");
    setIsSaveModalOpen(true);
  };

  const handleSubmitSave = () => {
    if (!canSubmitSave) return;
    saveDoc();
    setIsSaveModalOpen(false);
    setIsSaveSuccessOpen(true);
  };

  return (
    <>
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
            onClick={handleOpenSaveModal}
            className="border-2 border-white text-white bg-transparent hover:bg-white/20 hover:text-white text-base gap-1.5"
          >
            <Save className="h-5 w-5" />
            บันทึก
          </Button>
        </div>
      </header>

      {isSaveModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/10 p-4">
          <div className="w-full max-w-[540px] rounded-2xl bg-[#F4F4F5] p-6 shadow-[0_2px_20px_rgba(46,47,56,0.15)]">
            <div className="flex items-start justify-between">
              <h2 className="text-[32px] leading-10 font-semibold text-[#2E2F38]">
                บันทึกเป็น (Save As)
              </h2>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[#2E2F38] hover:bg-black/5"
                aria-label="Close save modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-xl font-medium text-[#2E2F38]">
                  ชื่อไฟล์
                </label>
                <Input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="ระบุชื่อไฟล์"
                  className="h-11 rounded-[10px] border-[#AEB3C5] bg-white text-base text-[#2E2F38] placeholder:text-[#C3C6D4]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xl font-medium text-[#2E2F38]">
                  ประเภทไฟล์
                </label>
                <div className="relative">
                  <select
                    value={fileType}
                    onChange={(e) => setFileType(e.target.value)}
                    className="h-11 w-full appearance-none rounded-[10px] border border-[#AEB3C5] bg-white px-4 text-base text-[#4A4F5F] outline-none"
                  >
                    <option value="html5">HTML5</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[#626674]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M6 9L12 15L18 9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSaveModalOpen(false)}
                className="h-12 min-w-[112px] rounded-[10px] border-2 border-[#626674] bg-white text-2xl font-semibold text-[#626674] hover:bg-gray-50"
              >
                ยกเลิก
              </Button>
              <Button
                type="button"
                onClick={handleSubmitSave}
                disabled={!canSubmitSave}
                className="h-12 min-w-[112px] rounded-[10px] bg-[#ED1C24] text-2xl font-semibold text-white hover:bg-[#d11820] disabled:bg-[#B7BAC5]"
              >
                บันทึกเป็น
              </Button>
            </div>
          </div>
        </div>
      )}

      {isSaveSuccessOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/10 p-4">
          <div className="w-full max-w-[350px] rounded-2xl bg-[#F4F4F5] px-6 py-7 text-center shadow-[0_2px_20px_rgba(46,47,56,0.15)]">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#E2F6EA]">
              <CircleCheck className="h-9 w-9 text-[#5BC38D]" />
            </div>
            <p className="text-[36px] font-semibold text-[#2E2F38]">บันทึกไฟล์เสร็จสิ้น!</p>
            <Button
              type="button"
              onClick={() => setIsSaveSuccessOpen(false)}
              className="mt-7 h-12 min-w-[120px] rounded-[10px] bg-[#ED1C24] text-2xl font-semibold text-white hover:bg-[#d11820]"
            >
              ตกลง
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
