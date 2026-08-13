import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: Params }) {
  try {
    // Extract session from cookie (authentication & tenant isolation only at edge)
    const cookie = _request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { id: requirementId } = await segment.params;
    
    // Add session context for tenant/workspace isolation
    const authenticatedPayload = {
      requirementId,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // Single canonical capability invocation - all requirement logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "getRequirementById", authenticatedPayload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[GET /api/requirements/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch requirement";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(_request: Request, segment: { params: Params }) {
  try {
    // Extract session from cookie (authentication & tenant isolation only at edge)
    const cookie = _request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { id: requirementId } = await segment.params;
    const payload = await _request.json();
    
    // Add session context for tenant/workspace isolation
    const authenticatedPayload = {
      requirementId,
      ...payload,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // Single canonical capability invocation - all requirement updates in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "updateRequirement", authenticatedPayload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[PATCH /api/requirements/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update requirement";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}