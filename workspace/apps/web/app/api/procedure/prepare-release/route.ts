import { NextResponse } from "next/server";
import { z } from "zod";
import { prepareReleaseProcedure } from "@procedures/prepare-release";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import {
  createDefaultWorkspaceSession,
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
  type WorkspaceSession,
} from "../../../../lib/workspace-session";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "../../../../lib/product-context";

const PrepareReleaseBodySchema = z.object({
  releaseId: z.string().min(1, "releaseId is required"),
  limit: z.number().int().positive().optional(),
});

function sessionIdentifier(session: WorkspaceSession): string {
  return `${session.actorId}@${session.tenantId}`;
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
  const effectiveSession = session ?? createDefaultWorkspaceSession();
  const trace = createWorkspaceRequestTrace(request, "procedure.prepare_release");
  const productContext = readProductContextFromRequest(request);

  const { searchParams } = new URL(request.url);
  const releaseId = searchParams.get("releaseId")?.trim();

  if (!releaseId) {
    return NextResponse.json(
      { error: "validation_error", detail: "releaseId query parameter is required." },
      { status: 400, headers: createAnonymousHeaders(trace) },
    );
  }

  const limitRaw = searchParams.get("limit");
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;

  const result = prepareReleaseProcedure({ releaseId, limit });

  recordRuntimeInvocation({
    capabilityId: "procedure-runtime",
    operationId: "procedure.prepare_release.get",
    sourceRef: "apps/web/app/api/procedure/prepare-release/route.ts:GET",
    success: result.execution.status === "passed",
    input: {
      session: sessionIdentifier(effectiveSession),
      trace,
      productContext,
      releaseId,
    },
    result: {
      readinessStatus: result.readiness.status,
      executionReason: result.execution.reason,
      blockerCount: result.blockers.length,
      aiInvoked: result.ai.invoked,
    },
  });

  return NextResponse.json(result, {
    headers: applyProductContextHeaders({
      headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
      productContext,
    }),
  });
}

export async function POST(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const effectiveSession = session ?? createDefaultWorkspaceSession();
  const trace = createWorkspaceRequestTrace(request, "procedure.prepare_release");
  const productContext = readProductContextFromRequest(request);

  const raw = await request.json();
  const parsed = PrepareReleaseBodySchema.safeParse(raw);

  if (!parsed.success) {
    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "procedure.prepare_release.post",
      sourceRef: "apps/web/app/api/procedure/prepare-release/route.ts:POST",
      success: false,
      input: { session: sessionIdentifier(effectiveSession), trace, productContext, body: raw },
      result: { error: "validation_error", issues: parsed.error.issues },
    });
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: createAnonymousHeaders(trace) },
    );
  }

  try {
    const result = prepareReleaseProcedure(parsed.data);

    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "procedure.prepare_release.post",
      sourceRef: "apps/web/app/api/procedure/prepare-release/route.ts:POST",
      success: result.execution.status === "passed",
      input: {
        session: sessionIdentifier(effectiveSession),
        trace,
        productContext,
        releaseId: parsed.data.releaseId,
      },
      result: {
        readinessStatus: result.readiness.status,
        executionReason: result.execution.reason,
        blockerCount: result.blockers.length,
        aiInvoked: result.ai.invoked,
      },
    });

    return NextResponse.json(result, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "procedure.prepare_release.post",
      sourceRef: "apps/web/app/api/procedure/prepare-release/route.ts:POST",
      success: false,
      input: {
        session: sessionIdentifier(effectiveSession),
        trace,
        productContext,
        body: parsed.data,
      },
      result: { error: "procedure_failed", detail },
    });
    return NextResponse.json(
      { error: "procedure_failed", detail },
      {
        status: 500,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
          productContext,
        }),
      },
    );
  }
}
