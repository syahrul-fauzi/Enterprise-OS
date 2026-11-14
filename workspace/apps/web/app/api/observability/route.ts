import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const correlationId = request.headers.get("x-correlation-id") || `observability-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const host = request.headers.get("host")?.split(":")[0] || "localhost";
  
  const observabilityResponse = {
    status: "operational",
    service: "eos-observability",
    correlationId,
    product: {
      requestHost: host,
    },
    execution: {
      correlationId: correlationId,
      traceId: `trace-${Date.now()}`,
      logicalWorkId: "work-observability-snapshot",
    },
    metrics: {
      uptime_seconds: process.uptime(),
      memory_usage_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(observabilityResponse, { status: 200 });
  response.headers.set("x-eos-correlation-id", correlationId);
  response.headers.set("x-eos-request-host", host);
  
  return response;
}