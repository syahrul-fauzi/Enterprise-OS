import { caseWorkspace, type CaseNavigationEntry } from "./workspace.js";
import { createWorkspaceNavigation } from "../../../../packages/composition/src/navigation/unified-navigation.js";

export interface CaseNavigationDescriptor {
  readonly workspaceId: typeof caseWorkspace.id;
  readonly entries: readonly CaseNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

// Use unified navigation source (UX-SHELL-001 compliance)
const userCapabilities = caseWorkspace.permissions?.requireCapabilities || [];
const unifiedNav = createWorkspaceNavigation("lawyershub", userCapabilities);

const entries: CaseNavigationEntry[] = unifiedNav.items.map(item => ({
  id: item.id,
  label: item.label,
  route: item.href || "",
  regionRole: "sidebar" as const,
  order: item.order || 999
}));

export const caseNavigation: CaseNavigationDescriptor = {
  workspaceId: caseWorkspace.id,
  entries,
  primaryRegion: "sidebar",
} as const;