import { EditorClient } from "../../../features/editor/EditorClient";

interface EditorPageProps {
  params: {
    docId: string;
  };
}

export default function EditorPage({ params }: EditorPageProps) {
  return <EditorClient docId={params.docId} />;
}
