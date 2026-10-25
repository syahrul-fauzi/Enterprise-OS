import { NextResponse } from 'next/server';
import { ExecutionStatusRepository } from '@repo/core-runtime/execution-status.js';
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel';
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";

export async function GET(
  request: Request,
  { params }: { params: { executionId: string } }
) {
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
      workspaceId: session.workspaceId,
      sessionId: session.sessionId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access execution domain
    if (!validateBoundaryAccess('api-gateway', 'execution')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
    }

    const { workspaceId, tenantId, actorId, sessionId } = actorContext;

    const status = await ExecutionStatusRepository.getStatus(params.executionId);
    
    if (!status) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: status.current,
      updatedAt: status.updatedAt,
      transitions: status.transitions.slice(-5), // Last 5 transitions
      context: {
        workspaceId,
        tenantId,
        actorId,
        sessionId
      }
    });
  } catch (error) {
    console.error('[API /status/[executionId]] Error:', error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}