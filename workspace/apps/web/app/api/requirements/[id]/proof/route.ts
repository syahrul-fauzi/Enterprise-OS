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
import { computeVerificationProofObject } from "../../../../../lib/proof-object";

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
  const trace = createWorkspaceRequestTrace(request, "requirement.proof.get");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { id } = await segment.params;

  try {
    const proof = computeVerificationProofObject(id);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-proof.compute",
      sourceRef: "apps/web/app/api/requirements/[id]/proof/route.ts:GET",
      success: true,
      input: { session, trace, productContext, id },
      result: {
        requirementId: id,
        proofId: proof.proofId,
        proofDigest: proof.proofDigest,
        decision: proof.decision,
      },
    });

    return NextResponse.json(proof, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-proof.compute",
      sourceRef: "apps/web/app/api/requirements/[id]/proof/route.ts:GET",
      success: false,
      input: { session, trace, productContext, id },
      result: { error: "proof_compute_failed", detail },
    });

    return NextResponse.json(
      { error: "proof_compute_failed", detail, id },
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
