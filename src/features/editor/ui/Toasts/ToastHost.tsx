"use client";

import { useUIStore } from "../../stores/uiStore";

export function ToastHost() {
  const { toasts, removeToast } = useUIStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(
        (toast: {
          id: string;
          message: string;
          type: "info" | "success" | "error";
        }) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-white max-w-sm ${
              toast.type === "error"
                ? "bg-red-500"
                : toast.type === "success"
                  ? "bg-green-500"
                  : "bg-blue-500"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        ),
      )}
    </div>
  );
}
