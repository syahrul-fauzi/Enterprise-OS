import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
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

// GET: Retrieve all evidence for a specific requirement item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    let sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    // Handle anonymous session same as requirements transition route
    if (!sessionCookie) {
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = { name: WORKSPACE_SESSION_COOKIE, value: encodedSession };
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Validate active session
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    const { id: requirementId } = params;

    // Use capability registry to get requirement data (reuse existing command)
    const requirementResult = await capabilityRegistry.invoke(
      "requirement-management",
      "requirement.getById",
      {
        id: requirementId,
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    if (!requirementResult || !requirementResult.success) {
      return NextResponse.json({ error: "Requirement item not found" }, { status: 404 });
    }

    const requirement = requirementResult.data;

    // Verify tenant/workspace ownership to maintain isolation
    if (requirement.tenantId !== session.tenantId || requirement.workspaceId !== session.workspaceId) {
      return NextResponse.json({ error: "Unauthorized to access this requirement's evidence" }, { status: 403 });
    }

    // Use evidence-registry capability to retrieve linked evidence
    const evidenceResult = await capabilityRegistry.invoke(
      "evidence-registry",
      "evidence.getByEntityId",
      {
        entityId: requirementId,
        entityType: "requirement",
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    const evidence = evidenceResult?.success ? evidenceResult.data : [];

    // Return evidence following the same schema as work/[id]/evidence route
    return NextResponse.json({
      success: true,
      requirementId: requirementId,
      evidence: evidence,
      evidenceCount: evidence.length,
      evidenceChain: {
        actorId: session.actorId,
        accessedAt: new Date().toISOString(),
        source: "eos-face",
        canInspect: true,
        canReconstruct: true
      }
    }, { status: 200 });
  } catch (error) {
    console.error("[API/REQUIREMENTS/[ID]/EVIDENCE] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add new evidence to an existing requirement (reuse evidence-registry capability)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    // Validate active session
    const isAnonymous = session.actorId === "anonymous.user";
    if (!isAnonymous) {
      await initIdentitySchema();
      const sessionRepository = getSessionRepositoryPostgres();
      const dbSession = await sessionRepository.byId(session.sessionId as any);
      if (!dbSession || dbSession.revokedAt !== null) {
        return NextResponse.json({ error: "Session revoked - please re-login" }, { status: 401 });
      }
    }

    const { id: requirementId } = params;

    // Verify requirement exists and user has access
    const requirementResult = await capabilityRegistry.invoke(
      "requirement-management",
      "requirement.getById",
      {
        id: requirementId,
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    if (!requirementResult || !requirementResult.success) {
      return NextResponse.json({ error: "Requirement item not found" }, { status: 404 });
    }

    const requirement = requirementResult.data;
    if (requirement.tenantId !== session.tenantId || requirement.workspaceId !== session.workspaceId) {
      return NextResponse.json({ error: "Unauthorized to modify this requirement's evidence" }, { status: 403 });
    }

    const body = await request.json();
    const { type, title, content, metadata } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required for evidence" }, { status: 400 });
    }

    // Use evidence-registry's record command to persist evidence (reuse existing capability)
    const evidenceResult = await capabilityRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityId: requirementId,
        entityType: "requirement",
        type,
        title,
        content,
        metadata: {
          ...metadata,
          requirementTitle: requirement.title,
          requirementStatus: requirement.status
        },
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    if (!evidenceResult || !evidenceResult.success) {
      return NextResponse.json({ error: "Failed to record evidence" }, { status: 500 });
    }

    // Record execution evidence for audit trail
    await capabilityRegistry.invoke(
      "evidence-registry",
      "evidence.record",
      {
        entityId: requirementId,
        entityType: "requirement",
        type: "execution",
        title: "Evidence added to requirement",
        content: `Actor ${session.actorId} added evidence "${title}" to requirement ${requirementId}`,
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }
    );

    return NextResponse.json({
      success: true,
      requirementId: requirementId,
      evidenceId: evidenceResult.data?.id,
      message: "Evidence recorded successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("[API/REQUIREMENTS/[ID]/EVIDENCE] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}