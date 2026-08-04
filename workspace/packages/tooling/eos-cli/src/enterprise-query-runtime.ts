import { resolve } from "node:path";
import type { EnterpriseControlGraph } from "./enterprise-control-graph-runtime.js";
import { readJsonArtifact, readYamlArtifact } from "./governance-runtime.js";
import { EOS_ROOT } from "./state.js";

const FOUNDATION_VERIFICATION_DIR = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification",
);
const ENTERPRISE_CONTROL_GRAPH_PATH = resolve(
  FOUNDATION_VERIFICATION_DIR,
  "enterprise-control-graph.json",
);
const GATE_C_STATUS_PATH = resolve(
  EOS_ROOT,
  "enterprise/science/gate-c/execution/gate-c-status.yaml",
);

type EnterpriseControlGraphNode = EnterpriseControlGraph["nodes"][number];
type EnterpriseControlGraphEdge = EnterpriseControlGraph["edges"][number];

type GateCStatusProjection = {
  readonly overall?: Record<string, unknown>;
};

type EnterpriseQueryRequest =
  | {
      readonly kind: "SHOW";
      readonly entity:
        | "capabilities"
        | "sessions"
        | "certificates"
        | "read_models"
        | "attestations"
        | "evidence_packages";
      readonly filterField: string | null;
      readonly filterValue: string | null;
    }
  | {
      readonly kind: "TRACE";
      readonly entity: string;
      readonly subject: string;
    }
  | {
      readonly kind: "IMPACT";
      readonly entity: string;
      readonly subject: string;
    }
  | {
      readonly kind: "WHY";
      readonly subject: string;
      readonly expectedStatus: string | null;
    };

type ShowEntity = Extract<
  EnterpriseQueryRequest,
  { readonly kind: "SHOW" }
>["entity"];

export type EnterpriseQueryResult = {
  readonly query: string;
  readonly kind: EnterpriseQueryRequest["kind"];
  readonly status: "PASS" | "FAIL";
  readonly summary: string;
  readonly result: Record<string, unknown>;
};

function normalizeScalar(value: unknown): string {
  return String(value ?? "").trim();
}

function toUpperScalar(value: unknown): string {
  return normalizeScalar(value).toUpperCase();
}

function classifyControlSignalStatus(value: unknown): "PASS" | "WARN" | "FAIL" | "UNKNOWN" {
  const normalized = toUpperScalar(value);
  if (
    normalized === "FAIL" ||
    normalized === "ERROR" ||
    normalized === "BROKEN" ||
    normalized === "UNHEALTHY"
  ) {
    return "FAIL";
  }
  if (
    normalized === "WARN" ||
    normalized === "WARNING" ||
    normalized === "DEGRADED" ||
    normalized === "COMPATIBILITY_DRIFT"
  ) {
    return "WARN";
  }
  if (
    normalized === "PASS" ||
    normalized === "COMPLETED" ||
    normalized === "HEALTHY" ||
    normalized === "MATERIALIZED" ||
    normalized === "ISSUED" ||
    normalized === "VERIFIED" ||
    normalized === "APPLIED" ||
    normalized === "RATIFIABLE"
  ) {
    return "PASS";
  }
  return "UNKNOWN";
}

function toFlatNode(node: EnterpriseControlGraphNode): Record<string, unknown> {
  return {
    node_id: node.node_id,
    node_kind: node.node_kind,
    display_name: node.display_name,
    status: node.status,
    digest: node.digest,
    ...node.attributes,
  };
}

function resolveEntityKind(entity: string): EnterpriseControlGraphNode["node_kind"] | null {
  switch (entity.toLowerCase()) {
    case "capability":
    case "capabilities":
      return "capability";
    case "session":
    case "sessions":
      return "governance_session";
    case "certificate":
    case "certificates":
      return "certificate";
    case "read-model":
    case "read-models":
    case "read_models":
      return "read_model";
    case "attestation":
    case "attestations":
      return "attestation";
    case "evidence-package":
    case "evidence-packages":
    case "evidence_packages":
      return "evidence_package";
    default:
      return null;
  }
}

