// This API route is for legacy legal-case domain only and has been disabled for EOS Face production
// All new work creation uses the unified /api/work/create endpoint that supports all domains
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ 
    error: "Legal case creation endpoint is deprecated. Please use /api/work/create for all new work items.",
    status: "deprecated",
    recommendedEndpoint: "/api/work/create"
  }, { status: 410 });
}