import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
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
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Extract query parameters for filtering/pagination
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const status = searchParams.get("status") || undefined;
    const category = searchParams.get("category") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // Single canonical capability invocation - all service request listing logic in service-directory capability
    // SHARED RAIL: sessionId ONLY - tenant/workspace/actor derived from trusted session (MIRRORS LH pattern)
    const { output } = await capabilityRegistry.invokeAsync("service-directory", "listByWorkspace", {
      query,
      status,
      category,
      limit,
      offset,
      sessionId: session.sessionId,
    });

    if (!output) {
      return NextResponse.json({ error: "Failed to fetch service requests" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    console.error("[GET /api/service-requests/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch service requests";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}