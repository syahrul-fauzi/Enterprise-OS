import { documentWorkspace, type DocumentNavigationEntry } from "./workspace";

export interface DocumentNavigationDescriptor {
  readonly workspaceId: typeof documentWorkspace.id;
  readonly entries: readonly DocumentNavigationEntry[];
  readonly primaryRegion: "sidebar" | "tabs" | "toolbar";
}

export const documentNavigation: DocumentNavigationDescriptor = {
  workspaceId: documentWorkspace.id,
  entries: documentWorkspace.navigation,
  primaryRegion: "sidebar",
} as const;
