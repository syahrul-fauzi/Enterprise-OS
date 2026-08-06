export interface RequirementLayoutRegion {
  readonly id: string;
  readonly role: "sidebar" | "main" | "toolbar" | "tabs" | "footer";
  readonly slots: readonly RequirementLayoutSlot[];
}

export interface RequirementLayoutSlot {
  readonly id: string;
  readonly defaultCapability?: "requirement-management";
  readonly defaultExperienceView?: "RequirementView" | "RequirementWorkspace";
}

export interface RequirementNavigationEntry {
  readonly id: string;
  readonly label: string;
  readonly route: string;
  readonly regionRole?: RequirementLayoutRegion["role"];
  readonly order: number;
}

export interface RequirementWorkspaceDescriptor {
  readonly id: "requirement-management.workspace.default";
  readonly version: "0.1.0";
  readonly capabilityId: "requirement-management";
  readonly layout: {
    readonly kind: "sidebar-main";
    readonly regions: readonly RequirementLayoutRegion[];
  };
  readonly navigation: readonly RequirementNavigationEntry[];
  readonly defaultRoute: string;
  readonly requiresAuth: boolean;
  readonly permissions: readonly string[];
}

export const requirementWorkspace: RequirementWorkspaceDescriptor = {
  id: "requirement-management.workspace.default",
  version: "0.1.0",
  capabilityId: "requirement-management",
  layout: {
    kind: "sidebar-main",
    regions: [
      {
        id: "region-sidebar",
        role: "sidebar",
        slots: [{ id: "slot-sidebar-navigation" }],
      },
      {
        id: "region-toolbar",
        role: "toolbar",
        slots: [{ id: "slot-toolbar-actions", defaultCapability: "requirement-management" }],
      },
      {
        id: "region-main",
        role: "main",
        slots: [
          {
            id: "slot-main-view",
            defaultCapability: "requirement-management",
            defaultExperienceView: "RequirementView",
          },
        ],
      },
    ],
  },
  navigation: [
    {
      id: "nav-requirement-list",
      label: "All Requirements",
      route: "/requirements",
      regionRole: "sidebar",
      order: 10,
    },
    {
      id: "nav-release-readiness",
      label: "Release Readiness",
      route: "/requirements/release-readiness",
      regionRole: "sidebar",
      order: 15,
    },
    {
      id: "nav-requirement-create",
      label: "Create Requirement",
      route: "/requirements/create",
      regionRole: "sidebar",
      order: 20,
    },
  ],
  defaultRoute: "/requirements",
  requiresAuth: true,
  permissions: [
    "requirement:view",
    "requirement:create",
    "requirement:update",
    "requirement:verify",
  ],
} as const;