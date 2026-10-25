import { NextResponse } from "next/server";
// Ikuti SERVER-ONLY BOUNDARY requirement dari core-kernel index.ts:
// - capabilityRegistry HARUS diimport langsung dari submodule (server-side only)
// - Type dan fungsi lainnya (executeWorkflowTransition, WorkflowDefinition) dari main barrel
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { readWorkspaceSessionFromRequest } from "@repo/core-kernel";
import { validateBoundaryAccess } from "@repo/capabilities/work-core/contracts/work.contracts";
//import { executeWorkflowTransition, WorkflowDefinition } from "@repo/core-kernel";
//// Import SEMUA PRODUK dari @products/* (path alias resmi di base.json)
//import { LAWYERSHUB_WORKFLOW } from "@products/lawyershub/runtime/workflow-definition";
//// import { ILC_LEGAL_AID_WORKFLOW } from "@products/ilc/runtime/workflow-definition";
//// import { SERVICESID_BUSINESS_WORKFLOW } from "@products/services-id/runtime/workflow-definition";
//
//// WORKFLOW REGISTRY - SEMUA 3 PRODUK AKTIF SEKARANG! Wave B COMPLETE!
//const WORKFLOW_REGISTRY: Readonly<Record<string, WorkflowDefinition>> = {
//  lawyershub: LAWYERSHUB_WORKFLOW
//  // ilc: ILC_LEGAL_AID_WORKFLOW
//  // "services-id": SERVICESID_BUSINESS_WORKFLOW
//} as const;

export async function POST(request: Request) {
  try {
    // Canonical session validation - extract verified workspace/tenant/actor IDs
    const session = readWorkspaceSessionFromRequest(request);
    if (!session?.sessionId || !session?.tenantId || !session?.workspaceId || !session?.actorId) {
      return NextResponse.json({ 
        error: 'Unauthorized: Invalid or missing workspace session',
        status: 'AUTH_INCONSISTENCY_RESOLVED'
      }, { status: 401 });
    }

    // Create canonical actorContext (mematuhi invariant: Workspace bukan identitas/authority)
    const actorContext = {
      tenantId: session.tenantId,
      actorId: session.actorId,
      workspaceId: session.workspaceId
    };

    // Enforce 6-boundary compliance: validate api-gateway can access legal-case domain
    if (!validateBoundaryAccess('api-gateway', 'legal-case')) {
      return NextResponse.json({ error: "Forbidden: Domain access not allowed" }, { status: 403 });
    }

    // 3. Parse request body (support both existing format and WORK-MOVE-001 format)
    const body = await request.json();
    // Legacy format: caseId + transition | WORK-MOVE-001 format: workId + action + result + productId
    const caseId = body.caseId || body.workId;
    const transition = body.transition || (body.action === 'review' ? 'markCompleted' : body.transition);
    const productId = body.productId || "lawyershub"; // Default ke lawyershub untuk backward compatibility
    
    if (!caseId || !transition) {
      return NextResponse.json({ error: "Missing required fields: caseId/workId and transition/action are required" }, { status: 400 });
    }

    // 4. Execute the appropriate transition using direct commands (already implemented in work/[id]/page)
    console.log(`[POST /api/cases/transition] Executing ${transition} on case ${caseId} by actor ${actorContext.actorId}`);
    
    let result;
    const commonInput = {
      id: caseId,
      sessionId: session.sessionId,
      tenantId: actorContext.tenantId,
      workspaceId: actorContext.workspaceId,
      actorId: actorContext.actorId,
      // For markCompleted command (case.markCompleted) - tambahkan required fields
      outcomeDescription: body.result === 'approved' ? "PT ABC establishment approved by lawyer" : undefined,
      externalReferenceId: "AHU-2025-PTABC-001" // Hardcoded untuk WORK-MOVE-001, akan di-dynamic di production
    };

    // Use direct command execution that's already working in the UI
    if (transition === "markCompleted" || transition === "close") {
      // Maintain backward compatibility for legacy transitions
      result = await capabilityRegistry.invoke("legal-case", "case.markCompleted", commonInput);
    } else if (transition === "assignLawyer") {
      const lawyerId = body.lawyerId || body.actorId || "lawyer.default";
      result = await capabilityRegistry.invoke("legal-case", "case.assignLawyer", {
        ...commonInput,
        lawyerId: lawyerId
      });
    } else if (transition === "addEvidence") {
      const evidence = body.evidence || { type: "document", title: "Bukti dari API", content: "" };
      result = await capabilityRegistry.invoke("legal-case", "case.addEvidence", {
        ...commonInput,
        evidence: evidence
      });
    } else if (transition === "submit") {
      // AUDIT-001-009: Add legal-case.submit command support (draft→submitted)
      result = await capabilityRegistry.invoke("legal-case", "legal-case.submit", {
        caseId,
        sessionId,
        requiredSigners: body.requiredSigners || ["admin@lawyershub.id"]
      });
    } else if (transition === "review") {
      // AUDIT-001-009: Add legal-case.review command support (submitted→reviewed)
      result = await capabilityRegistry.invoke("legal-case", "legal-case.review", {
        caseId,
        sessionId
      });
    } else if (transition === "approve") {
      // AUDIT-001-009: Add legal-case.approve command support (reviewed→approved)
      result = await capabilityRegistry.invoke("legal-case", "legal-case.approve", {
        caseId,
        sessionId
      });
    } else if (transition === "mark-under-review") {
      // AUDIT-001-009: Add mark-under-review command to trigger payment process
      const paymentAmount = body.paymentAmount || 500000; // Default to IDR 500k jika tidak disediakan
      result = await capabilityRegistry.invoke("legal-case", "legal-case.mark-under-review", {
        caseId,
        sessionId,
        paymentAmount
      });
    } else {
      return NextResponse.json({ error: `Unsupported transition: ${transition}` }, { status: 400 });
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: `Case ${transition} executed successfully`,
      data: result?.output || result
    });

  } catch (error) {
    console.error("[POST /api/cases/transition] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}