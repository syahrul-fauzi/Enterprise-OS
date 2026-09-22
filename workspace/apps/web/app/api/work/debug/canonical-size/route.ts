import { NextResponse } from "next/server";

// In-memory store (same as in create/route.ts) to track canonical state size
let canonicalStoreSize = 0;

export async function GET() {
  return NextResponse.json({
    canonicalStoreSize,
    timestamp: new Date().toISOString(),
    status: "active"
  });
}

export async function POST(request: Request) {
  const { size } = await request.json();
  canonicalStoreSize = size;
  return NextResponse.json({ success: true, canonicalStoreSize });
}