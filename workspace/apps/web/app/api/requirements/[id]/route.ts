import { NextResponse } from "next/server";
import { z } from "zod";
import { RequirementId } from "../../../../../../capabilities/requirement-management/implementation/service";
import { requirementService } from "../../../../../../capabilities/requirement-management/implementation/services/requirement.service";
import { workflowEngineService } from "../../../../../../capabilities/workflow-engine/implementation/service";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import {
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
} from "../../../../lib/workspace-session";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "../../../../lib/product-context";

type Params = Promise<{ id: string }>;

const RequirementPatchBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("start_delivery") }),
  z.object({ action: z.literal("mark_implemented") }),
  z.object({ action: z.literal("verify") }),
  z.object({
    action: z.literal("update"),
    title: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    source: z.string().optional(),
    linkedCapabilityIds: z.array(z.string().min(1)).optional(),
    acceptanceCriteria: z.array(z.string().min(1)).optional(),
  }),
]);

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

export async function GET(_request: Request, segment: { params: Params }) {
  const session = readWorkspaceSessionFromRequest(_request);
  const trace = createWorkspaceRequestTrace(_request, "requirement.get");
  const productContext = readProductContextFromRequest(_request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { id } = await segment.params;
  const result = requirementService.getRequirement({ id: RequirementId(id) });
  if (result === undefined) {
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.get",
      sourceRef: "apps/web/app/api/requirements/[id]/route.ts:GET",
      success: false,
      input: { session, trace, productContext, id },
      result: { error: "not_found", id },
    });
    return NextResponse.json(
      { error: "not_found", id },
      {
        status: 404,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }
  recordRuntimeInvocation({
    capabilityId: "requirement-management",
    operationId: "requirement-surface.get",
    sourceRef: "apps/web/app/api/requirements/[id]/route.ts:GET",
    success: true,
    input: { session, trace, productContext, id },
    result: { id: result.id, status: result.status },
  });
  return NextResponse.json(result, {
    headers: applyProductContextHeaders({
      headers: createWorkspaceContextHeaders({ session, trace }),
      productContext,
    }),
  });
}

export async function PATCH(request: Request, segment: { params: Params }) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "requirement.patch");
  const productContext = readProductContextFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { id } = await segment.params;
  const requirementId = RequirementId(id);
  const raw = await request.json();
  const parsed = RequirementPatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.patch",
      sourceRef: "apps/web/app/api/requirements/[id]/route.ts:PATCH",
      success: false,
      input: { session, trace, productContext, id, body: raw },
      result: { error: "validation_error", issues: parsed.error.issues },
    });
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

  try {
    const body = parsed.data;
    if (body.action === "verify") {
      const readiness = workflowEngineService.executeWorkflow({
        workflowId: "requirement-delivery-readiness",
        requirementId: id,
        limit: 20,
      });

      if (!readiness.output.readyForWorkflow) {
        return NextResponse.json(
          {
            error: "invalid_state",
            id,
            detail:
              "Verification requires evidence-backed delivery readiness. Attach a delivery evidence artifact first.",
            workflow: readiness,
          },
          {
            status: 409,
            headers: applyProductContextHeaders({
              headers: createWorkspaceContextHeaders({ session, trace }),
              productContext,
            }),
          },
        );
      }
    }

    const result =
      body.action === "approve"
        ? requirementService.approveRequirement({ id: requirementId })
        : body.action === "start_delivery"
          ? requirementService.startRequirementDelivery({ id: requirementId })
          : body.action === "mark_implemented"
            ? requirementService.markRequirementImplemented({ id: requirementId })
            : body.action === "verify"
              ? requirementService.verifyRequirement({ id: requirementId })
              : requirementService.updateRequirement({
                  id: requirementId,
                  title: body.title,
                  summary: body.summary,
                  description: body.description,
                  priority: body.priority,
                  owner: body.owner,
                  source: body.source,
                  linkedCapabilityIds: body.linkedCapabilityIds,
                  acceptanceCriteria: body.acceptanceCriteria,
                });

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.patch",
      sourceRef: "apps/web/app/api/requirements/[id]/route.ts:PATCH",
      success: true,
      input: { session, trace, productContext, id, body },
      result,
    });
    return NextResponse.json(result, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.patch",
      sourceRef: "apps/web/app/api/requirements/[id]/route.ts:PATCH",
      success: false,
      input: { session, trace, productContext, id, body: parsed.data },
      result: { error: "command_failed", detail },
    });

    if (detail.includes("not found")) {
      return NextResponse.json(
        { error: "not_found", id },
        {
          status: 404,
          headers: applyProductContextHeaders({
            headers: createWorkspaceContextHeaders({ session, trace }),
            productContext,
          }),
        },
      );
    }

    if (detail.includes("must")) {
      return NextResponse.json(
        { error: "invalid_state", id, detail },
        {
          status: 409,
          headers: applyProductContextHeaders({
            headers: createWorkspaceContextHeaders({ session, trace }),
            productContext,
          }),
        },
      );
    }

    return NextResponse.json(
      { error: "command_failed", detail },
      {
        status: 500,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }
}
