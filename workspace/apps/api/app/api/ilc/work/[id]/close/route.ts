import { NextRequest, NextResponse } from 'next/server';
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts";
import { capabilityRegistry } from "@repo/core-kernel/src/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession
} from "@repo/core-kernel/session/workspace-session";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // Validate boundary access first (6-boundary compliance)
  const boundaryValid = validateBoundaryAccess("ilc", "work-core");
  if (!boundaryValid) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  // Extract session from cookies (canonical session handling)
  const cookie = request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
  
  if (!sessionCookie) {
    return NextResponse.json({ error: "No session found" }, { status: 401 });
  }

  const sessionValue = sessionCookie.split("=")[1];
  if (!sessionValue) {
    return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
  }
  const session = decodeWorkspaceSession(sessionValue);
  if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  // Delegate all business logic to capability registry (pure adapter pattern)
  const result = await capabilityRegistry.invokeAsync({
    capability: "legal-case",
    command: "close",
    context: {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId
    },
    payload: {
      workId: params.id
    }
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
  }

  return NextResponse.json(result.data);
}