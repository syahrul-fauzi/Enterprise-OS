import type { CapabilityExperienceRoutes } from "@repo/presentation-types";

export type CapabilityRouteId =
  | "list"
  | "detail"
  | "create"
  | "sign"
  | "workspace"
  | "default";

export interface CapabilityRouteDefinition {
  readonly id: CapabilityRouteId;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
}

export const documentRoutes: Readonly<
  Record<CapabilityRouteId, CapabilityRouteDefinition>
> = {
  default: {
    id: "default",
    path: "/documents",
    view: "DocumentView",
    label: "Documents",
    requiresAuth: true,
  },
  list: {
    id: "list",
    path: "/documents/list",
    view: "DocumentView",
    label: "All Documents",
    requiresAuth: true,
  },
  detail: {
    id: "detail",
    path: "/documents/:id",
    view: "DocumentView",
    label: "Document Detail",
    requiresAuth: true,
  },
  create: {
    id: "create",
    path: "/documents/create",
    view: "DocumentView",
    label: "Create Document",
    requiresAuth: true,
  },
  sign: {
    id: "sign",
    path: "/documents/:id/sign",
    view: "DocumentView",
    label: "Sign Document",
    requiresAuth: true,
  },
  workspace: {
    id: "workspace",
    path: "/workspace/document",
    view: "DocumentView",
    requiresAuth: true,
  },
} as const;

export const documentExperienceRoutes: CapabilityExperienceRoutes = {
  default: documentRoutes.default.path,
  paths: Object.fromEntries(
    Object.entries(documentRoutes).map(([k, v]) => [k, v.path])
  ) as CapabilityExperienceRoutes["paths"],
};

export type { CapabilityExperienceRoutes };
