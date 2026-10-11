import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    const body = await request.json();
    const workId = body.workId;
    const action = body.action || "create";

    if (!workId) {
      return NextResponse.json({ error: "Missing required field: workId (CORE-001 compliance)" }, { status: 400 });
    }

    console.log(`[POST /api/requirements] Executing ${action} for workId ${workId} by ${session.actorId}`);

    const commonInput = {
      ...body,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    let commandName: string;
    if (action === "update") {
      commandName = "requirement.update";
    } else {
      commandName = "requirement.create";
    }

    const result = await capabilityRegistry.invoke("requirement-management", commandName, commonInput);
    return NextResponse.json({
      ok: true,
      output: result.output,
    }, { status: 200 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      ok: false,
      error: message,
    }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  // Reuse POST logic for updates, maintain same CORE-001 compliance
  return POST(request);
}