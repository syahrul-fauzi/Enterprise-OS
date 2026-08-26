import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession
} from "@repo/core-kernel";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities-identity";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    const body = await request.json();
    const workId = body.workId || body.id;
    const action = body.action || body.transition;
    const result = body.result;

    if (!workId || !action) {
      return NextResponse.json({ error: "Missing required fields: workId/id and action/transition are required" }, { status: 400 });
    }

    console.log(`[POST /api/requirements/transition] Executing ${action} on ${workId} by ${session.actorId}`);

    const commonInput = {
      id: workId,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    let commandName: string;
    let commandInput: Record<string, unknown>;

    switch (action) {
      case "approve":
      case "Approve":
        commandName = "requirement.approve";
        commandInput = { ...commonInput };
        break;
      case "requestReview":
      case "request_review":
      case "request-review":
        commandName = "requirement.requestReview";
        commandInput = { ...commonInput };
        break;
      case "startDelivery":
      case "start_delivery":
      case "start":
        commandName = "requirement.startDelivery";
        commandInput = { ...commonInput };
        break;
      case "markImplemented":
      case "mark_implemented":
      case "implement":
      case "complete":
        commandName = "requirement.markImplemented";
        commandInput = { ...commonInput };
        break;
      case "verify":
      case "verifyComplete":
      case "review":
        commandName = result === "approved" ? "requirement.approve" : "requirement.completeReview";
        commandInput = {
          ...commonInput,
          rejectionReason: result === "rejected" ? body.reason : undefined,
        };
        break;
      case "completeReview":
      case "complete_review":
        commandName = result === "rejected" ? "requirement.rejectReview" : "requirement.completeReview";
        commandInput = {
          ...commonInput,
          rejectionReason: result === "rejected" ? body.reason : undefined,
        };
        break;
      case "reject":
      case "rejectReview":
        commandName = "requirement.rejectReview";
        commandInput = { ...commonInput, rejectionReason: body.reason };
        break;
      case "close":
      case "markCompleted":
        commandName = "requirement.markImplemented";
        commandInput = { ...commonInput };
        break;
      default:
        return NextResponse.json({ error: `Unsupported transition: ${action}` }, { status: 400 });
    }

    const resultObj = await capabilityRegistry.invokeAsync("requirement-management", commandName, commandInput);

    return NextResponse.json({
      success: true,
      message: `Requirement ${action} executed successfully`,
      data: resultObj?.output
    });

  } catch (error) {
    console.error("[POST /api/requirements/transition] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to transition requirement";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}