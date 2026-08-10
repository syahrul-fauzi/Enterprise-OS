import { NextResponse } from "next/server";
import {
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
} from "@repo/core-kernel";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";
import { DeliveryDecisionGatewayService } from "../../../../../../capabilities/governance-evidence/implementation/services/governed-delivery-seam";

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

const deliveryDecisionGateway = new DeliveryDecisionGatewayService();

export async function POST(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "governance.decision.submit");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  try {
    const body = await request.json();
    const { requirementId, decisionType, decision, rationale } = body;

    if (!requirementId || !decisionType || !decision || !rationale) {
      throw new Error("Missing required fields: requirementId, decisionType, decision, rationale are mandatory");
    }

    const record = deliveryDecisionGateway.submitDecision(
      { requirementId, decisionType, decision, rationale },
      session
    );

    return NextResponse.json(record, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    return NextResponse.json(
      { error: "decision_submit_failed", detail },
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

export async function GET(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const trace = createWorkspaceRequestTrace(request, "governance.decision.list");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { searchParams } = new URL(request.url);
  const requirementId = searchParams.get("requirementId");
  const productId = searchParams.get("productId");

  if (!requirementId && !productId) {
    return NextResponse.json(
      { error: "missing_query_parameter", detail: "Either requirementId or productId query parameter is required" },
      { status: 400, headers: createAnonymousHeaders(trace) }
    );
  }

  try {
    let decisions;
    if (requirementId) {
      decisions = deliveryDecisionGateway.getDecisionsForRequirement(requirementId);
    } else if (productId) {
      decisions = deliveryDecisionGateway.getDecisionsForProduct(productId);
    }

    return NextResponse.json(decisions, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    return NextResponse.json(
      { error: "decision_list_failed", detail },
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