import type { CapabilityExperienceRoutes } from "@repo/presentation-types";
import { knowledgeGraphService } from "../implementation/services/knowledge-graph.service.js";
import { getKnowledgeGraphRepositoryPostgres } from "../implementation/repository/knowledge-graph.postgres.repository.js";
import type { TenantId } from "@capabilities/work-core";

export type KnowledgeGraphRouteId =
  | "default"
  | "graph-view"
  | "api-by-work";

export interface KnowledgeGraphRouteDefinition {
  readonly id: KnowledgeGraphRouteId;
  readonly path: string;
  readonly view?: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
  readonly isApi?: boolean;
  readonly handler?: (workId: string, tenantId: TenantId) => Promise<{ nodes: any[]; edges: any[] }>;
}

// API Handler for /api/graph/by-work/:workId - High-Value Work Graph endpoint
const getGraphByWorkId = async (workId: string, tenantId: TenantId) => {
  const repository = getKnowledgeGraphRepositoryPostgres();
  return repository.loadSnapshot(tenantId, { workId });
};

export const knowledgeGraphRoutes: Readonly<
  Record<KnowledgeGraphRouteId, KnowledgeGraphRouteDefinition>
> = {
  default: {
    id: "default",
    path: "/knowledge-graph",
    view: "KnowledgeGraphView",
    label: "Knowledge Graph",
    requiresAuth: true,
  },
  "graph-view": {
    id: "graph-view",
    path: "/knowledge-graph/view",
    view: "KnowledgeGraphView",
    label: "Graph Visualization",
    requiresAuth: true,
  },
  "api-by-work": {
    id: "api-by-work",
    path: "/api/graph/by-work/:workId",
    isApi: true,
    requiresAuth: true,
    handler: getGraphByWorkId,
  },
} as const;

export const knowledgeGraphExperienceRoutes: CapabilityExperienceRoutes = {
  default: knowledgeGraphRoutes.default.path,
  paths: Object.fromEntries(
    Object.entries(knowledgeGraphRoutes).map(([key, value]) => [key, value.path]),
  ) as CapabilityExperienceRoutes["paths"],
};

export const knowledgeGraphCompositionRoutes = (() => {
  const out: any[] = [];
  for (const [id, entry] of Object.entries(knowledgeGraphRoutes)) {
    out.push({
      id,
      path: entry.path,
      view: entry.view,
      label: entry.label ?? id,
      requiresAuth: entry.requiresAuth,
      isApi: entry.isApi,
      handler: entry.handler,
      workspaceId: "knowledge-graph.workspace.default",
    });
  }
  return out;
})();