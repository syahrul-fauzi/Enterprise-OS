import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function GET(request: Request) {
  try {
    // Extract session from cookie (cookie handling only - all business logic in capability)
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Extract query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Single canonical capability invocation - all case listing logic in legal-case capability
    const { output } = capabilityRegistry.invoke("legal-case", "case.listByWorkspace", {
      query,
      status,
      priority,
      limit,
      offset,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });

    if (!output) {
      return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[GET /api/cases/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}