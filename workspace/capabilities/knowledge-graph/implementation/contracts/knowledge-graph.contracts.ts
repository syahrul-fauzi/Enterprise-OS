export interface KnowledgeNode {
  id: string;
  type: "requirement" | "evidence" | "workflow" | "plan" | "actor" | "capability" | "resource" | "product" | "organization" | "specialization" | "custom";
  label: string;
  attributes: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  version?: number;
}

export interface KnowledgeEdge {
  id: string;
  from: string;
  to: string;
  relation: string;
  metadata?: Record<string, unknown>;
  version?: number;
}

export interface KnowledgeGraphSnapshot {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface KnowledgeGraphRepository {
  saveSnapshot(
    nodes: (KnowledgeNode & { id: string; tenantId: string; workspaceId: string })[],
    edges: (KnowledgeEdge & { id: string; tenantId: string; workspaceId: string })[]
  ): Promise<{ savedNodes: number; savedEdges: number }>;
  loadSnapshot(tenantId: string, workspaceId: string): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }>;
}