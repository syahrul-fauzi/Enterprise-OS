import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  readWorkspaceSessionFromRequest,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
  isAuthenticatedSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity/repositories";

export async function GET(request: Request) {
  try {
    const existingCookieSession = readWorkspaceSessionFromRequest(request);
    const cookieSession = existingCookieSession ?? createAnonymousWorkspaceSession();
    const isNewAnonymousSession = existingCookieSession === null;

    // For InMemory/light mode (no DATABASE_URL configured), always return the cookie session
    // This matches FIRST LIGHT MODE specified in .env.local
    if (!process.env.DATABASE_URL) {
      const response = NextResponse.json(
        {
          ok: true,
          authenticated: isAuthenticatedSession(cookieSession),
          session: cookieSession,
          isNewAnonymousSession,
        },
        { status: 200 },
      );
      // Always SET cookie for anonymous sessions so subsequent requests carry the session
      // This is the CRITICAL FIX - without setting the cookie, /work/* routes all redirect to /
      if (isNewAnonymousSession) {
        response.cookies.set({
          name: WORKSPACE_SESSION_COOKIE,
          value: encodeWorkspaceSession(cookieSession),
          httpOnly: true,
          sameSite: "lax",
          path: "/",
        });
      }
      return response;
    }

    // Production path with Postgres - only executed if DATABASE_URL is set
    await initIdentitySchema();
    const sessionRepository = getSessionRepositoryPostgres();
    const dbSession = await sessionRepository.byId(cookieSession.sessionId as any);

    if (!dbSession || dbSession.revokedAt !== null) {
      const anonymous = createAnonymousWorkspaceSession();
      const response = NextResponse.json(
        {
          ok: true,
          authenticated: false,
          session: anonymous,
          isNewAnonymousSession: true,
        },
        { status: 200 },
      );
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: encodeWorkspaceSession(anonymous),
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return response;
    }

    const verifiedSession: WorkspaceSession = {
      sessionId: String(dbSession.id),
      actorId: String(dbSession.actorId),
      actorLabel: dbSession.actorLabel,
      tenantId: String(dbSession.tenantId),
      workspaceId: String(dbSession.workspaceId),
      productId: dbSession.productId,
      issuedAt: new Date(dbSession.issuedAt).toISOString(),
      userId: String(dbSession.userId),
      authenticated: true,
    } as WorkspaceSession;

    return NextResponse.json(
      {
        ok: true,
        authenticated: isAuthenticatedSession(verifiedSession),
        session: verifiedSession,
        isNewAnonymousSession: false,
      },
      { status: 200 },
    );
  } catch (error) {
    // Graceful fallback - never fail session loading, always return anonymous session
    const anonymous = createAnonymousWorkspaceSession();
    console.warn("[session] Graceful fallback to anonymous session:", error instanceof Error ? error.message : error);
    const response = NextResponse.json(
      {
        ok: true,
        authenticated: false,
        session: anonymous,
        error: undefined, // Don't expose internal errors to client
        isNewAnonymousSession: true,
      },
      { status: 200 }, // Always return 200 - client side handles anonymous state
    );
    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: encodeWorkspaceSession(anonymous),
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }
}