import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // CANONICAL REALITY INGRESS: PROXY ALL REQUESTS TO OFFICIAL PROJECTS.CO.ID INTAKE ENDPOINT
  // REUSED FROM: servicesid/route.ts pattern (eliminates duplication, maintains architectural consistency)
  console.log("[ProjectsCoIdWebhook] 🌐 PROXYING request to canonical /api/external/projects-co-id/intake endpoint");
  
  // Clone request to preserve body for forwarding
  const clonedRequest = request.clone();
  const body = await clonedRequest.json();
  
  // Forward to canonical Projects.co.id intake endpoint which implements full createUniversalExpression pipeline
  const canonicalResponse = await fetch(new URL("/api/external/projects-co-id/intake", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Pass through original authentication headers
      "x-projectscoid-signature": request.headers.get("x-projectscoid-signature") || ""
    },
    body: JSON.stringify(body)
  });
  
  // Return canonical pipeline response directly to maintain API compatibility
  const canonicalData = await canonicalResponse.json();
  return NextResponse.json(canonicalData, { status: canonicalResponse.status });
}

// GET handler for webhook verification - follows Projects.co.id's official webhook verification requirement
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Projects.co.id's webhook verification flow (reused from Meta/WhatsApp pattern)
  if (mode === "subscribe" && token === process.env.PROJECTSCOID_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}