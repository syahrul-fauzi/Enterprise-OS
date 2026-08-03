import {
  requirementWorkspace,
  type RequirementNavigationEntry,
} from "./workspace";

export interface RequirementNavigationDescriptor {
  readonly workspaceId: typeof requirementWorkspace.id;
  readonly entries: readonly RequirementNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

export const requirementNavigation: RequirementNavigationDescriptor = {
  workspaceId: requirementWorkspace.id,
  entries: requirementWorkspace.navigation,
  primaryRegion: "sidebar",
} as const;
