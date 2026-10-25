import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  readWorkspaceSessionFromRequest
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { z } from "zod";
import {
  getSessionRepositoryPostgres,
  initIdentitySchema,
} from "@repo/capabilities/identity";
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts.js";

// ACaaS-COMMERCIAL-001: Create Compliance Check endpoint
// Mengikuti EXACT canonical pattern yang sama dengan compliance-cases dan domain lain
// TAHAP C: Vertical Slice Proof - ACaaS compliance-check end-to-end
const CreateComplianceCheckSchema = z.object({
  documentType: z.string(),
  documentData: z.record(z.string(), z.any()),
  compliancePolicies: z.array(z.string()),
  externalId: z.string().optional(), // Untuk idempotency
});

export async function POST(request: Request) {
  try {
    // Generate execution ID using Web Crypto API (Edge Runtime compatible)
    const executionId = crypto.randomUUID();
    
    // 1. Canonical session validation - extract verified workspace/tenant/actor IDs
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session?.sessionId || !session?.tenantId || !session?.workspaceId || !session?.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Create canonical actorContext (mematuhi invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session.tenantId,
      actorId: session.actorId,
      workspaceId: session.workspaceId,
      sessionId: session.sessionId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access acaas domain
    if (!validateBoundaryAccess('api-gateway', 'acaas')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
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

    // 2. Parse dan validasi body
    const body = await request.json();
    const validated = CreateComplianceCheckSchema.parse(body);

    // 3. Invoke ACaaS capability di api-platform (menggunakan actorContext untuk konsistensi)
    const { output } = await capabilityRegistry.invokeAsync(
      "acaas",
      "createComplianceCheck",
      {
        ...actorContext,
        documentType: validated.documentType,
        documentData: validated.documentData,
        compliancePolicies: validated.compliancePolicies,
        externalId: validated.externalId
      }
    );

    if (!output) {
      return NextResponse.json({ error: "Failed to create compliance check" }, { status: 500 });
    }

    // 4. Record runtime invocation for usage metering (ACaaS-COMMERCIAL-001: Pay-per-Verified-Check)
    const complianceCheckId = output?.complianceCheckId || null;
    
    recordRuntimeInvocation({
      capabilityId: "acaas",
      operationId: "acaas.complianceCheck.create",
      sourceRef: `acaas/${actorContext.tenantId}/${actorContext.workspaceId}`,
      success: true,
      input: validated,
      result: output,
      work_id: complianceCheckId,
      executionId: executionId,
      actorContext: actorContext
    });

    // 5. Return hasil sesuai canonical projection pattern (tambahkan actorContext untuk audit)
    return NextResponse.json({
      success: true,
      data: output,
      complianceCheckId: complianceCheckId,
      graphMetadata: output?.graphMetadata || null,
      context: actorContext
    }, { status: 201 });
  } catch (error) {
    console.error("[API/acaas/compliance-check/create] Error:", error);
    const failureExecutionId = crypto.randomUUID();
    
    // Record failed invocation
    recordRuntimeInvocation({
      capabilityId: "acaas",
      operationId: "acaas.complianceCheck.create",
      sourceRef: "acaas/unknown",
      success: false,
      input: {},
      result: { error: error instanceof Error ? error.message : "Failed to create compliance check" },
      work_id: null,
      executionId: failureExecutionId,
      actorContext: null
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Failed to create compliance check",
      code: "ACAAS_COMPLIANCE_CHECK_CREATE_FAILED"
    }, { status: 500 });
  }
}