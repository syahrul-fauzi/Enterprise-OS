import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeWorkspaceSession, WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionValue = cookieStore.get(WORKSPACE_SESSION_COOKIE)?.value;
    if (!sessionValue) {
      return NextResponse.json({ error: "Unauthorized: no session found" }, { status: 401 });
    }

    const decodedSession = decodeWorkspaceSession(sessionValue);
    if (!decodedSession?.sessionId || !decodedSession.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 400 });
    }

    const body = await request.json();
    if (!body.documentType || typeof body.documentType !== "string" || !body.documentData || !Array.isArray(body.compliancePolicies)) {
      return NextResponse.json({ error: "Missing or invalid required fields: documentType, documentData, compliancePolicies" }, { status: 400 });
    }

    const result = await capabilityRegistry.invoke(
      "api-platform",
      "acaas.complianceCheck.create",
      {
        documentType: body.documentType,
        documentData: body.documentData,
        compliancePolicies: body.compliancePolicies,
        sessionId: decodedSession.sessionId,
        tenantId: decodedSession.tenantId,
        workspaceId: decodedSession.workspaceId,
        actorId: decodedSession.actorId
      }
    );

    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    console.error("[API/ACAAS/COMPLIANCE/CREATE] Failed to initiate compliance check:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}