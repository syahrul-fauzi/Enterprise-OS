import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { readWorkspaceSessionFromRequest } from "@repo/core/kernel/session/workspace-session";

export async function POST(request: Request) {
  try {
    // Extract and validate session menggunakan canonical auth method
    const canonicalSession = readWorkspaceSessionFromRequest(request);
    
    if (!canonicalSession?.sessionId || !canonicalSession?.tenantId || !canonicalSession?.workspaceId || !canonicalSession?.actorId) {
      return NextResponse.json(
        {
          error: "Unauthorized — invalid or missing workspace session",
          status: "AUTH_INCONSISTENCY_RESOLVED"
        },
        { status: 401 },
      );
    }

    const payload = await request.json();
    // Tambahkan session context ke payload untuk compliance 6-boundary
    Object.assign(payload, {
      sessionId: canonicalSession.sessionId,
      tenantId: canonicalSession.tenantId,
      workspaceId: canonicalSession.workspaceId,
      actorId: canonicalSession.actorId
    });
    
    // Single canonical capability invocation - all release logic in capability layer
    const { output } = await capabilityRegistry.invoke("release", "prepareProcedureRelease", payload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to prepare release" }, { status: 500 });
  }
}