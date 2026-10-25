// Canonical /api/health endpoint - uses core-kernel's unified health checks
// Implements D-002 health check centralization requirement
import { NextResponse } from "next/server";
import {
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";
import { runHealthChecks } from "@repo/core-kernel/health/health-checks";

async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

export async function GET(request: Request) {
  try {
    // Validate boundary access: api-gateway can access work-core domain for health checks
    if (!validateBoundaryAccess("api-gateway", "work-core")) {
      console.error("[health-api] BOUNDARY ACCESS DENIED: api-gateway cannot access work-core domain directly");
      return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
    }

    // Decode canonical session for audit tracing
    const session = await decodeWorkspaceSession(request);
    
    // Create actorContext for evidence and audit
    const actorContext = {
      tenantId: session?.tenantId || "",
      workspaceId: session?.workspaceId || "",
      actorId: session?.actorId || ""
    };

    // Log health check access for audit trail
    console.log("[health-api] Health check requested by actor", actorContext.actorId, "in workspace", actorContext.workspaceId);

    const healthReport = await runHealthChecks();
    const statusCode = healthReport.overall_healthy ? 200 : 503;
    
    return NextResponse.json({
      ...healthReport,
      actorContext: process.env.NODE_ENV === "development" ? actorContext : undefined // Only expose in dev for debugging
    }, { status: statusCode });
  } catch (error) {
    console.error("[health-api] Health check failed:", error);
    return NextResponse.json({ error: "Internal server error during health check" }, { status: 500 });
  }
}