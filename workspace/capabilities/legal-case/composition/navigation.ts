import { caseWorkspace, type CaseNavigationEntry } from "./workspace";

export interface CaseNavigationDescriptor {
  readonly workspaceId: typeof caseWorkspace.id;
  readonly entries: readonly CaseNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

export const caseNavigation: CaseNavigationDescriptor = {
  workspaceId: caseWorkspace.id,
  entries: caseWorkspace.navigation,
  primaryRegion: "sidebar",
} as const;
