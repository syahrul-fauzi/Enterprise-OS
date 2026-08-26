import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import {
  listCasesByWorkspace,
} from "../../../../../../capabilities/legal-case/implementation/commands/case.commands";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "../../../../../../capabilities/identity/implementation/repositories/index";

// P0: MAKE EOS VISIBLE - API to list all cases for current session's workspace
// Allows anonymous users to see the work they've created (Work Reality Surface)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    const cookie = request.headers.get("Cookie");
    console.log(`[GET /api/cases/list] Cookie header received: ${cookie ? cookie.substring(0, 200) + "..." : "MISSING"}`);
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    // If no session cookie exists, create an anonymous session (consistent pattern with create route)
    if (!sessionCookie) {
      console.log(`[GET /api/cases/list] No existing session - creating anonymous session for visitor`);
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    console.log(`[GET /api/cases/list] Decoded session: ${JSON.stringify(session)}`);
    
    // Validate session has required context (both authenticated and anonymous sessions work)
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Only validate session in DB for authenticated users (non-anonymous)
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    // Use capability registry to invoke list command - maintains substrate integrity
    const cases = await capabilityRegistry.invokeAsync("legal-case", "case.listByWorkspace", {
      limit,
      offset,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });

    const caseList = cases.output as Array<unknown>;
    console.log(`[GET /api/cases/list] Returned ${caseList.length} cases for workspace ${session.workspaceId}`);
    return NextResponse.json({
      cases: caseList,
      total: caseList.length,
      limit,
      offset
    }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/cases/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}