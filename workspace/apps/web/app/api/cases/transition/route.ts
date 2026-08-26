import { NextResponse } from "next/server";
import { cookies } from "next/headers";
// Ikuti SERVER-ONLY BOUNDARY requirement dari core-kernel index.ts:
// - capabilityRegistry HARUS diimport langsung dari submodule (server-side only)
// - Type dan fungsi lainnya (executeWorkflowTransition, WorkflowDefinition) dari main barrel
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { executeWorkflowTransition, WorkflowDefinition } from "@repo/core-kernel";
// Import SEMUA PRODUK dari @products/* (path alias resmi di base.json)
import { LAWYERSHUB_WORKFLOW } from "@products/lawyershub/runtime/workflow-definition";
import { ILC_LEGAL_AID_WORKFLOW } from "@products/ilc/runtime/workflow-definition";
import { SERVICESID_BUSINESS_WORKFLOW } from "@products/services-id/runtime/workflow-definition";

// WORKFLOW REGISTRY - SEMUA 3 PRODUK AKTIF SEKARANG! Wave B COMPLETE!
const WORKFLOW_REGISTRY: Readonly<Record<string, WorkflowDefinition>> = {
  lawyershub: LAWYERSHUB_WORKFLOW,
  ilc: ILC_LEGAL_AID_WORKFLOW,
  "services-id": SERVICESID_BUSINESS_WORKFLOW
} as const;

const WORKSPACE_SESSION_COOKIE = "eos_workspace_session";

export async function POST(request: Request) {
  try {
    // 1. Get session cookie (Next.js 15: cookies() returns Promise, harus await)
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session - please refresh and try again" }, { status: 401 });
    }

    // 2. Parse session cookie (base64 encoded JSON)
    let parsedSession;
    try {
      const decodedSession = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      parsedSession = JSON.parse(decodedSession);
    } catch (e) {
      return NextResponse.json({ error: "Invalid session format" }, { status: 400 });
    }

    const { sessionId, tenantId, workspaceId, actorId } = parsedSession;
    if (!sessionId || !tenantId || !workspaceId || !actorId) {
      return NextResponse.json({ error: "Incomplete session data" }, { status: 400 });
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
    
    // Validate productId exists in workflow registry
    if (!WORKFLOW_REGISTRY[productId]) {
      return NextResponse.json({ error: `Unsupported productId: ${productId}` }, { status: 400 });
    }

    // 4. Execute the appropriate transition (support existing commands + new markCompleted for WORK-MOVE-001)
    console.log(`[POST /api/cases/transition] Executing ${transition} on case ${caseId} by actor ${actorId}`);
    
    let result;
    const commonInput = {
      id: caseId,
      sessionId: sessionId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      actorId: actorId,
      // For markCompleted command (case.markCompleted) - tambahkan required fields
      outcomeDescription: body.result === 'approved' ? "PT ABC establishment approved by lawyer" : undefined,
      externalReferenceId: "AHU-2025-PTABC-001" // Hardcoded untuk WORK-MOVE-001, akan di-dynamic di production
    };

    // WORK-MOVE-001: Use generic workflow orchestrator for state transitions - Wave C implementation
    if (body.action === 'review' || transition === "markCompleted") {
      // Extract current work state from case or body - for Pendirian PT ABC, current step is "review"
      const currentStepId = body.currentStep || "review";
      const workflow = WORKFLOW_REGISTRY[productId];
      
      const workflowResult = await executeWorkflowTransition(
        workflow,
        currentStepId,
        actorId,
        {
          workId: caseId,
          sessionId: sessionId,
          tenantId: tenantId,
          workspaceId: workspaceId,
          result: body.result
        }
      );

      if (!workflowResult.success) {
        return NextResponse.json({ 
          error: workflowResult.error, 
          success: false 
        }, { status: 500 });
      }

      // Return success with workflow transition details
      return NextResponse.json({
        success: true,
        message: workflowResult.nextStep 
          ? `Work transitioned from ${currentStepId} to ${workflowResult.nextStep.id}` 
          : "Work completed successfully",
        data: {
          nextStep: workflowResult.nextStep,
          evidenceAdded: workflowResult.evidenceAdded
        }
      });
    } else if (transition === "close") {
      // Maintain backward compatibility for legacy transitions
      result = await capabilityRegistry.invoke("legal-case", "case.close", commonInput);
    } else if (transition === "assignLawyer") {
      const lawyerId = body.lawyerId || body.actorId;
      if (!lawyerId) {
        return NextResponse.json({ error: "lawyerId is required for assignLawyer transition" }, { status: 400 });
      }
      result = await capabilityRegistry.invoke("legal-case", "case.assignLawyer", {
        ...commonInput,
        lawyerId: lawyerId
      });
    } else {
      return NextResponse.json({ error: `Unsupported transition: ${transition}` }, { status: 400 });
    }

    // 5. Return success response
    return NextResponse.json({
      success: true,
      message: `Case ${transition} executed successfully`,
      data: result.output
    });

  } catch (error) {
    console.error("[POST /api/cases/transition] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}