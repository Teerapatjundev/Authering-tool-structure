/**
 * ===============================================
 * EDITOR PAGE
 * ===============================================
 *
 * หน้า Editor - รับ docId จาก URL params
 * และส่งต่อให้ EditorClient
 *
 * URL Format: /editor/[docId]
 * ตัวอย่าง: /editor/my-document-123
 */

import { EditorClient } from "@/features/editor/EditorClient";

interface EditorPageProps {
  params: Promise<{
    docId: string;
  }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params;
  return (
    <main className="w-screen h-screen">
      <EditorClient docId={docId} />
    </main>
  );
}
