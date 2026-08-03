import { requirementRoutes } from "../experience/routes";

export interface RequirementCompositionRouteDescriptor {
  readonly id: string;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
  readonly workspaceId?: string;
}

export const requirementCompositionRoutes: readonly RequirementCompositionRouteDescriptor[] =
  (() => {
    const out: RequirementCompositionRouteDescriptor[] = [];
    for (const [id, entry] of Object.entries(requirementRoutes)) {
      out.push({
        id,
        path: entry.path,
        view: entry.view,
        label: entry.label ?? id,
        requiresAuth: entry.requiresAuth,
        workspaceId: "requirement-management.workspace.default",
      });
    }
    return out;
  })();
