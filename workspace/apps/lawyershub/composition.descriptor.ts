import type { DescriptorSource, LayoutId, RegionId, SlotId } from "@repo/composition";
import { workspace } from "./workspace.binding";

const REGION_SIDEBAR = "region::sidebar" as RegionId;
const REGION_TOOLBAR = "region::toolbar" as RegionId;
const REGION_MAIN = "region::main" as RegionId;
const SLOT_NAV = "slot::nav" as SlotId;
const SLOT_TOOLBAR = "slot::toolbar" as SlotId;
const SLOT_MAIN = "slot::main" as SlotId;
const LAWYERSHUB_LAYOUT = "layout::lawyershub-shell" as LayoutId;

export const compositionDescriptor = {
  workspace: {
    id: "lawyershub.workspace.default",
    name: "LawyersHub Workspace",
    workspace: workspace.definition,
    layout: LAWYERSHUB_LAYOUT,
    regions: [REGION_SIDEBAR, REGION_TOOLBAR, REGION_MAIN],
    slots: [
      { slot: SLOT_NAV, region: REGION_SIDEBAR },
      { slot: SLOT_TOOLBAR, region: REGION_TOOLBAR },
      { slot: SLOT_MAIN, region: REGION_MAIN },
    ],
    defaults: [
      {
        slot: SLOT_MAIN,
        capabilityId: "requirement-management",
        view: "RequirementView",
        priority: 0,
      },
    ],
    navigation: { primary: "nav::lawyershub-primary" },
    permissions: {
      requireCapabilities: workspace.definition.capabilities,
      requireRoles: [],
    },
  },
  layoutRegistry: {
    [LAWYERSHUB_LAYOUT]: {
      id: LAWYERSHUB_LAYOUT,
      name: "LawyersHub Shell",
      pattern: "sidebar-main" as const,
      regions: [
        { region: REGION_SIDEBAR, kind: "app-sidebar" as const, weight: 1, minSizePx: 240 },
        { region: REGION_TOOLBAR, kind: "workspace" as const, weight: 0 },
        { region: REGION_MAIN, kind: "main" as const, weight: 4 },
      ],
    },
  },
  regionRegistry: {
    [REGION_SIDEBAR]: {
      id: REGION_SIDEBAR,
      kind: "app-sidebar" as const,
      name: "Sidebar",
      slots: [SLOT_NAV],
    },
    [REGION_TOOLBAR]: {
      id: REGION_TOOLBAR,
      kind: "workspace" as const,
      name: "Toolbar",
      slots: [SLOT_TOOLBAR],
    },
    [REGION_MAIN]: {
      id: REGION_MAIN,
      kind: "main" as const,
      name: "Main",
      slots: [SLOT_MAIN],
    },
  },
  slotRegistry: {
    [SLOT_NAV]: {
      id: SLOT_NAV,
      name: "Navigation",
      purpose: "navigation" as const,
    },
    [SLOT_TOOLBAR]: {
      id: SLOT_TOOLBAR,
      name: "Toolbar",
      purpose: "toolbar" as const,
    },
    [SLOT_MAIN]: {
      id: SLOT_MAIN,
      name: "Main Content",
      purpose: "content" as const,
      capabilityIds: workspace.definition.capabilities,
    },
  },
  navigationRegistry: {
    ["nav::lawyershub-primary"]: {
      id: "nav::lawyershub-primary",
      name: "LawyersHub Primary Navigation",
      kind: "primary" as const,
      items: [
        {
          id: "legal-case",
          label: "Case Management",
          kind: "capability" as const,
          capabilityId: "legal-case",
          href: "/cases",
          order: 10,
        },
        {
          id: "legal-document",
          label: "Legal Documents",
          kind: "capability" as const,
          capabilityId: "legal-document",
          href: "/documents",
          order: 20,
        },
        {
          id: "requirement-management",
          label: "Requirement Management",
          kind: "capability" as const,
          capabilityId: "requirement-management",
          href: "/requirements",
          order: 30,
        },
      ],
    },
  },
} satisfies DescriptorSource;
