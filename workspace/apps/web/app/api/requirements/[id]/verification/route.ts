import { NextResponse } from "next/server";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import {
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
} from "../../../../../lib/workspace-session";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "../../../../../lib/product-context";
import { computeVerificationDecision } from "../../../../../lib/verification-decision";

type Params = Promise<{ id: string }>;

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

export async function GET(request: Request, segment: { params: Params }) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "requirement.verification.get");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { id } = await segment.params;

  try {
    const decision = computeVerificationDecision(id);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-verification.recompute",
      sourceRef: "apps/web/app/api/requirements/[id]/verification/route.ts:GET",
      success: true,
      input: { session, trace, productContext, id },
      result: {
        requirementId: id,
        verdict: decision.verdict,
        decisionFingerprint: decision.decisionFingerprint,
        consultedPersistedVerificationState: decision.consultedPersistedVerificationState,
      },
    });

    return NextResponse.json(decision, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-verification.recompute",
      sourceRef: "apps/web/app/api/requirements/[id]/verification/route.ts:GET",
      success: false,
      input: { session, trace, productContext, id },
      result: { error: "verification_recompute_failed", detail },
    });

    return NextResponse.json(
      { error: "verification_recompute_failed", detail, id },
      {
        status: detail.includes("not found") ? 404 : 500,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session, trace }),
          productContext,
        }),
      },
    );
  }
}
