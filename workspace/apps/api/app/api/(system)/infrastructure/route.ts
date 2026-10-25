// Canonical readiness probe API endpoint - uses core-kernel's unified health checks
// Implements D-002 health check centralization requirement
// Updated: P1-AUTH-013 - Fixed AUTH_INCONSISTENCY with canonical auth pattern
import { NextResponse } from "next/server";
import {
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";
import { runHealthChecks } from "@repo/core-kernel/health/health-checks";

// Lazy load capability registry untuk menghindari module cycles dan mendukung Edge Runtime
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

export async function GET(request: Request) {
  try {
    // 6-boundary compliance: Verifikasi api-gateway dapat mengakses infrastructure domain
    if (!validateBoundaryAccess("api-gateway", "infrastructure")) {
      console.error("[infrastructure-api] BOUNDARY ACCESS DENIED: api-gateway cannot access infrastructure domain directly");
      return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
    }

    // PR-01 requirement: correlation ID tracking for audit and observability
    const correlationId = request.headers.get("x-correlation-id") || `ready-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const host = request.headers.get("host")?.split(":")[0] || "localhost";
    
    // Canonical session validation - wajib gunakan decodeWorkspaceSession (Tahap B compliance)
    const session = await decodeWorkspaceSession(request);
    
    // actorContext untuk audit tracing - memisahkan identity dari workspace (invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session?.tenantId || "",
      workspaceId: session?.workspaceId || "",
      actorId: session?.actorId || ""
    };

    console.log("[infrastructure-api] Infrastructure status requested by actor", actorContext.actorId, "in workspace", actorContext.workspaceId, "correlationId:", correlationId);

    // Use canonical health checks from core-kernel (single source of truth)
    const healthReport = await runHealthChecks();
    const httpStatusCode = healthReport.overall_healthy ? 200 : 503;

    // Maintain backward compatibility with Kubernetes readiness probe format
    const readinessResponse = {
      status: healthReport.overall_healthy ? "ready" : "not_ready",
      service: "eos",
      correlationId,
      product: {
        requestHost: host,
      },
      checks: healthReport.dependencies,
      timestamp: healthReport.timestamp,
      // Expose actorContext only in development for debugging
      actorContext: process.env.NODE_ENV === "development" ? actorContext : undefined
    };

    const response = NextResponse.json(readinessResponse, { status: httpStatusCode });
    response.headers.set("x-eos-correlation-id", correlationId);
    response.headers.set("x-eos-request-host", host);
    
    return response;
  } catch (error) {
    console.error("[infrastructure-api] Infrastructure status check failed:", error);
    return NextResponse.json({ error: "Internal server error during infrastructure status check" }, { status: 500 });
  }
}