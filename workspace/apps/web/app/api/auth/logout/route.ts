import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  readWorkspaceSessionFromRequest,
  capabilityRegistry,
} from "@repo/core-kernel";

type LogoutOutput = {
  readonly ok: true;
  readonly revokedSessionId?: string;
  readonly revokedAt?: string;
};

export async function POST(request: Request) {
  const cookieSession = readWorkspaceSessionFromRequest(request);
  const sessionId = cookieSession?.sessionId;

  const invocation = capabilityRegistry.invoke<LogoutOutput>("identity", "logoutUser", {
    sessionId,
  });
  const anonymous = createAnonymousWorkspaceSession();
  const response = NextResponse.json(
    {
      ok: true,
      authenticated: false,
      revokedSessionId: invocation.output.revokedSessionId,
      revokedAt: invocation.output.revokedAt,
      record: invocation.record,
    },
    { status: 200 },
  );
  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE,
    value: encodeWorkspaceSession(anonymous),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
  return response;
}