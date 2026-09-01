// This API route is temporarily disabled until atomic-composition and service-directory dependencies are resolved
// EOS Face priority first - only core user-facing workflows are enabled for production
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    error: "Work composition feature is temporarily under maintenance",
    status: "maintenance"
  }, { status: 503 });
}