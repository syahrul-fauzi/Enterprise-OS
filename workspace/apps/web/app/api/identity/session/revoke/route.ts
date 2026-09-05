import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  readWorkspaceSessionFromRequest,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { getSessionRepositoryPostgres, initIdentitySchema } from "@repo/capabilities-identity/repositories";
import { SessionId } from "@repo/capabilities-identity/implementation/contracts/identity.contracts";

// Initialize schema once at route load
initIdentitySchema().catch(err => console.error("[session/revoke] Failed to init identity schema:", err));
const sessionRepository = getSessionRepositoryPostgres();

export async function POST(request: Request) {
  try {
    // Read session from request to authenticate caller
    const requestSession = readWorkspaceSessionFromRequest(request);
    if (!requestSession?.sessionId || !requestSession?.userId) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { sessionIdToRevoke } = body;

    if (!sessionIdToRevoke) {
      return NextResponse.json({ error: "sessionIdToRevoke is required" }, { status: 400 });
    }

    // Get the session being revoked to verify ownership
    const sessionToRevoke = await sessionRepository.byId(SessionId(sessionIdToRevoke));
    if (!sessionToRevoke) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify the user owns the session they're trying to revoke
    if (sessionToRevoke.userId !== requestSession.userId) {
      return NextResponse.json({ error: "Forbidden: Cannot revoke another user's session" }, { status: 403 });
    }

    // Revoke the session
    const revokedSession = await sessionRepository.revoke(SessionId(sessionIdToRevoke));

    // If the revoked session is the current request session, clear the cookie
    if (sessionIdToRevoke === requestSession.sessionId) {
      const response = NextResponse.json({
        ok: true,
        revokedSession: {
          id: revokedSession.id,
          revokedAt: revokedSession.revokedAt,
        }
      }, { status: 200 });

      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: "",
        expires: new Date(0),
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });

      return response;
    }

    return NextResponse.json({
      ok: true,
      revokedSession: {
        id: revokedSession.id,
        revokedAt: revokedSession.revokedAt,
      }
    }, { status: 200 });

  } catch (error) {
    console.error("[POST /api/identity/session/revoke] Error:", error);
    return NextResponse.json({
      ok: false,
      error: "Failed to revoke session",
    }, { status: 500 });
  }
}