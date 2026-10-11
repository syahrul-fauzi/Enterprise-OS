// RET-001: AUTHORITY BOUNDARY COMPLIANCE PERMISSIONS
// Sesuai mandat user: "Work tetap satu. Authority berubah."
// Import workspace sebagai execution context, bukan owner
import { retailInventoryWorkspace } from "./workspace.js";

export interface RetailInventoryPermissionRule {
  readonly action: string;
  readonly resource: string;
  readonly grantedByDefault?: boolean;
  readonly scope?: "tenant" | "workspace" | "region" | "store";
  readonly allowedActors?: readonly string[];
  readonly allowedWorkspaces?: readonly string[];
}

export const retailInventoryPermissions: RetailInventoryPermissionRule[] = [
  {
    action: "view",
    resource: "inventory",
    grantedByDefault: true,
    scope: "store",
    allowedWorkspaces: [
      "workspace.retail.store-001",
      "workspace.retail.warehouse-main",
      "workspace.ai.retail-assistant-portal"
    ],
  },
  {
    action: "create",
    resource: "inventory-adjustment",
    grantedByDefault: false,
    scope: "store",
    allowedActors: ["actor.retail.inventory-manager.*", "actor.retail.store-manager.*"],
    allowedWorkspaces: ["workspace.retail.store-001", "workspace.retail.warehouse-main"],
  },
  {
    action: "ai-suggest",
    resource: "inventory-adjustment",
    grantedByDefault: false,
    scope: "store",
    allowedActors: ["actor.ai-retail-inventory-assistant-001"], // AI-001 actorId spesifik
    allowedWorkspaces: ["workspace.ai.retail-assistant-portal"],
  },
  {
    action: "apply-suggestion",
    resource: "inventory-adjustment",
    grantedByDefault: false,
    scope: "store",
    allowedActors: ["actor.retail.inventory-manager.*", "actor.retail.store-manager.*"],
    allowedWorkspaces: ["workspace.retail.store-001"],
  }
];