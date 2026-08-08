import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  createDefaultWorkspaceSession,
  encodeWorkspaceSession,
  readWorkspaceSessionFromRequest,
} from "../../../lib/workspace-session";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "../../../lib/product-context";

export async function GET(request: Request) {
  let session = readWorkspaceSessionFromRequest(request) ?? createDefaultWorkspaceSession();
  const trace = createWorkspaceRequestTrace(request, "workspace.session.read");
  const productContext = readProductContextFromRequest(request);
  
  // Update session productId dengan productId dari request context jika ada
  if (productContext.productId && session.productId !== productContext.productId) {
    session = {
      ...session,
      productId: productContext.productId
    };
  }
  
  const headers = applyProductContextHeaders({
    headers: createWorkspaceContextHeaders({ session, trace }),
    productContext,
  });

  const response = NextResponse.json(
    {
      authenticated: true,
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