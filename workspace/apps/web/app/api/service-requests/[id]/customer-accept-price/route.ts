// CR-005: Customer Price Acceptance API - real human customer accepts/rejects provider's price proposal
// This endpoint implements the Price Reality Gate requirement: only real customers can accept/reject prices
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
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
    const { accept } = body;
    const workId = params.id;

    if (!workId || typeof accept !== "boolean") {
      return NextResponse.json({ 
        error: "Missing or invalid fields: workId and accept (boolean) are required" 
      }, { status: 400 });
    }

    console.log(`[CR-005 /api/service-requests/${workId}/customer-accept-price]`);
    console.log(`Customer ${session.actorId} making price decision: ${accept ? "accepted" : "rejected"}`);

    if (accept) {
      // Execute customerAcceptPrice command
      const result = await capabilityRegistry.executeCommand(
        "service-directory.customerAcceptPriceServiceRequest",
        {
          id: workId,
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }
      );

      console.log(`[CR-005] Price acceptance recorded successfully. Work ${workId} status: ${result.status}`);

      return NextResponse.json({
        success: true,
        workId,
        status: result.status,
        priceAcceptedAt: result.priceAcceptedAt,
        message: `Price accepted: work now in ${result.status} status, ready for payment processing`
      }, { status: 200 });
    } else {
      // If customer rejects price, set work to declined
      // Reuse providerDecision command with decline to maintain consistent state transitions
      const result = await capabilityRegistry.executeCommand(
        "service-directory.providerDecisionServiceRequest",
        {
          id: workId,
          providerId: session.actorId, // Customer is the one rejecting
          decision: "declined",
          providerNote: "Customer rejected price proposal",
          sessionId: session.sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
        }
      );

      console.log(`[CR-005] Customer rejected price. Work ${workId} status: ${result.status}`);

      return NextResponse.json({
        success: true,
        workId,
        status: result.status,
        message: "Price rejected: work has been cancelled"
      }, { status: 200 });
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[CR-005] Error processing customer price decision:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}