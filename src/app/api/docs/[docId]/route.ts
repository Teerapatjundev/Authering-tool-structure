import { NextRequest, NextResponse } from "next/server";

// This is a placeholder API route for future server-side persistence
// Currently, the app uses localStorage via docsService

export async function GET(
  request: NextRequest,
  { params }: { params: { docId: string } },
) {
  return NextResponse.json({
    message:
      "Currently using localStorage. Implement server-side persistence here.",
    docId: params.docId,
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { docId: string } },
) {
  const body = await request.json();
  return NextResponse.json({
    message: "Doc saved (placeholder)",
    docId: params.docId,
  });
}
