import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Decode session cookie (standard EOS pattern)
    const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const parsedSession = JSON.parse(decodedSession);
    const { sessionId, tenantId, workspaceId, actorId } = parsedSession;

    const requirementId = params.id;
    if (!requirementId) {
      return NextResponse.json({ error: "Requirement ID is required" }, { status: 400 });
    }

    const commonInput = {
      id: requirementId,
      sessionId: sessionId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      actorId: actorId
    };

    // Invoke evidence-registry capability to retrieve requirement evidence
    const result = await capabilityRegistry.invoke("evidence-registry", "evidence.search", {
      ...commonInput,
      filter: { workId: requirementId, objectType: "requirement" }
    });

    return NextResponse.json({
      success: true,
      message: `Evidence retrieved for requirement ${requirementId}`,
      data: result.output
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /requirements/[id]/evidence] Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}