function parseEnterpriseQuery(rawQuery: string): EnterpriseQueryRequest {
  const query = rawQuery.trim();
  const showMatch = query.match(
    /^SHOW\s+(capabilities|sessions|certificates|read_models|read-models|attestations|evidence_packages|evidence-packages)(?:\s+WHERE\s+([A-Za-z0-9_]+)\s*=\s*(.+))?$/i,
  );
  if (showMatch) {
    const entity = showMatch[1]!.toLowerCase().replace(/-/g, "_") as ShowEntity;
    return {
      kind: "SHOW",
      entity,
      filterField: showMatch[2] ?? null,
      filterValue: showMatch[3]?.trim() ?? null,
    };
  }

  const traceMatch = query.match(/^TRACE\s+([A-Za-z0-9_-]+)\s+(.+)$/i);
  if (traceMatch) {
    return {
      kind: "TRACE",
      entity: traceMatch[1]!,
      subject: traceMatch[2]!.trim(),
    };
  }

  const impactMatch = query.match(/^IMPACT\s+([A-Za-z0-9_-]+)\s+(.+)$/i);
  if (impactMatch) {
    return {
      kind: "IMPACT",
      entity: impactMatch[1]!,
      subject: impactMatch[2]!.trim(),
    };
  }

  const whyMatch = query.match(/^WHY\s+([A-Za-z0-9_-]+)(?:\s*=\s*([A-Za-z0-9_-]+))?$/i);
  if (whyMatch) {
    return {
      kind: "WHY",
      subject: whyMatch[1]!.trim(),
      expectedStatus: whyMatch[2]?.trim() ?? null,
    };
  }

  throw new Error(
    `Unsupported enterprise query: "${rawQuery}". Supported forms: SHOW <entity> [WHERE field = value], TRACE <entity> <id>, IMPACT <entity> <id>, WHY gate-c [= WARN].`,
  );
}

function buildAdjacency(edges: readonly EnterpriseControlGraphEdge[]) {
  const outgoing = new Map<string, EnterpriseControlGraphEdge[]>();
  const incoming = new Map<string, EnterpriseControlGraphEdge[]>();

  for (const edge of edges) {
    outgoing.set(edge.from_node_id, [...(outgoing.get(edge.from_node_id) ?? []), edge]);
    incoming.set(edge.to_node_id, [...(incoming.get(edge.to_node_id) ?? []), edge]);
  }

  return {
    outgoing,
    incoming,
  };
}

function resolveNode(
  graph: EnterpriseControlGraph,
  entity: string,
  subject: string,
): EnterpriseControlGraphNode {
  const expectedKind = resolveEntityKind(entity);
  if (expectedKind === null) {
    throw new Error(`Unsupported entity for node resolution: ${entity}.`);
  }

  const candidates = graph.nodes.filter((node) => node.node_kind === expectedKind);
  const exactMatch =
    candidates.find(
      (node) =>
        node.node_id === subject ||
        node.display_name === subject ||
        node.digest === subject,
    ) ?? null;
  if (exactMatch) {
    return exactMatch;
  }

  const normalized = subject.toLowerCase();
  const partialMatches = candidates.filter((node) => {
    const digest = node.digest?.toLowerCase() ?? "";
    return (
      node.node_id.toLowerCase().includes(normalized) ||
      node.display_name.toLowerCase().includes(normalized) ||
      digest.includes(normalized)
    );
  });
  if (partialMatches.length === 1) {
    return partialMatches[0]!;
  }
  if (partialMatches.length === 0) {
    throw new Error(`No ${entity} node matched "${subject}".`);
  }
  throw new Error(
    `Ambiguous ${entity} subject "${subject}". Matches: ${partialMatches
      .map((node) => node.node_id)
      .join(", ")}`,
  );
}

function resolveGateCNode(graph: EnterpriseControlGraph): EnterpriseControlGraphNode {
  const matches = graph.nodes.filter(
    (node) =>
      node.node_kind === "control_surface" &&
      (node.node_id.toLowerCase().includes("gate-c") ||
        node.display_name.toLowerCase() === "gate c snapshot"),
  );
  if (matches.length === 1) {
    return matches[0]!;
  }
  if (matches.length === 0) {
    throw new Error("Gate C snapshot node is missing from the enterprise control graph.");
  }
  throw new Error(
    `Ambiguous Gate C snapshot node. Matches: ${matches.map((node) => node.node_id).join(", ")}`,
  );
}

