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

    console.log(`[POST /api/service-requests/transition] Executing ${action} on ${workId} by ${session.actorId}`);

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
      case "accept":
      case "Accept":
      case "acceptServiceRequest":
        commandName = "service-directory.acceptServiceRequest";
        commandInput = { ...commonInput };
        break;
      case "deliver":
      case "markDelivered":
      case "complete":
      case "markCompleted":
      case "close":
      case "review":
        commandName = result === "rejected" ? "service-directory.updateExternalSystemStatus" : "service-directory.markServiceDelivered";
        commandInput = result === "rejected"
          ? {
              ...commonInput,
              externalSystem: "internal_review",
              externalStatus: "rejected",
              externalReferenceId: `REVIEW-${workId}`,
              responseData: body.reason ? { reason: body.reason } : undefined,
              receivedAt: new Date().toISOString(),
            }
          : { ...commonInput };
        break;
      case "Approve":
      case "approve":
        commandName = "service-directory.markServiceDelivered";
        commandInput = { ...commonInput };
        break;
      case "reject":
      case "Reject":
      case "requestChanges":
      case "request_changes":
        commandName = "service-directory.updateExternalSystemStatus";
        commandInput = {
          ...commonInput,
          externalSystem: "internal_review",
          externalStatus: "changes_requested",
          externalReferenceId: `CHANGES-${workId}`,
          responseData: body.reason ? { reason: body.reason } : undefined,
          receivedAt: new Date().toISOString(),
        };
        break;
      default:
        return NextResponse.json({ error: `Unsupported transition: ${action}` }, { status: 400 });
    }

    const resultObj = await capabilityRegistry.invokeAsync("service-directory", commandName, commandInput);

    return NextResponse.json({
      success: true,
      message: `ServiceRequest ${action} executed successfully`,
      data: resultObj?.output
    });

  } catch (error) {
    console.error("[POST /api/service-requests/transition] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to transition service request";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}