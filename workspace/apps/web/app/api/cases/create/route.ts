import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function POST(request: Request) {
  try {
    // Extract session from cookie (cookie handling only - all business logic in capability)
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.userId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Parse request body - only extract required fields, all validation in capability
    const body = await request.json();
    const { title, description, priority } = body;

    // Single canonical capability invocation - all case creation logic in legal-case capability
    const { output } = capabilityRegistry.invoke("legal-case", "case.create", {
      title,
      description,
      priority,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.userId,
    });

    if (!output) {
      return NextResponse.json({ error: "Failed to create case" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/cases/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create case";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}