import { NextResponse } from "next/server";
import {
  capabilityRegistry,
  readWorkspaceSessionFromRequest,
  createAnonymousWorkspaceSession,
  isAuthenticatedSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import type { GetSessionByIdOutput } from "../../../../../capabilities/identity/implementation/commands/get-session-by-id.command";

export async function GET(request: Request) {
  try {
    const cookieSession = readWorkspaceSessionFromRequest(request)
      ?? createAnonymousWorkspaceSession();

    if (!cookieSession.sessionId) {
      return NextResponse.json({
        ok: true,
        authenticated: false,
        session: cookieSession,
      }, { status: 200 });
    }

    const { output } = await capabilityRegistry.invokeAsync<GetSessionByIdOutput>(
      "identity",
      "getSessionById",
      { sessionId: cookieSession.sessionId }
    );

    if (!output || !output.authenticated) {
      const anonymous = createAnonymousWorkspaceSession();
      return NextResponse.json({
        ok: true,
        authenticated: false,
        session: anonymous,
      }, { status: 200 });
    }

    const verifiedSession: WorkspaceSession = {
      sessionId: output.session.sessionId,
      actorId: output.session.actorId,
      actorLabel: output.session.actorLabel,
      tenantId: output.session.tenantId,
      workspaceId: output.session.workspaceId,
      productId: output.session.productId,
      issuedAt: output.session.issuedAt,
      userId: output.session.actorId,
      authenticated: true,
    } as WorkspaceSession;

    return NextResponse.json({
      ok: true,
      authenticated: isAuthenticatedSession(verifiedSession),
      session: verifiedSession,
    }, { status: 200 });
  } catch (error) {
    const anonymous = createAnonymousWorkspaceSession();
    return NextResponse.json({
      ok: false,
      authenticated: false,
      session: anonymous,
      error: error instanceof Error ? error.message : "Failed to fetch session",
    }, { status: 500 });
  }
}
