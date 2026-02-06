"use client";

import { useUIStore } from "../../stores/uiStore";

export function ExportModal() {
  const { exportModalOpen, closeExportModal } = useUIStore();

  if (!exportModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Export</h2>
        <p className="text-sm text-gray-600 mb-4">
          Export functionality coming soon...
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={closeExportModal}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
