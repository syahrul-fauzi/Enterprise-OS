// Canonical Services.ID webhook proxy endpoint - routes external integrations through canonical pipeline
// Maintains API compatibility with external Services.ID webhook calls
// Updated: P1-AUTH-015 - Fixed AUTH_INCONSISTENCY with canonical auth pattern
import { NextResponse } from "next/server";
import {
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";

// Lazy load capability registry untuk menghindari module cycles dan mendukung Edge Runtime
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

export async function POST(request: Request) {
  try {
    // 6-boundary compliance: Verifikasi integrations domain dapat mengakses external/api domain
    if (!validateBoundaryAccess("integrations", "external")) {
      console.error("[servicesid-webhook] BOUNDARY ACCESS DENIED: integrations cannot access external domain directly");
      return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
    }

    // PR-01 requirement: correlation ID tracking for audit and observability
    const correlationId = request.headers.get("x-correlation-id") || `servicesid-webhook-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Canonical session validation - wajib gunakan decodeWorkspaceSession (Tahap B compliance)
    const session = await decodeWorkspaceSession(request);
    
    // actorContext untuk audit tracing - memisahkan identity dari workspace (invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session?.tenantId || "",
      workspaceId: session?.workspaceId || "",
      actorId: session?.actorId || ""
    };

    console.log("[servicesid-webhook] Services.ID webhook received from actor", actorContext.actorId, "in workspace", actorContext.workspaceId, "correlationId:", correlationId);
    
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
        "x-servicesid-signature": request.headers.get("x-servicesid-signature") || "",
        // Pass correlation ID and actor context to canonical endpoint for end-to-end tracing
        "x-eos-correlation-id": correlationId,
        ...(actorContext.tenantId && { "x-tenant-id": actorContext.tenantId }),
        ...(actorContext.actorId && { "x-actor-id": actorContext.actorId })
      },
      body: JSON.stringify(body)
    });
    
    // Return canonical pipeline response directly to maintain API compatibility
    const canonicalData = await canonicalResponse.json();
    const response = NextResponse.json(canonicalData, { status: canonicalResponse.status });
    response.headers.set("x-eos-correlation-id", correlationId);
    
    return response;
  } catch (error) {
    console.error("[servicesid-webhook] Services.ID webhook processing failed:", error);
    return NextResponse.json({
      status: "FAILED",
      error: error instanceof Error ? error.message : "Unknown webhook processing failure",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}