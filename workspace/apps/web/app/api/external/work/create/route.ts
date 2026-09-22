import { NextResponse } from "next/server";
// Reuse 100% of internal /api/work/create logic with external user validation
import { POST as internalPost } from "../../../work/create/route";

export async function POST(request: Request) {
  // Add minimal external user validation before delegating to internal logic
  const sessionCookie = request.cookies.get("workspace_session");
  if (!sessionCookie) {
    return NextResponse.json({ error: "External user session required" }, { status: 401 });
  }
  // Delegate all work creation logic to existing internal endpoint (full reuse)
  return internalPost(request);
}