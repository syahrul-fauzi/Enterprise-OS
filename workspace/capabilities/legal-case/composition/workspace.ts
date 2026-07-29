export interface CaseLayoutRegion {
  readonly id: string;
  readonly role: "sidebar" | "main" | "toolbar" | "tabs" | "footer";
  readonly slots: readonly CaseLayoutSlot[];
}

export interface CaseLayoutSlot {
  readonly id: string;
  readonly defaultCapability?: "legal-case" | "legal-document";
  readonly defaultExperienceView?: "CaseView" | "CaseWorkspace" | "DocumentView" | "DocumentWorkspace";
}

export interface CaseNavigationEntry {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly regionRole?: CaseLayoutRegion["role"];
  readonly order: number;
}

export interface CaseWorkspaceDescriptor {
  readonly id: "legal-case.workspace.default";
  readonly version: "0.1.0";
  readonly capabilityId: "legal-case";
  readonly layout: {
    readonly kind: "sidebar-main";
    readonly regions: readonly CaseLayoutRegion[];
  };
  readonly navigation: readonly CaseNavigationEntry[];
  readonly defaultRoute: string;
  readonly requiresAuth: boolean;
  readonly permissions: readonly string[];
}

export const caseWorkspace: CaseWorkspaceDescriptor = {
  id: "legal-case.workspace.default",
  version: "0.1.0",
  capabilityId: "legal-case",
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
            defaultCapability: "legal-case",
          },
        ],
      },
      {
        id: "region-main",
        role: "main",
        slots: [
          {
            id: "slot-main-view",
            defaultCapability: "legal-case",
            defaultExperienceView: "CaseView",
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
      id: "nav-case-list",
      label: "All Cases",
      route: "/cases",
      regionRole: "sidebar",
      order: 10,
    },
    {
      id: "nav-case-create",
      label: "Create Case",
      route: "/cases/create",
      regionRole: "sidebar",
      order: 20,
    },
  ],
  defaultRoute: "/cases",
  requiresAuth: true,
  permissions: ["case:view", "case:create"],
} as const;

export type CaseWorkspaceId = typeof caseWorkspace.id;
