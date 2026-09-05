import type { NavigationItem, NavigationDescriptor } from "./index.js";

// GLOBAL_NAV_ITEMS - Navigation items that appear in ALL workspaces
export const GLOBAL_NAV_ITEMS: readonly NavigationItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    kind: "link",
    href: "/workspace",
    order: 10,
  },
  {
    id: "nav-requirements",
    label: "Requirements",
    kind: "link",
    href: "/requirements",
    order: 20,
  },
  {
    id: "nav-community",
    label: "Community",
    kind: "link",
    href: "/community",
    order: 30,
  },
  {
    id: "nav-settings",
    label: "Settings",
    kind: "link",
    href: "/settings",
    order: 900, // Always last in global navigation
  },
] as const;

// VERTICAL_NAV_ITEMS - Product-specific navigation items (added to global)
export const VERTICAL_NAV_ITEMS: Record<string, readonly NavigationItem[]> = {
  "services-id": [
    {
      id: "nav-service-intake",
      label: "Service Intake",
      kind: "link",
      href: "/products/services-id/intake",
      capabilityId: "requirement-management:create",
      order: 25,
    },
  ],
  "lawyershub": [
    {
      id: "nav-cases",
      label: "Legal Cases",
      kind: "link",
      href: "/products/lawyershub/cases",
      capabilityId: "legal-case-management:view",
      order: 25,
    },
  ],
  "ilc": [
    {
      id: "nav-research",
      label: "Research",
      kind: "link",
      href: "/products/ilc/research",
      capabilityId: "research-management:view",
      order: 25,
    },
  ],
  "dataops": [
    {
      id: "nav-data-tasks",
      label: "Data Tasks",
      kind: "link",
      href: "/products/dataops/tasks",
      capabilityId: "data-ops:execute",
      order: 25,
    },
  ],
} as const;

/**
 * Creates a unified workspace navigation descriptor by combining global and vertical-specific items,
 * filtered by user capabilities and sorted by order.
 * 
 * This is the SINGLE SOURCE OF TRUTH for all navigation in EOS - UX-SHELL-001 compliance.
 * No vertical should create its own navigation list - use this function exclusively.
 */
export function createWorkspaceNavigation(
  productId: string,
  userCapabilities: string[]
): NavigationDescriptor {
  // Get vertical-specific items (empty array if product not found)
  const verticalItems = VERTICAL_NAV_ITEMS[productId] || [];
  
  // Combine global and vertical items
  const allItems = [...GLOBAL_NAV_ITEMS, ...verticalItems];
  
  // Filter items based on user capabilities (only show items user has access to)
  const filteredItems = allItems.filter(item => {
    // Items without capability requirement are always visible
    if (!item.capabilityId) return true;
    // Items with capability requirement are only visible if user has the capability
    return userCapabilities.includes(item.capabilityId);
  });
  
  // Sort items by their order property (default to 999 if not specified)
  const sortedItems = [...filteredItems].sort((a, b) => 
    (a.order || 999) - (b.order || 999)
  );

  return {
    id: `nav-primary-${productId}`,
    name: `Primary Navigation - ${productId}`,
    kind: "primary",
    items: sortedItems
  } as const;
}