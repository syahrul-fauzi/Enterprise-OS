// DEL-001: AUTHORITY BOUNDARY COMPLIANCE PERMISSIONS
// Sesuai mandat user: "Work tetap satu. Authority berubah."
// Workspace sebagai context, bukan owner: merchant → driver → customer tetap mengakses Work yang sama
import { deliveryWorkspace } from "./workspace.js";

export interface DeliveryPermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly grantedByDefault?: boolean;
  readonly scope?: "tenant" | "workspace" | "region" | "slot";
  readonly allowedActors?: readonly string[];
  readonly allowedWorkspaces?: readonly string[];
}

export const deliveryPermissions: DeliveryPermissionRule[] = [
  {
    action: "view",
    resource: "delivery",
    grantedByDefault: true,
    scope: "workspace",
    allowedWorkspaces: [
      "workspace.merchant.online",
      "workspace.driver.mobile",
      "workspace.customer.portal"
    ],
  },
  {
    action: "create",
    resource: "delivery",
    grantedByDefault: false,
    scope: "workspace",
    allowedActors: ["actor.merchant.*"],
    allowedWorkspaces: ["workspace.merchant.online"],
  },
  {
    action: "pickup",
    resource: "delivery",
    grantedByDefault: false,
    scope: "workspace",
    allowedActors: ["actor.driver.*"],
    allowedWorkspaces: ["workspace.driver.mobile"],
  },
  {
    action: "update-location",
    resource: "delivery",
    grantedByDefault: false,
    scope: "workspace",
    allowedActors: ["actor.driver.*"],
    allowedWorkspaces: ["workspace.driver.mobile"],
  },
  {
    action: "confirm-delivery",
    resource: "delivery",
    grantedByDefault: false,
    scope: "workspace",
    allowedActors: ["actor.customer.*", "actor.driver.*"],
    allowedWorkspaces: ["workspace.customer.portal", "workspace.driver.mobile"],
  },
  {
    action: "add-evidence",
    resource: "delivery",
    grantedByDefault: false,
    scope: "workspace",
    allowedActors: ["actor.driver.*", "actor.customer.*"],
    allowedWorkspaces: ["workspace.driver.mobile", "workspace.customer.portal"],
  },
  {
    action: "approve-settlement",
    resource: "delivery",
    grantedByDefault: false,
    scope: "tenant",
    allowedActors: ["actor.merchant.*", "ai.allocator.001"], // AI-001: AI actor untuk settlement approval
  },
];

export const deliveryWorkspacePermissions = {
  workspaceId: deliveryWorkspace.id,
  rules: deliveryPermissions,
} as const;