function traverseDirectional(input: {
  readonly startNodeId: string;
  readonly edgesByNode: ReadonlyMap<string, readonly EnterpriseControlGraphEdge[]>;
  readonly nextNodeId: (edge: EnterpriseControlGraphEdge) => string;
}): {
  readonly nodeIds: readonly string[];
  readonly edgeIds: readonly string[];
} {
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue = [input.startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of input.edgesByNode.get(current) ?? []) {
      const neighbor = input.nextNodeId(edge);
      if (!visitedEdges.has(edge.edge_id)) {
        visitedEdges.add(edge.edge_id);
      }
      if (neighbor !== input.startNodeId && !visitedNodes.has(neighbor)) {
        visitedNodes.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return {
    nodeIds: [...visitedNodes].sort(),
    edgeIds: [...visitedEdges].sort(),
  };
}

function evaluateShowQuery(
  request: Extract<EnterpriseQueryRequest, { readonly kind: "SHOW" }>,
  graph: EnterpriseControlGraph,
): EnterpriseQueryResult {
  const entityKind = resolveEntityKind(request.entity);
  if (entityKind === null) {
    throw new Error(`Unsupported SHOW entity: ${request.entity}.`);
  }

  const matches = graph.nodes
    .filter((node) => node.node_kind === entityKind)
    .map((node) => toFlatNode(node))
    .filter((node) => {
      if (request.filterField === null || request.filterValue === null) {
        return true;
      }
      const field = request.filterField;
      const fieldValue =
        node[field] ??
        (field === "governance_status" ? node.status : undefined) ??
        (field === "dependency_health_status"
          ? node.dependency_health_status
          : undefined);
      return toUpperScalar(fieldValue) === toUpperScalar(request.filterValue);
    });

  return {
    query: `SHOW ${request.entity}${request.filterField ? ` WHERE ${request.filterField} = ${request.filterValue}` : ""}`,
    kind: request.kind,
    status: "PASS",
    summary: `Matched ${String(matches.length)} ${request.entity}.`,
    result: {
      entity: request.entity,
      match_count: matches.length,
      matches,
    },
  };
}

function evaluateTraceQuery(
  request: Extract<EnterpriseQueryRequest, { readonly kind: "TRACE" }>,
  graph: EnterpriseControlGraph,
): EnterpriseQueryResult {
  const startNode = resolveNode(graph, request.entity, request.subject);
  const adjacency = buildAdjacency(graph.edges);
  const upstream = traverseDirectional({
    startNodeId: startNode.node_id,
    edgesByNode: adjacency.incoming,
    nextNodeId: (edge) => edge.from_node_id,
  });
  const downstream = traverseDirectional({
    startNodeId: startNode.node_id,
    edgesByNode: adjacency.outgoing,
    nextNodeId: (edge) => edge.to_node_id,
  });
  const nodeById = new Map(graph.nodes.map((node) => [node.node_id, node]));

  return {
    query: `TRACE ${request.entity} ${request.subject}`,
    kind: request.kind,
    status: "PASS",
    summary: `Traced ${startNode.node_id} with ${String(upstream.nodeIds.length)} upstream and ${String(downstream.nodeIds.length)} downstream nodes.`,
    result: {
      start_node: toFlatNode(startNode),
      upstream_nodes: upstream.nodeIds.map((nodeId) => toFlatNode(nodeById.get(nodeId)!)),
      downstream_nodes: downstream.nodeIds.map((nodeId) =>
        toFlatNode(nodeById.get(nodeId)!),
      ),
      traversed_edge_count: upstream.edgeIds.length + downstream.edgeIds.length,
    },
  };
}

function evaluateImpactQuery(
  request: Extract<EnterpriseQueryRequest, { readonly kind: "IMPACT" }>,
  graph: EnterpriseControlGraph,
): EnterpriseQueryResult {
  const startNode = resolveNode(graph, request.entity, request.subject);
  const adjacency = buildAdjacency(graph.edges);
  const visitedNodes = new Set<string>();
  const visitedEdges = new Set<string>();
  const queue = [startNode.node_id];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of adjacency.outgoing.get(current) ?? []) {
      visitedEdges.add(edge.edge_id);
      if (!visitedNodes.has(edge.to_node_id)) {
        visitedNodes.add(edge.to_node_id);
        queue.push(edge.to_node_id);
      }
    }
    for (const edge of adjacency.incoming.get(current) ?? []) {
      if (edge.edge_kind !== "DEPENDS_ON") {
        continue;
      }
      visitedEdges.add(edge.edge_id);
      if (!visitedNodes.has(edge.from_node_id)) {
        visitedNodes.add(edge.from_node_id);
        queue.push(edge.from_node_id);
      }
    }
  }

  const nodeById = new Map(graph.nodes.map((node) => [node.node_id, node]));
  const impactedNodes = [...visitedNodes]
    .sort()
    .map((nodeId) => toFlatNode(nodeById.get(nodeId)!));

  return {
    query: `IMPACT ${request.entity} ${request.subject}`,
    kind: request.kind,
    status: "PASS",
    summary: `Computed impact from ${startNode.node_id} across ${String(impactedNodes.length)} downstream or dependent nodes.`,
    result: {
      source_node: toFlatNode(startNode),
      impacted_node_count: impactedNodes.length,
      impacted_nodes: impactedNodes,
      traversed_edge_count: visitedEdges.size,
    },
  };
}

