// W-SVC-001: Settlement API - real human customer settles a verified high-value resolution work
// This endpoint implements the Settlement Reality Gate requirement: only verified work can be settled
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { settlementProof } = body;
    const workId = params.id;

    if (!workId || !settlementProof || typeof settlementProof !== "string" || settlementProof.length < 10) {
      return NextResponse.json({ 
        error: "Missing or invalid fields: workId and settlementProof (min 10 chars) are required" 
      }, { status: 400 });
    }

    console.log(`[W-SVC-001 /api/service-requests/${workId}/settle]`);
    console.log(`Customer ${session.actorId} settling work with proof: ${settlementProof.substring(0, 20)}...`);

    // Execute settle command
    const result = await capabilityRegistry.executeCommand(
      "service-directory.settleServiceRequest",
      {
        id: workId,
        settlementProof,
        sessionId: session.sessionId,
      }
    );

    console.log(`[W-SVC-001] Work ${workId} settled successfully. Status: ${result.status}, Settled at: ${result.settledAt}`);

    return NextResponse.json({
      success: true,
      workId,
      status: result.status,
      settledAt: result.settledAt,
      message: `Work settled: Accountable Work Continuity complete for work ${workId}`
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[W-SVC-001] Error processing work settlement:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}