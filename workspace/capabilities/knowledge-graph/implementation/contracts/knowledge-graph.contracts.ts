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

import type { TenantId } from "@repo/capabilities-work-core";

export interface KnowledgeGraphRepository {
  saveSnapshot(
    nodes: (KnowledgeNode & { id: string; tenantId: TenantId; workspaceId: string })[],
    edges: (KnowledgeEdge & { id: string; tenantId: TenantId; workspaceId: string })[]
  ): Promise<{ savedNodes: number; savedEdges: number }>;
  loadSnapshot(tenantId: TenantId, workspaceId: string): Promise<{ nodes: KnowledgeNode[]; edges: KnowledgeEdge[] }>;
}