function evaluateWhyQuery(
  request: Extract<EnterpriseQueryRequest, { readonly kind: "WHY" }>,
  graph: EnterpriseControlGraph,
): EnterpriseQueryResult {
  if (!["gate-c", "gate_c", "gatec"].includes(request.subject.toLowerCase())) {
    throw new Error(`WHY currently supports only gate-c. Received: ${request.subject}.`);
  }
  const gateCNode = resolveGateCNode(graph);
  const adjacency = buildAdjacency(graph.edges);
  const nodeById = new Map(graph.nodes.map((node) => [node.node_id, node]));
  const upstream = traverseDirectional({
    startNodeId: gateCNode.node_id,
    edgesByNode: adjacency.incoming,
    nextNodeId: (edge) => edge.from_node_id,
  });
  const expectedSignal = request.expectedStatus?.toUpperCase() ?? null;
  const reasons = (adjacency.incoming.get(gateCNode.node_id) ?? [])
    .map((edge) => {
      const sourceNode = nodeById.get(edge.from_node_id)!;
      const sourceSignal = classifyControlSignalStatus(sourceNode.status);
      return {
        edge,
        sourceNode,
        sourceSignal,
      };
    })
    .filter(({ sourceSignal }) => {
      if (expectedSignal !== null) {
        return sourceSignal === expectedSignal;
      }
      return sourceSignal !== "PASS" && sourceSignal !== "UNKNOWN";
    })
    .map(({ edge, sourceNode, sourceSignal }) => ({
      node_id: sourceNode.node_id,
      display_name: sourceNode.display_name,
      node_kind: sourceNode.node_kind,
      status: sourceNode.status,
      signal_status: sourceSignal,
      rationale: edge.rationale,
      contributing_capabilities: upstream.nodeIds
        .map((nodeId) => nodeById.get(nodeId)!)
        .filter(
          (node) =>
            node.node_kind === "capability" &&
            classifyControlSignalStatus(node.attributes.dependency_health_status) ===
              sourceSignal,
        )
        .map((node) => node.display_name)
        .sort(),
    }));

  return {
    query: `WHY ${request.subject}${request.expectedStatus ? ` = ${request.expectedStatus}` : ""}`,
    kind: request.kind,
    status: "PASS",
    summary:
      reasons.length > 0
        ? `Identified ${String(reasons.length)} contributing Gate C signal(s).`
        : "No non-pass Gate C signals matched the requested status.",
    result: {
      gate_c_node: toFlatNode(gateCNode),
      queried_status: request.expectedStatus,
      reason_count: reasons.length,
      reasons,
    },
  };
}

export function evaluateEnterpriseQuery(input: {
  readonly rawQuery: string;
  readonly graph: EnterpriseControlGraph;
  readonly gateCStatus: GateCStatusProjection;
}): EnterpriseQueryResult {
  const request = parseEnterpriseQuery(input.rawQuery);

  switch (request.kind) {
    case "SHOW":
      return evaluateShowQuery(request, input.graph);
    case "TRACE":
      return evaluateTraceQuery(request, input.graph);
    case "IMPACT":
      return evaluateImpactQuery(request, input.graph);
    case "WHY":
      return evaluateWhyQuery(request, input.graph);
  }
}

export function loadEnterpriseQueryArtifacts(): {
  readonly graph: EnterpriseControlGraph;
  readonly gateCStatus: GateCStatusProjection;
} {
  return {
    graph: readJsonArtifact<EnterpriseControlGraph>(ENTERPRISE_CONTROL_GRAPH_PATH),
    gateCStatus: readYamlArtifact<GateCStatusProjection>(GATE_C_STATUS_PATH),
  };
}
