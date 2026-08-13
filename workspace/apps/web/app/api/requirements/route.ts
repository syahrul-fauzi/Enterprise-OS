import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function GET(request: Request) {
  try {
    // Extract session from cookie (authentication & tenant isolation only at edge)
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const payload = Object.fromEntries(searchParams.entries());
    
    // Add session context for tenant/workspace isolation
    const authenticatedPayload = {
      ...payload,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // Single canonical capability invocation - all requirements search logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "searchRequirements", authenticatedPayload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[GET /api/requirements] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to search requirements";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Extract session from cookie (authentication & tenant isolation only at edge)
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const payload = await request.json();
    
    // Add session context for tenant/workspace isolation
    const authenticatedPayload = {
      ...payload,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // Single canonical capability invocation - all requirements creation logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "createRequirement", authenticatedPayload);
    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/requirements] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create requirement";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}