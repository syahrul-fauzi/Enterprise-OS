import type { CapabilityExperienceRoutes } from "@repo/presentation-types";

export type CapabilityRouteId =
  | "list"
  | "detail"
  | "create"
  | "workspace"
  | "default";

export interface CapabilityRouteDefinition {
  readonly id: CapabilityRouteId;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
}

export const caseRoutes: Readonly<Record<CapabilityRouteId, CapabilityRouteDefinition>> = {
  default: {
    id: "default",
    path: "/cases",
    view: "CaseView",
    label: "Cases",
    requiresAuth: true,
  },
  list: {
    id: "list",
    path: "/cases/list",
    view: "CaseView",
    label: "All Cases",
    requiresAuth: true,
  },
  detail: {
    id: "detail",
    path: "/cases/:id",
    view: "CaseView",
    label: "Case Detail",
    requiresAuth: true,
  },
  create: {
    id: "create",
    path: "/cases/create",
    view: "CaseView",
    label: "Create Case",
    requiresAuth: true,
  },
  workspace: {
    id: "workspace",
    path: "/workspace/case",
    view: "CaseView",
    requiresAuth: true,
  },
} as const;

export const caseExperienceRoutes: CapabilityExperienceRoutes = {
  default: caseRoutes.default.path,
  paths: Object.fromEntries(
    Object.entries(caseRoutes).map(([k, v]) => [k, v.path])
  ) as CapabilityExperienceRoutes["paths"],
};

export type { CapabilityExperienceRoutes };
