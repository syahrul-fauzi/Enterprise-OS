// RET-001: RETAIL INVENTORY WORKSPACE DEFINITION
// Sesuai mandate user: Workspace sebagai EXECUTION CONTEXT, bukan owner (EXECUTION BOUNDARY COMPLIANCE)
// Work tidak pernah berubah, hanya execution context yang berubah
export const retailInventoryWorkspace = {
  id: "workspace.retail-inventory.core",
  name: "Retail Inventory Workspace",
  description: "Shared execution context for all inventory workflows across store staff, inventory managers, and AI assistants",
  type: "operational",
  allowedActorTypes: ["retail-staff", "inventory-manager", "ai-agent", "store-manager"],
  linkedWorkspaces: [
    "workspace.retail.store-001",
    "workspace.retail.warehouse-main",
    "workspace.ai.retail-assistant-portal"
  ],
  createdAt: new Date().toISOString(),
} as const;