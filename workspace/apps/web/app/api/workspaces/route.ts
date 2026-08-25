"use server";

import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function GET(request: Request) {
  try {
    // Extract session from cookie (cookie handling only - all business logic in capability)
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Single canonical capability invocation - all workspace listing logic in identity capability
    const { output } = await capabilityRegistry.invokeAsync("identity", "getWorkspacesByTenant", {
      tenantId: session.tenantId,
      actorId: session.actorId,
      sessionId: session.sessionId,
    });

    if (!output) {
      return NextResponse.json({ error: "Workspaces not found or access denied" }, { status: 404 });
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[GET /api/workspaces] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch workspaces";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}