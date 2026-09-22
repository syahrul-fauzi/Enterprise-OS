import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Golden Spine minimal health check - satisfies Docker healthcheck requirement
  const correlationId = request.headers.get("x-correlation-id") || `health-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  // Return 200 OK to pass healthcheck while maintaining core observability
  return NextResponse.json({
    status: "ready",
    service: "eos-core-web",
    timestamp: new Date().toISOString(),
    correlationId,
  }, { 
    status: 200,
    headers: {
      "X-Correlation-ID": correlationId,
    },
  });
}