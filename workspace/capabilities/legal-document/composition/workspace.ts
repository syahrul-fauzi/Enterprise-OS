export interface DocumentLayoutRegion {
  readonly id: string;
  readonly role: "sidebar" | "main" | "toolbar" | "tabs" | "footer";
  readonly slots: readonly DocumentLayoutSlot[];
}

export interface DocumentLayoutSlot {
  readonly id: string;
  readonly defaultCapability?: "legal-document" | "legal-case";
  readonly defaultExperienceView?:
    | "DocumentView"
    | "DocumentWorkspace"
    | "CaseView"
    | "CaseWorkspace";
}

export interface DocumentNavigationEntry {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly regionRole?: DocumentLayoutRegion["role"];
  readonly order: number;
}

export interface DocumentWorkspaceDescriptor {
  readonly id: "legal-document.workspace.default";
  readonly version: "0.1.0";
  readonly capabilityId: "legal-document";
  readonly layout: {
    readonly kind: "sidebar-main";
    readonly regions: readonly DocumentLayoutRegion[];
  };
  readonly navigation: readonly DocumentNavigationEntry[];
  readonly defaultRoute: string;
  readonly requiresAuth: boolean;
  readonly permissions: readonly string[];
}

export const documentWorkspace: DocumentWorkspaceDescriptor = {
  id: "legal-document.workspace.default",
  version: "0.1.0",
  capabilityId: "legal-document",
  layout: {
    kind: "sidebar-main",
    regions: [
      {
        id: "region-sidebar",
        role: "sidebar",
        slots: [
          {
            id: "slot-sidebar-navigation",
          },
        ],
      },
      {
        id: "region-toolbar",
        role: "toolbar",
        slots: [
          {
            id: "slot-toolbar-actions",
            defaultCapability: "legal-document",
          },
        ],
      },
      {
        id: "region-main",
        role: "main",
        slots: [
          {
            id: "slot-main-view",
            defaultCapability: "legal-document",
            defaultExperienceView: "DocumentView",
          },
        ],
      },
      {
        id: "region-tabs",
        role: "tabs",
        slots: [
          {
            id: "slot-tabs",
          },
        ],
      },
    ],
  },
  navigation: [
    {
      id: "nav-doc-list",
      label: "All Documents",
      route: "/documents",
      regionRole: "sidebar",
      order: 10,
    },
    {
      id: "nav-doc-create",
      label: "Create Document",
      route: "/documents/create",
      regionRole: "sidebar",
      order: 20,
    },
    {
      id: "nav-doc-sign",
      label: "Pending Signing",
      route: "/documents?status=review",
      regionRole: "sidebar",
      order: 30,
    },
  ],
  defaultRoute: "/documents",
  requiresAuth: true,
  permissions: ["document:view", "document:create", "document:sign"],
} as const;

export type DocumentWorkspaceId = typeof documentWorkspace.id;
