// Minimal /api/health endpoint - fixes 404 error for user
// Returns 200 OK immediately while maintaining Next.js App Router format
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "UP",
    message: "EOS API Server is operational",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  }, { status: 200 });
}