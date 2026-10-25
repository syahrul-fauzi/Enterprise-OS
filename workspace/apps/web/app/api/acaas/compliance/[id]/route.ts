import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeWorkspaceSession, WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

// GET: Retrieve compliance check result
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const complianceCheckId = params.id;
    if (!complianceCheckId) {
      return NextResponse.json({ error: "Missing compliance check ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    if (!sessionValue) {
      return NextResponse.json({ error: "Unauthorized: no session found" }, { status: 401 });
    }

    const decodedSession = decodeWorkspaceSession(sessionValue);
    if (!decodedSession?.sessionId || !decodedSession.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const result = await capabilityRegistry.invoke(
      "api-platform",
      "acaas.complianceCheck.getResult",
      {
        complianceCheckId,
        sessionId: decodedSession.sessionId,
        tenantId: decodedSession.tenantId,
        workspaceId: decodedSession.workspaceId,
        actorId: decodedSession.actorId
      }
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[API/ACAAS/COMPLIANCE/GET] Failed to get compliance check result:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST: Handle all state transitions (processing, completed, failed)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const complianceCheckId = params.id;
    if (!complianceCheckId) {
      return NextResponse.json({ error: "Missing compliance check ID" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    if (!sessionValue) {
      return NextResponse.json({ error: "Unauthorized: no session found" }, { status: 401 });
    }

    const decodedSession = decodeWorkspaceSession(sessionValue);
    if (!decodedSession?.sessionId || !decodedSession.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const body = await request.json();
    const { transition } = body;

    if (!transition || !["processing", "completed", "failed"].includes(transition)) {
      return NextResponse.json({ error: "Invalid or missing transition type (must be processing, completed, failed)" }, { status: 400 });
    }

    let commandName: string;
    let commandInput: any = {
      complianceCheckId,
      sessionId: decodedSession.sessionId,
      tenantId: decodedSession.tenantId,
      workspaceId: decodedSession.workspaceId,
      actorId: decodedSession.actorId
    };

    switch (transition) {
      case "processing":
        commandName = "acaas.complianceCheck.markProcessing";
        break;
      case "completed":
        if (!body.findings || !body.verificationProof) {
          return NextResponse.json({ error: "Missing required fields for completed transition: findings, verificationProof" }, { status: 400 });
        }
        commandName = "acaas.complianceCheck.markCompleted";
        commandInput.findings = body.findings;
        commandInput.verificationProof = body.verificationProof;
        break;
      case "failed":
        if (!body.failureReason || !body.errorCode) {
          return NextResponse.json({ error: "Missing required fields for failed transition: failureReason, errorCode" }, { status: 400 });
        }
        commandName = "acaas.complianceCheck.markFailed";
        commandInput.failureReason = body.failureReason;
        commandInput.errorCode = body.errorCode;
        break;
    }

    const result = await capabilityRegistry.invoke(
      "api-platform",
      commandName,
      commandInput
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[API/ACAAS/COMPLIANCE/POST] Failed to process compliance check transition:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}