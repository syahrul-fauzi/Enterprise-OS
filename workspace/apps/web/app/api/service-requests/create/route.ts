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
    console.log(`[POST /api/service-requests/create] Cookie header received: ${cookie ? cookie.substring(0, 200) + "..." : "MISSING"}`);
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      console.log(`[POST /api/service-requests/create] ERROR: ${WORKSPACE_SESSION_COOKIE} cookie not found in headers`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    console.log(`[POST /api/service-requests/create] Session cookie value (truncated): ${sessionValue.substring(0, 100)}...`);
    const session = decodeWorkspaceSession(sessionValue);
    console.log(`[POST /api/service-requests/create] Decoded session: ${JSON.stringify(session)}`);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      console.log(`[POST /api/service-requests/create] ERROR: Invalid session - missing required fields`);
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Parse request body - only extract required fields, all validation in capability
    const body = await request.json();
    const { title, description, category, budget } = body;

    // Single canonical capability invocation - all service request creation logic in service-directory capability
    const { output } = await capabilityRegistry.invokeAsync("service-directory", "createServiceRequest", {
      title,
      description: description || "",
      category,
      budget,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });

    if (!output) {
      return NextResponse.json({ error: "Failed to create service request" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/service-requests/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create service request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}