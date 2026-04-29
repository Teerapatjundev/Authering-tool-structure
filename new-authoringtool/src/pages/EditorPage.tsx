import { Navigate, useParams } from 'react-router-dom'

import { EditorClient } from '@/features/editor/EditorClient'

export default function EditorPage() {
  const { docId } = useParams<{ docId: string }>()

  if (!docId) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="w-screen h-screen">
      <EditorClient docId={docId} />
    </main>
  )
}

