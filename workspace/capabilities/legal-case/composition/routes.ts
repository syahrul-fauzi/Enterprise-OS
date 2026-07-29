import { caseRoutes } from "../experience/routes";

export interface CaseCompositionRouteDescriptor {
  readonly id: string;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
  readonly workspaceId?: string;
}

export const caseCompositionRoutes: readonly CaseCompositionRouteDescriptor[] = (() => {
  const out: CaseCompositionRouteDescriptor[] = [];
  for (const [id, pathEntry] of Object.entries(caseRoutes.paths)) {
    if (pathEntry === null || pathEntry === undefined) continue;
    if (typeof pathEntry === "string") {
      out.push({
        id,
        path: pathEntry,
        view: id,
        label: id,
        requiresAuth: true,
        workspaceId: "legal-case.workspace.default",
      });
      continue;
    }
    const pe = pathEntry as { readonly path?: string; readonly view?: string; readonly label?: string };
    out.push({
      id,
      path: pe.path ?? "/cases",
      view: pe.view ?? id,
      label: pe.label ?? id,
      requiresAuth: true,
      workspaceId: "legal-case.workspace.default",
    });
  }
  return out;
})();
