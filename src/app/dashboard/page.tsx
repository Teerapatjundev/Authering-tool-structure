"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { docsService } from "@/services/api/docs.service";
import { generateId } from "@/shared/utils/id";

interface DocMeta {
  id: string;
  title: string;
  updatedAt: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocMeta[]>([]);

  useEffect(() => {
    const docList = docsService.listDocs();
    setDocs(docList);
  }, []);

  const handleCreateNew = () => {
    const newId = generateId();
    router.push(`/editor/${newId}`);
  };

  const handleOpenDoc = (id: string) => {
    router.push(`/editor/${id}`);
  };

  const handleDeleteDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Delete this document?")) {
      docsService.deleteDoc(id);
      setDocs(docs.filter((d) => d.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">My Documents</h1>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + New Document
          </button>
        </div>

        {docs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 text-lg mb-4">No documents yet</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Create your first document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleOpenDoc(doc.id)}
                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer p-6 border border-gray-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-800 truncate flex-1">
                    {doc.title || "Untitled"}
                  </h3>
                  <button
                    onClick={(e) => handleDeleteDoc(doc.id, e)}
                    className="ml-2 text-red-500 hover:text-red-700 transition-colors"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
                <p className="text-sm text-gray-500">
                  Last edited: {new Date(doc.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
