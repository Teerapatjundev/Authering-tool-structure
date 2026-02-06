"use client";

import { useUIStore } from "../../stores/uiStore";

export function ConfirmDeleteModal() {
  const { confirmDeleteModalOpen, closeConfirmDeleteModal } = useUIStore();

  if (!confirmDeleteModalOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96">
        <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete the selected items?
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={closeConfirmDeleteModal}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              closeConfirmDeleteModal();
              // Delete action handled elsewhere
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
