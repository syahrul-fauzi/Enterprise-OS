import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  createAnonymousWorkspaceSession,
  decodeWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";

// Server-side entry point: creates anonymous session if missing,
// sets the cookie server-side (so available immediately),
// then redirects to /workspace.
// This is the Golden Path entry point.
export async function GET() {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  let session = existingCookie?.value ? decodeWorkspaceSession(existingCookie.value) : null;

  if (!session || !session.sessionId) {
    session = createAnonymousWorkspaceSession();
    const encoded = encodeWorkspaceSession(session);
    // Set cookie via NextResponse for server-side cookie propagation
    const response = NextResponse.redirect(new URL("/workspace", "http://localhost"));
    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: encoded,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  // Session already exists - just redirect to workspace
  redirect("/workspace");
}