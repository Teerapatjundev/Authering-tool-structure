import { NextRequest, NextResponse } from "next/server";

// Placeholder for asset upload endpoint
export async function POST(request: NextRequest) {
  // In production, handle file upload to cloud storage
  // For MVP, assets are embedded as data URLs or external URLs

  return NextResponse.json({
    success: false,
    message: "Upload not implemented. Use data URLs or external URLs for now.",
  });
}
