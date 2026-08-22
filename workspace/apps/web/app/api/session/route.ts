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
} from "../../../../../capabilities/identity/implementation/repositories/index";

export async function GET(request: Request) {
  try {
    const cookieSession = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();

    if (!cookieSession.sessionId) {
      return NextResponse.json(
        {
          ok: true,
          authenticated: false,
          session: cookieSession,
        },
        { status: 200 },
      );
    }

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
    const anonymous = createAnonymousWorkspaceSession();
    return NextResponse.json(
      {
        ok: false,
        authenticated: false,
        session: anonymous,
        error: error instanceof Error ? error.message : "Failed to fetch session",
      },
      { status: 500 },
    );
  }
}
