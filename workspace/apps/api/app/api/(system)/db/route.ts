// Canonical database health check API endpoint - uses core-kernel's unified health checks
// Maintains Kubernetes liveness/readiness probe compatibility
// Updated: P1-AUTH-014 - Fixed AUTH_INCONSISTENCY with canonical auth pattern
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
    // 6-boundary compliance: Verifikasi api-gateway dapat mengakses infrastructure/db domain
    if (!validateBoundaryAccess("api-gateway", "infrastructure")) {
      console.error("[db-api] BOUNDARY ACCESS DENIED: api-gateway cannot access infrastructure domain directly");
      return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
    }

    // PR-01 requirement: correlation ID tracking for audit and observability
    const correlationId = request.headers.get("x-correlation-id") || `db-ready-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Canonical session validation - wajib gunakan decodeWorkspaceSession (Tahap B compliance)
    const session = await decodeWorkspaceSession(request);
    
    // actorContext untuk audit tracing - memisahkan identity dari workspace (invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session?.tenantId || "",
      workspaceId: session?.workspaceId || "",
      actorId: session?.actorId || ""
    };

    console.log("[db-api] Database health status requested by actor", actorContext.actorId, "in workspace", actorContext.workspaceId, "correlationId:", correlationId);

    // Use canonical health checks from core-kernel (single source of truth)
    const healthReport = await runHealthChecks();
    
    // Maintain backward compatibility with Kubernetes liveness probe format
    // Extract database-specific status from unified health report
    const databaseStatus = healthReport.dependencies.database;
    const isAllHealthy = healthReport.overall_healthy;
    
    // Transform to Kubernetes-compatible format (preserves existing probe expectations)
    const k8sResponse = {
      status: isAllHealthy ? "UP" : "DOWN",
      databases: databaseStatus.details,
      timestamp: healthReport.timestamp,
      correlationId,
      // Expose actorContext only in development for debugging
      actorContext: process.env.NODE_ENV === "development" ? actorContext : undefined
    };
    
    // Return 200 if all healthy, 503 if any database is down
    const statusCode = isAllHealthy ? 200 : 503;

    const response = NextResponse.json(k8sResponse, { statusCode });
    response.headers.set("x-eos-correlation-id", correlationId);
    
    return response;
    
  } catch (error) {
    console.error("[db-api] Database health check failed:", error);
    return NextResponse.json({
      status: "DOWN",
      error: error instanceof Error ? error.message : "Unknown health check failure",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}