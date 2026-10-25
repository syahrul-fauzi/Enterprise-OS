import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "../../../../../../capabilities/identity/implementation/repositories/index";
import { getAllWorksForWorkspace, CanonicalWorkRecord } from "../../work/create/route";
import { registerLegalCaseCapability } from "../../../../../../capabilities/legal-case/implementation/commands/case.commands";

// Register capability once at startup (canonical pattern)
registerLegalCaseCapability();

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

    // SLIC-003: Gunakan listByWorkIds yang sudah diupdate dengan context filtering (gantikan list-cases-for-tenant yang deprecated)
    // Pertama, ambil semua Work yang terdaftar di workspace saat ini (sesuai model work-centric: workId > workspaceId > tenantId)
    const canonicalWorks = getAllWorksForWorkspace(session.workspaceId);
    const workIds = canonicalWorks.map((work: CanonicalWorkRecord) => work.workId);
    console.log(`[GET /api/cases/list] Found ${workIds.length} works in workspace ${session.workspaceId}: ${workIds.join(", ")}`);
    
    // Gunakan canonical query registry untuk memanggil case.search (pure adapter pattern)
    const searchResult = await capabilityRegistry.executeQuery("case.search", {
      limit,
      offset,
      workspaceId: session.workspaceId,
      tenantId: session.tenantId,
      workIds: workIds // Filter hanya work yang terdaftar di workspace ini
    });

    console.log(`[GET /api/cases/list] Returned ${searchResult.items.length} cases for workspace ${session.workspaceId} (after isolation filtering)`);
    return NextResponse.json({
      cases: searchResult.items,
      total: searchResult.total,
      limit,
      offset
    }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/cases/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}