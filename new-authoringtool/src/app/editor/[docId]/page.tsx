import { redirect } from 'next/navigation'
import { paths } from '@/constants'
import { EditorClient } from '@/features/editor/EditorClient'

interface EditorPageProps {
  params: Promise<{ docId: string }>
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { docId } = await params

  if (!docId) {
    redirect(paths.dashboard)
  }

  return (
    <main className="w-screen h-screen">
      <EditorClient docId={docId} />
    </main>
  )
}
