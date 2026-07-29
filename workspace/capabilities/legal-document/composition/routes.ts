import { documentRoutes } from "../experience/routes";

export interface DocumentCompositionRouteDescriptor {
  readonly id: string;
  readonly path: string;
  readonly view: string;
  readonly label?: string;
  readonly requiresAuth?: boolean;
  readonly workspaceId?: string;
}

export const documentCompositionRoutes: readonly DocumentCompositionRouteDescriptor[] = (() => {
  const out: DocumentCompositionRouteDescriptor[] = [];
  for (const [id, pathEntry] of Object.entries(documentRoutes.paths)) {
    if (pathEntry === null || pathEntry === undefined) continue;
    if (typeof pathEntry === "string") {
      out.push({
        id,
        path: pathEntry,
        view: id,
        label: id,
        requiresAuth: true,
        workspaceId: "legal-document.workspace.default",
      });
      continue;
    }
    const pe = pathEntry as { readonly path?: string; readonly view?: string; readonly label?: string };
    out.push({
      id,
      path: pe.path ?? "/documents",
      view: pe.view ?? id,
      label: pe.label ?? id,
      requiresAuth: true,
      workspaceId: "legal-document.workspace.default",
    });
  }
  return out;
})();
