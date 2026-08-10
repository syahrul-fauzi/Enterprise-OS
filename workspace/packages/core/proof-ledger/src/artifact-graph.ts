import fs from "fs";
import path from "path";

export interface ArtifactNode {
  readonly id: string;
  readonly type: "requirement" | "code" | "evidence" | "capability" | "test" | "implementation";
  readonly label: string;
  readonly manifest_ref: string;
  readonly governance_status: "VALID" | "PENDING" | "FAILED";
}

export interface ArtifactEdge {
  readonly from: string;
  readonly to: string;
  readonly relation: "transforms_into" | "depends_on" | "implements" | "verified_by";
}

export interface RequirementArtifactGraph {
  readonly graphId: string;
  readonly requirementId: string;
  readonly generatedAt: string;
  readonly nodes: readonly ArtifactNode[];
  readonly edges: readonly ArtifactEdge[];
  readonly summary: {
    readonly node_count: number;
    readonly edge_count: number;
    readonly requirement_nodes: number;
    readonly code_nodes: number;
    readonly evidence_nodes: number;
  };
  readonly transformationTrace: readonly {
    readonly from: string;
    readonly to: string;
    readonly relation: "transforms_into" | "depends_on" | "implements" | "verified_by";
    readonly description: string;
  }[];
}

function resolveWorkspaceRoot(): string {
  const candidates = [
    process.cwd(),
    "/app",
    "/root/Enterprise-OS/workspace",
    path.resolve(process.cwd(), ".."),
  ];

  for (const candidate of Array.from(new Set(candidates))) {
    const hasWorkspaceShape =
      fs.existsSync(path.join(candidate, "apps")) &&
      fs.existsSync(path.join(candidate, "package.json"));

    if (hasWorkspaceShape) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve workspace root for artifact graph.");
}

function loadGlobalArtifactGraph() {
  const graphPath = path.join(resolveWorkspaceRoot(), "foundation/evidence/verification/artifact-graph.json");
  return JSON.parse(fs.readFileSync(graphPath, "utf8")) as {
    nodes: ArtifactNode[];
    edges: ArtifactEdge[];
  };
}

export function computeArtifactGraphForRequirement(requirementId: string): RequirementArtifactGraph {
  const requirement = requirementService.getRequirement({
    id: RequirementId(requirementId),
  });

  if (!requirement) {
    throw new Error(`Requirement not found: ${requirementId}`);
  }

  const delivery = requirementDeliveryGatewayService.search({
    requirementId,
    coverage: "all",
    limit: 1,
    offset: 0,
  }).items[0];

  if (!delivery) {
    throw new Error(`Delivery context not found: ${requirementId}`);
  }

  const globalGraph = loadGlobalArtifactGraph();
  
  const requirementNode: ArtifactNode = {
    id: `requirement:${requirement.id}`,
    type: "requirement",
    label: requirement.title,
    manifest_ref: requirement.linkedCapabilityIds[0] 
      ? `workspace/capabilities/${requirement.linkedCapabilityIds[0]}/definition/capability.yaml`
      : "workspace/apps/web/app/requirements/page.tsx",
    governance_status: requirement.status === "verified" ? "VALID" : "PENDING",
  };

  const implementationNodes: ArtifactNode[] = requirement.linkedCapabilityIds.map((capId) => ({
    id: `implementation:${capId}`,
    type: "implementation",
    label: `Implementation for ${capId}`,
    manifest_ref: `workspace/capabilities/${capId}/implementation/service.ts`,
    governance_status: "VALID",
  }));

  const evidenceNodes: ArtifactNode[] = delivery.evidence.samplePaths.map((path, index) => ({
    id: `evidence:${index}`,
    type: "evidence",
    label: `Evidence artifact ${index + 1}`,
    manifest_ref: path,
    governance_status: "VALID",
  }));

  const nodes: ArtifactNode[] = [
    requirementNode,
    ...implementationNodes,
    ...evidenceNodes,
    ...globalGraph.nodes.filter((n) => 
      requirement.linkedCapabilityIds.some((capId) => n.id === `capability:${capId}`)
    ),
  ];

  const edges: ArtifactEdge[] = [
    ...implementationNodes.map((implNode) => ({
      from: requirementNode.id,
      to: implNode.id,
      relation: "implements" as const,
    })),
    ...evidenceNodes.map((evNode, index) => ({
      from: implementationNodes[0]?.id || requirementNode.id,
      to: evNode.id,
      relation: "verified_by" as const,
    })),
    ...globalGraph.edges.filter((e) =>
      requirement.linkedCapabilityIds.some((capId) => e.from === `capability:${capId}` || e.to === `capability:${capId}`)
    ),
  ];

  const transformationTrace = [
    {
      from: requirementNode.id,
      to: implementationNodes[0]?.id || "implementation:unknown",
      relation: "transforms_into" as const,
      description: `Requirement "${requirement.title}" diubah menjadi implementasi kode yang dapat dieksekusi`,
    },
  ];

  return {
    graphId: `artifact-graph-${requirementId}`,
    requirementId,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      requirement_nodes: nodes.filter(n => n.type === "requirement").length,
      code_nodes: nodes.filter(n => n.type === "implementation" || n.type === "code").length,
      evidence_nodes: nodes.filter(n => n.type === "evidence").length,
    },
    transformationTrace,
  };
}