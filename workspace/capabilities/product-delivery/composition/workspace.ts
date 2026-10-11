// DEL-001: DELIVERY WORKSPACE DEFINITION
// Workspace sebagai EXECUTION CONTEXT, bukan owner (sesuai mandate user)
// Tidak membuat workspace baru sebagai owner dari Work, hanya sebagai context execution yang berubah
export const deliveryWorkspace = {
  id: "workspace.product-delivery.core",
  name: "Product Delivery Workspace",
  description: "Shared execution context for all delivery workflows across merchants, drivers, and customers",
  type: "operational",
  allowedActorTypes: ["merchant", "driver", "customer", "ai-agent"],
  linkedWorkspaces: [
    "workspace.merchant.online",
    "workspace.driver.mobile", 
    "workspace.customer.portal"
  ],
  createdAt: new Date().toISOString(),
} as const;