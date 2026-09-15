import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "../../../../../../capabilities/identity/dist/repositories/index.js";

export async function POST(request: Request) {
  try {
    // Extract session from cookie (cookie handling only - all business logic in capability)
    const cookie = request.headers.get("Cookie");
    console.log(`[POST /api/requirements/create] Cookie header received: ${cookie ? cookie.substring(0, 200) + "..." : "MISSING"}`);
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    // If no session cookie exists, create an anonymous session on the fly (P0: allow first-time visitors)
    if (!sessionCookie) {
      console.log(`[POST /api/requirements/create] No existing session - creating anonymous session for visitor`);
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    console.log(`[POST /api/requirements/create] Session cookie value (truncated): ${sessionValue.substring(0, 100)}...`);
    const session = decodeWorkspaceSession(sessionValue);
    console.log(`[POST /api/requirements/create] Decoded session: ${JSON.stringify(session)}`);
    
    // Handle both authenticated AND anonymous sessions (P0: allow first-time visitors to create Work)
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      console.log(`[POST /api/requirements/create] ERROR: Invalid session - missing required fields`);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Only validate session in DB for authenticated users (non-anonymous)
    // Anonymous sessions are ephemeral and don't need DB validation
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      // REALITY PATH ONLY: init schema + validate session from trusted repository (fail-closed)
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        console.error(`[POST /api/requirements/create] Session revoked/invalid in DB: ${session.sessionId}`);
        return NextResponse.json({ error: "Session revoked or invalid - please re-login" }, { status: 401 });
      }
    }

    // Parse request body - only extract required fields, all validation in capability
    const body = await request.json();
    const { title, description, priority, source } = body;

    // Single canonical capability invocation - all requirement creation logic in requirement-management capability
    // SHARED RAIL: sessionId ONLY - tenant/workspace/actor derived from trusted session (MIRRORS LH pattern)
    const { output } = await capabilityRegistry.invokeAsync("requirement-management", "createRequirement", {
      title,
      description: description || "",
      priority: priority || "medium",
      source: source || "internal",
      sessionId: session.sessionId,
    });

    if (!output) {
      return NextResponse.json({ error: "Failed to create requirement" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/requirements/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create requirement";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET endpoint to list all requirements
export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    
    if (!sessionCookie) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    
    if (!session || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Only validate session in DB for authenticated users
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(100, parseInt(searchParams.get("limit") || "20", 10));
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    const result = await capabilityRegistry.invokeAsync("requirement-management", "listRequirementsByWorkspace", {
      sessionId: session.sessionId,
      limit,
      offset,
    });

    return NextResponse.json({
      requirements: result?.output || [],
      total: result?.output?.length || 0,
      limit,
      offset
    }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/requirements/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list requirements";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}