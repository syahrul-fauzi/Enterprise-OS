import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

// CR-004: Provider Decision API - real human provider accepts/declines proposed work
// This endpoint implements the Provider Reality Gate requirement: only real humans can make decisions
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
    const { decision, providerNote, proposedPrice } = body;
    const workId = params.id;

    if (!workId || !decision || !["accepted", "declined"].includes(decision)) {
      return NextResponse.json({ 
        error: "Missing or invalid fields: workId and decision (accepted/declined) are required" 
      }, { status: 400 });
    }

    console.log(`[CR-004 + CR-005 /api/service-requests/${workId}/provider-decision]`);
    console.log(`Provider ${session.actorId} making decision: ${decision}`);
    console.log(`Proposed price: ${proposedPrice || "(no price proposed)"}`);
    console.log(`Note: ${providerNote || "(no note)"}`);

    // Execute the providerDecision command
    const result = await capabilityRegistry.executeCommand(
      "service-directory.providerDecisionServiceRequest",
      {
        id: workId,
        providerId: session.actorId,
        decision,
        providerNote: providerNote || null,
        proposedPrice: proposedPrice || null, // CR-005: Pass provider's price proposal
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    console.log(`[CR-004] Decision recorded successfully. Work ${workId} status: ${result.status}`);

    return NextResponse.json({
      success: true,
      workId,
      decision: result.status,
      providerNote: result.providerNote,
      providerDecisionAt: result.providerDecisionAt,
      message: `Provider decision recorded: ${result.status}`
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CR-004] Error processing provider decision:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}