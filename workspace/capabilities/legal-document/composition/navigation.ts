import { documentWorkspace, type DocumentNavigationEntry } from "./workspace.js";
import { createWorkspaceNavigation } from "../../../../packages/composition/src/navigation/unified-navigation.js";

export interface DocumentNavigationDescriptor {
  readonly workspaceId: typeof documentWorkspace.id;
  readonly entries: readonly DocumentNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

// Use unified navigation source (UX-SHELL-001 compliance)
const userCapabilities = documentWorkspace.permissions?.requireCapabilities || [];
const unifiedNav = createWorkspaceNavigation("lawyershub", userCapabilities);

const entries: DocumentNavigationEntry[] = unifiedNav.items.map(item => ({
  id: item.id,
  label: item.label,
  route: item.href || "",
  regionRole: "sidebar" as const,
  order: item.order || 999
}));

export const documentNavigation: DocumentNavigationDescriptor = {
  workspaceId: documentWorkspace.id,
  entries,
  primaryRegion: "sidebar",
} as const;