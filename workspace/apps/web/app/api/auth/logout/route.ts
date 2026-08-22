import { NextResponse } from "next/server";
import {
  capabilityRegistry,
  WORKSPACE_SESSION_COOKIE,
  readWorkspaceSessionFromRequest,
} from "@repo/core-kernel";

export async function POST(request: Request) {
  try {
    const session = readWorkspaceSessionFromRequest(request);
    const sessionId = session?.sessionId;

    if (sessionId) {
      await capabilityRegistry.invokeAsync("identity", "logoutUser", { sessionId });
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: false,
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
  } catch (error) {
    const response = NextResponse.json({
      ok: false,
      error: "Logout failed",
    }, { status: 500 });

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
}
