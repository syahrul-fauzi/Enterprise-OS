import {
  requirementWorkspace,
  type RequirementNavigationEntry,
} from "./workspace.js";
import { createWorkspaceNavigation } from "../../../../packages/composition/src/navigation/unified-navigation.js";

export interface RequirementNavigationDescriptor {
  readonly workspaceId: typeof requirementWorkspace.id;
  readonly entries: readonly RequirementNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

// Use unified navigation source (UX-SHELL-001 compliance)
const userCapabilities = requirementWorkspace.permissions?.requireCapabilities || [];
const unifiedNav = createWorkspaceNavigation("services-id", userCapabilities);

const entries: RequirementNavigationEntry[] = unifiedNav.items.map(item => ({
  id: item.id,
  label: item.label,
  route: item.href || "",
  regionRole: "sidebar" as const,
  order: item.order || 999
}));

export const requirementNavigation: RequirementNavigationDescriptor = {
  workspaceId: requirementWorkspace.id,
  entries,
  primaryRegion: "sidebar",
} as const;