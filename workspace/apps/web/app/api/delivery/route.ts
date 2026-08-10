import { NextResponse } from "next/server";
import { z } from "zod";
import { RequirementId, requirementService } from "../../../../../capabilities/requirement-management/implementation/service";
import { requirementDeliveryGatewayService } from "../../../../../capabilities/api-platform/implementation/services/requirement-delivery-gateway.service";
import { workflowEngineService } from "../../../../../capabilities/workflow-engine/implementation/service";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import {
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
} from "@repo/core-kernel";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";
import { persistDeliveryEvidenceArtifact } from "../../../lib/delivery-evidence";
import { DeliveryDecisionGatewayService } from "@capabilities/governance-evidence/implementation/services/governed-delivery-seam";

const deliveryDecisionGateway = new DeliveryDecisionGatewayService();

const DeliveryEvidenceBodySchema = z.object({
  requirementId: z.string().min(1),
  decisionId: z.string().min(1).optional(),
});

const APPROVED_DECISION_VALUES = Object.freeze(["approved", "approve", "accepted", "accept"] as const);
type ApprovedDecisionValue = (typeof APPROVED_DECISION_VALUES)[number];
const APPROVED_DECISION_SET = new Set<string>(APPROVED_DECISION_VALUES);

function isApprovedDecisionValue(value: string): value is ApprovedDecisionValue {
  return APPROVED_DECISION_SET.has(value.trim().toLowerCase());
}

const DELIVERY_APPROVAL_DECISION_TYPES = Object.freeze([
  "delivery_approval",
  "delivery-approval",
] as const);
const DELIVERY_APPROVAL_DECISION_TYPE_SET = new Set<string>(DELIVERY_APPROVAL_DECISION_TYPES);

function isDeliveryApprovalDecisionType(value: string): boolean {
  return DELIVERY_APPROVAL_DECISION_TYPE_SET.has(value.trim());
}

function createAnonymousHeaders(trace: {
  readonly requestId: string;
  readonly traceId: string;
  readonly intent: string;
}): Headers {
  const headers = new Headers();
  headers.set("x-eos-request-id", trace.requestId);
  headers.set("x-eos-trace-id", trace.traceId);
  headers.set("x-eos-intent", trace.intent);
  return headers;
}

