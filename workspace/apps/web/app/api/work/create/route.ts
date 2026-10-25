import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    // 1. Extract session from cookies (adapter only: auth parsing)
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    if (!sessionValue) {
      return NextResponse.json({ error: "Unauthorized: no session found" }, { status: 401 });
    }
    const decodedSession = decodeWorkspaceSession(sessionValue);
    if (!decodedSession?.sessionId || !decodedSession.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    // 2. Parse request body (adapter only: input validation)
    const body = await request.json();
    if (!body.title || typeof body.title !== "string" || body.title.length < 1) {
      return NextResponse.json({ error: "Missing or invalid title" }, { status: 400 });
    }

    // 3. Map frontend domain to canonical domainType (only mapping, no business logic)
    const domainTypeMap: Record<string, string> = {
      "legal": "legal-case",
      "acaas": "service-request",
      "consultation": "consultation",
      "retail": "retail-inventory"
    };
    const canonicalDomainType = domainTypeMap[body.domain] || "software-development";

    // 4. INVOKE CANONICAL CAPABILITY (route is pure adapter - all business logic in work-core)
    const result = await capabilityRegistry.invoke(
      "work-core",
      "create",
      {
        title: body.title,
        description: body.description || "",
        priority: body.priority || "medium",
        linkedIntentId: body.linkedIntentId,
        domainType: canonicalDomainType,
        domainSpecificData: body.domainSpecificData,
        // Mandatory session context preserved
        sessionId: decodedSession.sessionId,
        tenantId: decodedSession.tenantId,
        workspaceId: decodedSession.workspaceId,
        actorId: decodedSession.actorId
      }
    );

    // 5. Return canonical response to client (adapter only: serialization)
    return NextResponse.json({ success: true, work: result }, { status: 201 });
  } catch (error) {
    console.error("[API/WORK/CREATE] Failed to create work:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}