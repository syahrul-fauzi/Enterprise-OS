// This API route is temporarily disabled until auth and atomic-composition dependencies are resolved
// EOS Face priority first - only core user-facing workflows are enabled for production
import { NextResponse } from "next/server";
import { readWorkspaceSessionFromRequest } from '@repo/core-kernel';
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";

export async function POST(request: Request) {
  try {
    // Canonical session validation - maintain AUTH_INCONSISTENCY compliance even for maintenance route
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

    return NextResponse.json({ 
      error: "AI Agent tasks feature is temporarily under maintenance",
      status: "maintenance",
      context: {
        workspaceId,
        tenantId,
        actorId,
        sessionId
      }
    }, { status: 503 });
  } catch (error) {
    console.error("[POST /api/ai-tasks/restart] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}