import { NextResponse } from "next/server";
import { WORKSPACE_SESSION_COOKIE } from "@repo/core-constants";
import { decodeWorkspaceSession } from "../../../../../../../capabilities/identity/implementation/services/session.service";
import { registry } from "../../../../../../../workspace.manifest";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const consultationId = params.id;
  const cookie = request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
  
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const session = decodeWorkspaceSession(sessionCookie.split("=")[1]);
    const body = await request.json();
    
    // Combine session context with request body for tenant isolation
    const authenticatedPayload = {
      id: consultationId,
      ...body,
      ...session
    };

    const { output } = registry.invoke(
      "consultation",
      "consultation.triage",
      authenticatedPayload
    );

    // Log evidence of triage
    await registry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityRef: consultationId,
        entityType: "consultation",
        action: "triage_completed",
        actorId: session.actorId,
        details: {
          triageResult: body.triageResult,
          linkedWorkItemId: output.linkedWorkItemId
        },
        timestamp: new Date().toISOString(),
        ...session
      }
    );

    return NextResponse.json({ consultation: output }, { status: 200 });
  } catch (error) {
    console.error("Failed to triage consultation:", error);
    return NextResponse.json({ 
      error: "Failed to triage consultation",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}