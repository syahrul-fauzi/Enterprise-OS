import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { readWorkspaceSessionFromRequest } from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";

export async function POST(request: Request) {
  try {
    // Canonical session validation - extract verified workspace/tenant/actor IDs
    const session = readWorkspaceSessionFromRequest(request);
    if (!session?.sessionId || !session?.workspaceId || !session?.tenantId || !session?.actorId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }

    // Create canonical actorContext (mematuhi invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session.tenantId,
      actorId: session.actorId,
      workspaceId: session.workspaceId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access communication domain
    if (!validateBoundaryAccess('api-gateway', 'communication')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
    }

    const { workspaceId, tenantId, actorId, sessionId } = actorContext;
    
    const payload = await request.json();
    // Add canonical context to payload untuk consistency boundary enforcement
    const enrichedPayload = {
      ...payload,
      context: {
        ...payload.context,
        workspaceId,
        tenantId,
        actorId,
        sessionId
      }
    };
    
    // Single canonical capability invocation - all release logic in capability layer
    const { output } = await capabilityRegistry.invoke("release", "prepareChatRelease", enrichedPayload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[POST /api/communication/prepare-release] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}