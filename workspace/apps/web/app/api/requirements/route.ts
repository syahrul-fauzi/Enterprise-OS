import { NextResponse } from "next/server";
import { z } from "zod";
import type {
  CreateRequirementInput,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../../../../capabilities/requirement-management/implementation/contracts";
import { requirementService } from "../../../../../capabilities/requirement-management/implementation/services/requirement.service";
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

const CreateRequirementBodySchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  linkedCapabilityIds: z.array(z.string().min(1)).optional(),
  acceptanceCriteria: z.array(z.string().min(1)).optional(),
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
  const trace = createWorkspaceRequestTrace(request, "requirement.search");
  const productContext = readProductContextFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { searchParams } = new URL(request.url);
  const input = {
    query: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as RequirementStatus | "all" | undefined) ?? "all",
    priority:
      (searchParams.get("priority") as RequirementPriority | "all" | undefined) ?? "all",
    verificationStatus: (
      searchParams.get("verificationStatus") as RequirementVerificationStatus | "all" | undefined
    ) ?? "all",
    linkedCapabilityId: searchParams.get("linkedCapabilityId") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
    limit: searchParams.get("limit")
      ? parseInt(String(searchParams.get("limit")), 10)
      : undefined,
    offset: searchParams.get("offset")
      ? parseInt(String(searchParams.get("offset")), 10)
      : undefined,
  };
  const result = requirementService.searchRequirements(input);
  recordRuntimeInvocation({
    capabilityId: "requirement-management",
    operationId: "requirement-surface.search",
    sourceRef: "apps/web/app/api/requirements/route.ts:GET",
    success: true,
    input: {
      session,
      trace,
      productContext,
      filters: input,
    },
    result: {
      matched: result.matched,
      returned: result.items.length,
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
  const trace = createWorkspaceRequestTrace(request, "requirement.create");
  const productContext = readProductContextFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const raw = await request.json();
  const parsed = CreateRequirementBodySchema.safeParse(raw);
  if (!parsed.success) {
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.create",
      sourceRef: "apps/web/app/api/requirements/route.ts:POST",
      success: false,
      input: { session, trace, productContext, body: raw },
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
    const input: CreateRequirementInput = parsed.data;
    const result = requirementService.createRequirement(input);
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.create",
      sourceRef: "apps/web/app/api/requirements/route.ts:POST",
      success: true,
      input: { session, trace, productContext, body: input },
      result,
    });
    return NextResponse.json(result, {
      status: 201,
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-surface.create",
      sourceRef: "apps/web/app/api/requirements/route.ts:POST",
      success: false,
      input: { session, trace, productContext, body: parsed.data },
      result: { error: "command_failed", detail },
    });
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