import type { CapabilityExperienceRoutes } from "@repo/presentation-types";

export type RequirementRouteId =
  | "default"
  | "list"
  | "detail"
  | "create"
  | "workspace";

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
    path: "/requirements",
    view: "RequirementView",
    label: "Requirements",
    requiresAuth: true,
  },
  list: {
    id: "list",
    path: "/requirements/list",
    view: "RequirementView",
    label: "All Requirements",
    requiresAuth: true,
  },
  detail: {
    id: "detail",
    path: "/requirements/:id",
    view: "RequirementView",
    label: "Requirement Detail",
    requiresAuth: true,
  },
  create: {
    id: "create",
    path: "/requirements/create",
    view: "RequirementView",
    label: "Create Requirement",
    requiresAuth: true,
  },
  workspace: {
    id: "workspace",
    path: "/workspace/requirements",
    view: "RequirementView",
    requiresAuth: true,
  },
} as const;

export const requirementExperienceRoutes: CapabilityExperienceRoutes = {
  default: requirementRoutes.default.path,
  paths: Object.fromEntries(
    Object.entries(requirementRoutes).map(([key, value]) => [key, value.path]),
  ) as CapabilityExperienceRoutes["paths"],
};
