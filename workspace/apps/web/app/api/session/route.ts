import { NextResponse } from "next/server";
import {
  readWorkspaceSessionFromRequest,
  createAnonymousWorkspaceSession,
  isAuthenticatedSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity/repositories";

export async function GET(request: Request) {
  try {
    const cookieSession = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();

    // For InMemory/light mode (no DATABASE_URL configured), always return the cookie session
    // This matches FIRST LIGHT MODE specified in .env.local
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        {
          ok: true,
          authenticated: isAuthenticatedSession(cookieSession),
          session: cookieSession,
        },
        { status: 200 },
      );
    }

    // Production path with Postgres - only executed if DATABASE_URL is set
    await initIdentitySchema();
    const sessionRepository = getSessionRepositoryPostgres();
    const dbSession = await sessionRepository.byId(cookieSession.sessionId as any);

    if (!dbSession || dbSession.revokedAt !== null) {
      const anonymous = createAnonymousWorkspaceSession();
      return NextResponse.json(
        {
          ok: true,
          authenticated: false,
          session: anonymous,
        },
        { status: 200 },
      );
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
      },
      { status: 200 },
    );
  } catch (error) {
    // Graceful fallback - never fail session loading, always return anonymous session
    const anonymous = createAnonymousWorkspaceSession();
    console.warn("[session] Graceful fallback to anonymous session:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      {
        ok: true,
        authenticated: false,
        session: anonymous,
        error: undefined, // Don't expose internal errors to client
      },
      { status: 200 }, // Always return 200 - client side handles anonymous state
    );
  }
}