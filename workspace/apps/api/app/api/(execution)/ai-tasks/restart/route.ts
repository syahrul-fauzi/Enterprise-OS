// This API route is temporarily disabled until auth and atomic-composition dependencies are resolved
// EOS Face priority first - only core user-facing workflows are enabled for production
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    error: "AI Agent tasks feature is temporarily under maintenance",
    status: "maintenance"
  }, { status: 503 });
}