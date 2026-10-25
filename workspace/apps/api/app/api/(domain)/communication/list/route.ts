import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel';
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";

export async function GET(request: Request) {
  try {
    // 1. Get work_id from query parameters
    const { searchParams } = new URL(request.url);
    const work_id = searchParams.get("work_id");
    
    if (!work_id) {
      return NextResponse.json({ error: "Missing work_id parameter" }, { status: 400 });
    }

    // Canonical session validation - extract verified workspace/tenant/actor IDs
    const session = readWorkspaceSessionFromRequest(request);
    if (!session?.sessionId || !session?.tenantId || !session?.workspaceId || !session?.actorId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }

    // Create canonical actorContext (mematuhi invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session.tenantId,
      actorId: session.actorId,
      workspaceId: session.workspaceId,
      sessionId: session.sessionId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access communication domain
    if (!validateBoundaryAccess('api-gateway', 'communication')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
    }

    const { sessionId, tenantId, workspaceId, actorId } = actorContext;

    // 4. Invoke communication.listEvents query
    console.log(`[GET /api/communication/list] Listing communications for work ${work_id}`);
    
    const result = await capabilityRegistry.invoke("communication", "communication.listEvents", {
      work_id,
      sessionId,
      tenantId,
      workspaceId,
      actorId
    });

    // 5. Return success response
    return NextResponse.json({
      success: true,
      data: result.output,
      context: actorContext
    });

  } catch (error) {
    console.error("[GET /api/communication/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}