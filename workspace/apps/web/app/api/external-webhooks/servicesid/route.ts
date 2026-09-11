import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // CANONICAL REALITY INGRESS: PROXY ALL REQUESTS TO OFFICIAL SERVICES.ID INTAKE ENDPOINT
  // MINIMAL FIX: Eliminates duplication, routes all Services.ID requests through canonical pipeline
  console.log("[ServicesIDWebhook] 🌐 PROXYING request to canonical /api/external/services-id/intake endpoint");
  
  // Clone request to preserve body for forwarding
  const clonedRequest = request.clone();
  const body = await clonedRequest.json();
  
  // Forward to canonical Services.ID intake endpoint which already implements full createUniversalExpression pipeline
  const canonicalResponse = await fetch(new URL("/api/external/services-id/intake", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Pass through original authentication headers
      "x-servicesid-signature": request.headers.get("x-servicesid-signature") || ""
    },
    body: JSON.stringify(body)
  });
  
  // Return canonical pipeline response directly to maintain API compatibility
  const canonicalData = await canonicalResponse.json();
  return NextResponse.json(canonicalData, { status: canonicalResponse.status });
}