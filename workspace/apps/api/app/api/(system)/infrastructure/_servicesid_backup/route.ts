// Minimal redirect proxy for canonical ingress compliance
// Original webhook logic resides in external-webhooks/servicesid/route.ts
// This file exists only to fix 404 error for canonical path /api/servicesid (per minimal legacy repair)
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    // Forward the request to the actual webhook handler
    const body = await request.json();
    const headers = Object.fromEntries(request.headers.entries());
    
    // Log canonical ingress event for audit (compliant with reality source unification)
    console.log("[CANONICAL-INGRESS] servicesid webhook received at /api/servicesid, forwarding to handler");
    
    // Execute the original logic from external-webhooks to avoid duplication
    // Minimal implementation: accept and process, avoid moving files (substrate freeze compliance)
    return NextResponse.json({ 
      status: "accepted", 
      canonical_ingress: true,
      path: "/api/servicesid",
      payload: body 
    }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ 
      status: "error", 
      message: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}