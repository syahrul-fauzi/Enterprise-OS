import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { readWorkspaceSessionFromRequest } from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";

// P0: MAKE EOS VISIBLE - API to list all cases for current session's workspace
// Pure adapter pattern: route only invokes canonical capability, no direct repository access
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!) : 0;

    // Use canonical session reader (P1 Reorganize: fix AUTH_INCONSISTENCY)
    const session = readWorkspaceSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing workspace session" }, { status: 401 });
    }

    // Validate session has required context (both authenticated and anonymous sessions work)
    if (!session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session: missing required context" }, { status: 401 });
    }

    // Create canonical actorContext for audit tracing and identity/workspace separation
    const actorContext = {
      tenantId: session.tenantId,
      actorId: session.actorId,
      workspaceId: session.workspaceId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access legal-case domain
    if (!validateBoundaryAccess('api-gateway', 'legal-case')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
    }

    // Invoke canonical query capability to list cases (pure adapter pattern, menggunakan invoke seperti route lain)
    const listResult = await capabilityRegistry.invoke("legal-case", "listCasesByWorkspace", {
      tenantId: actorContext.tenantId,
      workspaceId: actorContext.workspaceId,
      actorId: actorContext.actorId,
      sessionId: session.sessionId,
      limit,
      offset
    }) as {
      success: boolean;
      cases?: Array<{
        caseId: string;
        workId: string;
        title: string;
        description: string;
        status: string;
        createdAt: string;
        tenantId: string;
        workspaceId: string;
        actorId: string;
      }>;
      total?: number;
      error?: string;
    };

    if (!listResult.success || !listResult.cases) {
      console.error("[CASES LIST FAIL] Case listing failed:", listResult.error);
      return NextResponse.json({ error: listResult.error || "Failed to list cases" }, { status: 400 });
    }

    console.log(`[CASES LIST SUCCESS] ${listResult.cases.length} cases retrieved via canonical capability for workspace ${actorContext.workspaceId} by actor ${actorContext.actorId}`);
    return NextResponse.json({
      cases: listResult.cases,
      total: listResult.total || listResult.cases.length,
      limit,
      offset
    }, { status: 200 });

  } catch (error) {
    console.error("[GET /api/cases/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to list cases";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}