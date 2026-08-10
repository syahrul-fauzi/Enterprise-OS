import { NextResponse } from "next/server";
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
import { computeArtifactGraphForRequirement } from "../../../../../lib/artifact-graph";

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
  const trace = createWorkspaceRequestTrace(request, "requirement.artifact-graph.get");
  const productContext = readProductContextFromRequest(request);

  if (!session) {
    return NextResponse.json(
      { error: "unauthorized", detail: "Workspace session is missing or invalid." },
      { status: 401, headers: createAnonymousHeaders(trace) },
    );
  }

  const { id } = await segment.params;

  try {
    const artifactGraph = computeArtifactGraphForRequirement(id);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-artifact-graph.compute",
      sourceRef: "apps/web/app/api/requirements/[id]/artifact-graph/route.ts:GET",
      success: true,
      input: { session, trace, productContext, id },
      result: {
        requirementId: id,
        nodeCount: artifactGraph.nodes.length,
        edgeCount: artifactGraph.edges.length,
        graphId: artifactGraph.graphId,
      },
    });

    return NextResponse.json(artifactGraph, {
      headers: applyProductContextHeaders({
        headers: createWorkspaceContextHeaders({ session, trace }),
        productContext,
      }),
    });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);

    recordRuntimeInvocation({
      capabilityId: "requirement-management",
      operationId: "requirement-artifact-graph.compute",
      sourceRef: "apps/web/app/api/requirements/[id]/artifact-graph/route.ts:GET",
      success: false,
      input: { session, trace, productContext, id },
      result: { error: "artifact_graph_compute_failed", detail },
    });

    return NextResponse.json(
      { error: "artifact_graph_compute_failed", detail, id },
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