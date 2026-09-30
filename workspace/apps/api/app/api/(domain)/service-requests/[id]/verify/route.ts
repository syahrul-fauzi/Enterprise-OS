// W-SVC-001: Work Verification API - real human customer verifies delivery of high-value resolution work
// This endpoint implements the Verification Reality Gate requirement: only real customers can verify work delivery
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
    const { verificationProof } = body;
    const workId = params.id;

    if (!workId || !verificationProof || typeof verificationProof !== "string" || verificationProof.length < 10) {
      return NextResponse.json({ 
        error: "Missing or invalid fields: workId and verificationProof (min 10 characters) are required" 
      }, { status: 400 });
    }

    console.log(`[W-SVC-001 /api/service-requests/${workId}/verify]`);
    console.log(`Customer ${session.actorId} verifying work delivery with proof: ${verificationProof.substring(0, 20)}...`);

    // Execute markServiceVerified command
    const result = await capabilityRegistry.executeCommand(
      "service-directory.markServiceVerified",
      {
        id: workId,
        verificationProof,
        sessionId: session.sessionId,
      }
    );

    console.log(`[W-SVC-001] Work verification recorded successfully. Work ${workId} status: ${result.status}`);

    return NextResponse.json({
      success: true,
      workId,
      status: result.status,
      verifiedAt: result.verifiedAt,
      message: `Work verified: Accountable Work Continuity progresses - work ${workId} is now ready for settlement`
    }, { status: 200 });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[W-SVC-001] Error processing work verification:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}