export async function GET(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "delivery.get");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const requirementId = new URL(request.url).searchParams.get("requirementId")?.trim();
  if (!requirementId) {
    return NextResponse.json(
      { error: "validation_error", detail: "requirementId is required." },
      {
        status: 400,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  const requirement = requirementService.getRequirement({
    id: RequirementId(requirementId),
  });

  if (!requirement) {
    return NextResponse.json(
      { error: "not_found", requirementId },
      {
        status: 404,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  const delivery = requirementDeliveryGatewayService.search({
    requirementId,
    coverage: "all",
    limit: 1,
    offset: 0,
  });

  const workflow = workflowEngineService.executeWorkflow({
    workflowId: "requirement-delivery-readiness",
    requirementId,
    limit: 20,
  });

  const result = {
    requirement,
    delivery: delivery.items[0] ?? null,
    workflow,
  };

  recordRuntimeInvocation({
    capabilityId: "api-platform",
    operationId: "delivery-surface.get",
    sourceRef: "apps/web/app/api/delivery/route.ts:GET",
    success: true,
    input: { session, trace, productContext, requirementId },
    result: {
      requirementId,
      status: requirement.status,
      workflowStatus: workflow.status,
      evidenceCount: result.delivery?.evidence.matchedCount ?? 0,
    },
  });

  return NextResponse.json(result, {
    headers: applyProductContextHeaders({
      headers: createWorkspaceContextHeaders({ session, trace }),
      productContext,
    }),
  });
}

export async function POST(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "delivery.post");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const raw = await request.json();
  const parsed = DeliveryEvidenceBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      {
        status: 400,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  // =========================================================================
  // B7.7 ENFORCEMENT: VALIDATE D BEFORE ANY BUSINESS WORK.
  // KILL CONDITION #2: workflow MUST NOT run before D is verified.
  // =========================================================================
  const decisionId = parsed.data.decisionId;
  let approvedDecision:
    | { readonly decision_id: string; readonly requirement_id: string }
    | null = null;

  if (!decisionId) {
    return NextResponse.json(
      {
        error: "missing_governance_decision",
        detail:
          "Attach delivery evidence requires a delivery-approval governance decision. Provide `decisionId` in the request body.",
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  const decisionRecord = deliveryDecisionGateway.getDecisionsForRequirement(
    parsed.data.requirementId,
  ).find((entry) => entry.decision_id === decisionId);

  if (!decisionRecord) {
    return NextResponse.json(
      {
        error: "governance_decision_not_found",
        detail: `No governance decision found with ID ${decisionId} for requirement ${parsed.data.requirementId}`,
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  // =========================================================================
  // B7.7 ENFORCEMENT: VALIDATE decision_type
  // Kill condition #3: Must NOT reinterpret delivery-approval
  // =========================================================================
  if (!isDeliveryApprovalDecisionType(decisionRecord.decision_type)) {
    return NextResponse.json(
      {
        error: "invalid_governance_decision_type",
        detail: `Decision ${decisionId} has type "${decisionRecord.decision_type}", which is not a valid delivery approval type. Only "delivery_approval" is accepted.`,
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  // =========================================================================
  // B7.7 ENFORCEMENT: VALIDATE decision == approved
  // =========================================================================
  if (!isApprovedDecisionValue(decisionRecord.decision)) {
    return NextResponse.json(
      {
        error: "governance_decision_not_approved",
        detail: `Decision ${decisionId} has decision "${decisionRecord.decision}", which is not an approved value. Only approved decisions may trigger delivery.`,
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  // =========================================================================
  // B7.7 ENFORCEMENT: VERIFY subject matching
  // D.requirement_id MUST === request.requirementId
  // =========================================================================
  if (decisionRecord.requirement_id !== parsed.data.requirementId) {
    return NextResponse.json(
      {
        error: "governance_subject_mismatch",
        detail: `Decision ${decisionId} applies to requirement ${decisionRecord.requirement_id}, but request is for requirement ${parsed.data.requirementId}. Subject mismatch.`,
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  // =========================================================================
  // B7.10 ENFORCEMENT: VERIFY product context matching
  // D.product_id MUST === current productContext.productId
  // Protect cross-product decision reuse - Seam Invariant enforcement
  // =========================================================================
  if ((decisionRecord as any).product_id && (decisionRecord as any).product_id !== productContext.productId) {
    return NextResponse.json(
      {
        error: "governance_product_mismatch",
        detail: `Decision ${decisionId} belongs to product ${(decisionRecord as any).product_id}, but current request is for product ${productContext.productId}. Product context mismatch.`,
      },
      {
        status: 403,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  approvedDecision = {
    decision_id: decisionRecord.decision_id,
    requirement_id: decisionRecord.requirement_id,
  };

  // =========================================================================
  // B7.7 STEP 6: REVOCATION SEMANTICS.
  // EXPLICITLY SKIPPED per Commander order:
  //   "ONLY if existing ledger semantics actually prove revocation"
  // Falsification result (B7.7.1):
  //   - NO existing decision_type for delivery_revoke / delivery_reject in repo.
  //   - delivery_review (found in tests) is review only, NOT revocation.
  // Therefore: DO NOT INVENT REVOCATION. STRICTLY COMPLY WITH STOP RULE.
  // =========================================================================

  // =========================================================================
  // B7.7 STEP 7: EXISTING BUSINESS WORK (UNCHANGED from original route).
  // =========================================================================

  if (!productContext.productId) {
    return NextResponse.json(
      { error: "product_context_missing", detail: "Product context is required for delivery evidence." },
      {
        status: 400,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  const requirement = requirementService.getRequirement({
    id: RequirementId(parsed.data.requirementId),
  });

  if (!requirement) {
    return NextResponse.json(
      { error: "not_found", requirementId: parsed.data.requirementId },
      {
        status: 404,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }

  const delivery = requirementDeliveryGatewayService.search({
    requirementId: parsed.data.requirementId,
    coverage: "all",
    limit: 1,
    offset: 0,
  });

  const workflow = workflowEngineService.executeWorkflow({
    workflowId: "requirement-delivery-readiness",
    requirementId: parsed.data.requirementId,
    limit: 20,
    decision_id: approvedDecision.decision_id,
    productId: productContext.productId ?? undefined,
  });

  const artifact = persistDeliveryEvidenceArtifact({
    productId: productContext.productId,
    productContext,
    session,
    requirement,
    workflow,
    delivery: delivery.items[0] ?? null,
  });

  recordRuntimeInvocation({
    capabilityId: "api-platform",
    operationId: "delivery-surface.attach-evidence",
    sourceRef: "apps/web/app/api/delivery/route.ts:POST",
    success: true,
    productId: productContext.productId ?? "unknown",
    input: { session, trace, productContext, requirementId: parsed.data.requirementId },
    result: artifact,
    decision_id: approvedDecision.decision_id,
  });

  return NextResponse.json(
    {
      requirementId: parsed.data.requirementId,
      decisionId: approvedDecision.decision_id,
      artifactPath: artifact.relativePath,
      requirementRef: artifact.requirementRef,
      runId: artifact.runId,
      digest: artifact.digest,
    },
    {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    },
  );
}