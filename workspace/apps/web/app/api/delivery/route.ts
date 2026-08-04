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
} from "../../../lib/workspace-session";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "../../../lib/product-context";
import { persistDeliveryEvidenceArtifact } from "../../../lib/delivery-evidence";

const DeliveryEvidenceBodySchema = z.object({
  requirementId: z.string().min(1),
});

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
    input: { session, trace, productContext, requirementId: parsed.data.requirementId },
    result: artifact,
  });

  return NextResponse.json(
    {
      requirementId: parsed.data.requirementId,
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
