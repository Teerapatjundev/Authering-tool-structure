"use client";

import { ReactNode } from "react";
import { TopBar } from "./ui/TopBar/TopBar";
import { ElementsPanel } from "./ui/LeftPanel/ElementsPanel";
import { AssetsPanel } from "./ui/LeftPanel/AssetsPanel";
import { InspectorPanel } from "./ui/RightPanel/InspectorPanel";
import { LayersPanel } from "./ui/RightPanel/LayersPanel";
import { ToastHost } from "./ui/Toasts/ToastHost";
import { ExportModal } from "./ui/Modals/ExportModal";
import { ConfirmDeleteModal } from "./ui/Modals/ConfirmDeleteModal";
import { useUIStore } from "./stores/uiStore";

interface EditorLayoutProps {
  children: ReactNode;
}

export function EditorLayout({ children }: EditorLayoutProps) {
  const { showLeftPanel, showRightPanel, leftPanelTab, rightPanelTab } =
    useUIStore();

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <TopBar />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        {showLeftPanel && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() =>
                  useUIStore.getState().setLeftPanelTab("elements")
                }
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  leftPanelTab === "elements"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Elements
              </button>
              <button
                onClick={() => useUIStore.getState().setLeftPanelTab("assets")}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  leftPanelTab === "assets"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Assets
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {leftPanelTab === "elements" ? (
                <ElementsPanel />
              ) : (
                <AssetsPanel />
              )}
            </div>
          </div>
        )}

        {/* Main Canvas Area */}
        <div className="flex-1 relative overflow-hidden">{children}</div>

        {/* Right Panel */}
        {showRightPanel && (
          <div className="w-64 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
            <div className="flex border-b border-gray-200">
              <button
                onClick={() =>
                  useUIStore.getState().setRightPanelTab("inspector")
                }
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  rightPanelTab === "inspector"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Inspector
              </button>
              <button
                onClick={() => useUIStore.getState().setRightPanelTab("layers")}
                className={`flex-1 px-4 py-2 text-sm font-medium ${
                  rightPanelTab === "layers"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Layers
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {rightPanelTab === "inspector" ? (
                <InspectorPanel />
              ) : (
                <LayersPanel />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals & Toasts */}
      <ExportModal />
      <ConfirmDeleteModal />
      <ToastHost />
    </div>
  );
}
