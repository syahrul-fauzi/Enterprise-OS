import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts";

// Schema untuk parameter GET - mengikuti pola kanonik yang sama
const GetComplianceCheckSchema = z.object({
  id: z.string().uuid("Invalid compliance check ID format")
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Generate execution ID using Web Crypto API (Edge Runtime compatible)
    const executionId = crypto.randomUUID();
    
    // 1. Validasi session terlebih dahulu (reuse dari semua endpoint EOS)
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie?.value) {
      return NextResponse.json({ error: "Unauthorized: Missing session" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionCookie.value);
    if (!session?.tenantId || !session?.workspaceId || !session?.actorId) {
      return NextResponse.json({ error: "Unauthorized: Invalid session" }, { status: 401 });
    }

    // Validate boundary access (pure adapter pattern requirement)
    const boundaryValid = validateBoundaryAccess("api-gateway", "acaas");
    if (!boundaryValid) {
      return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
    }

    // 2. Validasi parameter ID
    const validated = GetComplianceCheckSchema.safeParse({ id: params.id });
    if (!validated.success) {
      return NextResponse.json({ 
        error: "Invalid request parameters", 
        details: validated.error.issues 
      }, { status: 400 });
    }

    // 3. Invoke capability ACaaS yang sudah terdaftar di api-platform (gunakan invokeAsync untuk konsistensi pola pure adapter)
    const result = await capabilityRegistry.invokeAsync(
      {
        capability: "api-platform",
        command: "acaas.complianceCheck.getResult",
        context: { 
          tenantId: session.tenantId, 
          workspaceId: session.workspaceId, 
          actorId: session.actorId 
        },
        payload: { complianceCheckId: validated.data.id }
      }
    );

    // 4. Cek apakah capability invocation berhasil
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 });
    }

    // 5. Record runtime invocation for usage metering (ACaaS-COMMERCIAL-001: Pay-per-Verified-Check)
    const complianceCheckId = validated.data.id;
    
    recordRuntimeInvocation({
      capabilityId: "acaas",
      operationId: "acaas.complianceCheck.getResult",
      sourceRef: `acaas/${session.tenantId}/${session.workspaceId}`,
      success: true,
      input: { id: validated.data.id },
      result: result.data,
      work_id: complianceCheckId,
      executionId: executionId
    });

    // 6. Return response dengan format yang konsisten dengan semua endpoint EOS
    return NextResponse.json({
      success: true,
      data: result.data,
      graphMetadata: {
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("[ACAAS GetResult] Error:", error);
    const failureExecutionId = crypto.randomUUID();
    
    // Record failed invocation
    recordRuntimeInvocation({
      capabilityId: "acaas",
      operationId: "acaas.complianceCheck.getResult",
      sourceRef: "acaas/unknown",
      success: false,
      input: { id: params.id },
      result: { error: error instanceof Error ? error.message : "Unknown error" },
      work_id: null,
      executionId: failureExecutionId
    });
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}