import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Decode session cookie (same pattern as other API routes)
    const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
    const parsedSession = JSON.parse(decodedSession);
    const { sessionId, tenantId, workspaceId, actorId } = parsedSession;

    const body = await request.json();
    const { caseId, operation, evidence, outcomeDescription, externalReferenceId } = body;

    const commonInput = {
      id: caseId,
      sessionId: sessionId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      actorId: actorId
    };

    let result;
    if (operation === "addEvidence") {
      if (!evidence) {
        return NextResponse.json({ error: "Evidence data is required" }, { status: 400 });
      }
      result = await capabilityRegistry.invoke("legal-case", "case.addEvidence", {
        ...commonInput,
        evidence: evidence
      });
    } else if (operation === "markCompleted") {
      if (!outcomeDescription) {
        return NextResponse.json({ error: "Outcome description is required" }, { status: 400 });
      }
      result = await capabilityRegistry.invoke("legal-case", "case.markCompleted", {
        ...commonInput,
        outcomeDescription: outcomeDescription,
        externalReferenceId: externalReferenceId
      });
    } else {
      return NextResponse.json({ error: `Unsupported operation: ${operation}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Case ${operation} executed successfully`,
      data: result.output
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /cases/evidence] Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}