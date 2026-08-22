import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
// REALITY PATH ONLY: Direct import untuk bypass capabilityRegistry
import { listCasesByWorkspace } from "../../../../../../capabilities/legal-case/implementation/commands/case.commands";

export async function GET(request: Request) {
  try {
    // Extract session from cookie
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

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // REALITY PATH ONLY: Direct command call bypass capabilityRegistry
    const { items: rawCases, total } = await listCasesByWorkspace.execute({
      sessionId: session.sessionId,
      status: status as any,
      limit,
      offset
    });

    // Format cases for client compatibility: convert Date objects to ISO strings, add evidenceCount
    const cases = rawCases.map((caseItem: any) => ({
      ...caseItem,
      createdAt: caseItem.createdAt.toISOString(),
      updatedAt: caseItem.updatedAt.toISOString(),
      evidenceCount: 0, // No documents attached yet for new cases
      verificationStatus: "pending"
    }));

    return NextResponse.json({ cases, total }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/cases/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}