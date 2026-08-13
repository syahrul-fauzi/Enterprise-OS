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
      id: requirementId,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // Use existing getRequirementById query which already has full tenant isolation validation
    const { output } = capabilityRegistry.invoke("requirements", "getRequirementById", authenticatedPayload);
    // Return proof-related data from the verified requirement
    return NextResponse.json({
      verifiedAt: output.verifiedAt,
      verificationStatus: output.verificationStatus,
      // Any additional proof metadata that exists on the requirement
      proofChain: output.verifiedAt ? [output.id, output.verifiedAt] : [],
    }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/requirements/[id]/proof] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch proof object";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}