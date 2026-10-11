import type { CapabilityExperienceRoutes } from "@repo/presentation-types";

export type RequirementRouteId =
  | "default"
  | "list"
  | "detail"
  | "create"
  | "workspace"
  | "release-readiness";

export interface RequirementRouteDefinition {
  readonly id: RequirementRouteId;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
}

export const requirementRoutes: Readonly<
  Record<RequirementRouteId, RequirementRouteDefinition>
> = {
  default: {
    id: "default",
    path: "/work/:workId/requirements",
    view: "RequirementView",
    label: "Requirements",
    requiresAuth: true,
  },
  list: {
    id: "list",
    path: "/work/:workId/requirements/list",
    view: "RequirementView",
    label: "All Requirements",
    requiresAuth: true,
  },
  detail: {
    id: "detail",
    path: "/work/:workId/requirements/:id",
    view: "RequirementView",
    label: "Requirement Detail",
    requiresAuth: true,
  },
  create: {
    id: "create",
    path: "/work/:workId/requirements/create",
    view: "RequirementView",
    label: "Create Requirement",
    requiresAuth: true,
  },
  workspace: {
    id: "workspace",
    path: "/work/:workId/requirements",
    view: "RequirementView",
    requiresAuth: true,
  },
  "release-readiness": {
    id: "release-readiness",
    path: "/work/:workId/requirements/release-readiness",
    view: "ReleaseReadinessWorkspace",
    label: "Release Readiness",
    requiresAuth: true,
  },
} as const;

export const requirementExperienceRoutes: CapabilityExperienceRoutes = {
  default: requirementRoutes.default.path,
  paths: Object.fromEntries(
    Object.entries(requirementRoutes).map(([key, value]) => [key, value.path]),
  ) as CapabilityExperienceRoutes["paths"],
};