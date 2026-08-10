import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
  readWorkspaceSessionFromRequest,
  isAuthenticatedSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";
import { SessionRepositoryInMemory } from "../../../../../capabilities/identity/implementation/repositories";
import { SessionId } from "../../../../../capabilities/identity/implementation/contracts/identity.contracts";

function resolveEffectiveSession(raw: WorkspaceSession | null): WorkspaceSession {
  if (raw === null) {
    return createAnonymousWorkspaceSession();
  }
  if (raw.sessionId !== undefined) {
    const revoked = SessionRepositoryInMemory.isRevoked(SessionId(raw.sessionId));
    if (revoked) {
      return createAnonymousWorkspaceSession();
    }
  }
  return raw;
}

export async function GET(request: Request) {
  const rawSession = readWorkspaceSessionFromRequest(request);
  let session = resolveEffectiveSession(rawSession);
  const trace = createWorkspaceRequestTrace(request, "workspace.session.read");
  const productContext = readProductContextFromRequest(request);

  if (productContext.productId && session.productId !== productContext.productId) {
    session = {
      ...session,
      productId: productContext.productId
    };
  }

  const authenticated = isAuthenticatedSession(session);

  const headers = applyProductContextHeaders({
    headers: createWorkspaceContextHeaders({ session, trace }),
    productContext,
  });

  const response = NextResponse.json(
    {
      authenticated,
      session,
      request: trace,
      product: productContext,
    },
    {
      headers,
    },
  );

  response.cookies.set({
    name: WORKSPACE_SESSION_COOKIE,
    value: encodeWorkspaceSession(session),
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}