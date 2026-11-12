 import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";
        import { isValidWorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";

/**
 * Ecommerce Ops workflow aligned with EOS 6-stage universal lifecycle:
 * discover→create→execute→progress→evidence→complete
 * Reuses all existing capability implementations while maintaining state semantics
 * Fully compliant with EOS 5-Boundary model (core-kernel WorkflowDefinition specification)
 * Aligned with eos.yaml 6-stage framework to ensure portfolio consistency
 */
export const ECOMMERCE_OPS_WORKFLOW: WorkflowDefinition = {
  id: "ecommerce-universal-execution",
  productId: "ecommerce-ops",
  // ① Identity Boundary (core-kernel mandatory field)
  identityBoundary: {
    tenantId: "tenant-ecommerce-ops-001",
    organizationId: "org-ecommerce-retail-001",
    authorizedActors: ["system", "ecommerce-manager", "finance-team", "fulfillment-associate", "logistics-coordinator", "warehouse-manager"]
  },
  // ② Semantic Boundary (core-kernel mandatory field)
  semanticBoundary: {
    domain: "ecommerce-fulfillment",
    primaryIntent: "Execute end-to-end order fulfillment for marketplace orders (Shopee/Lazada/Tokopedia) with full evidence chain",
    workType: "ecommerce-order-workflow",
    requirements: ["payment-verification", "inventory-tracking", "logistics-sync", "revenue-recording", "evidence-preservation"]
  },
  // ③ Authority Boundary (core-kernel mandatory field)
  authorityBoundary: {
    requiredCapabilities: ["connector-ecosystem.ingest", "payment-processing.verify", "requirement-management.resolve", "observability.monitor", "governance-approval.confirm", "governance-evidence.archive"],
    policyIds: ["ecommerce-order-governance-policy", "payment-fraud-protection-policy", "evidence-chain-integrity-policy"],
    delegable: false,
    approvalThreshold: 1
  },
  // ④ Execution Boundary (core-kernel mandatory field)
  executionBoundary: {
    workspaceId: "workspace-ecommerce-ops.anonymous",
    runtimeEnvironment: "production",
    assignedActors: ["system", "ecommerce-manager", "finance-team", "fulfillment-associate", "logistics-coordinator", "warehouse-manager"],
    externalSystemIds: ["shopee-marketplace-connector", "lazada-marketplace-connector", "tokopedia-marketplace-connector", "logistics-partner-api"],
    executionFrame: "constrained-gui"
  },
  // ⑤ Presentation Boundary (core-kernel mandatory field)
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "ecommerce-ops-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // High-Value Work Graph Semantic References
  productRef: "product-ecommerce-ops-001",
  caseRef: "case-ecommerce-order-fulfillment-template",
  label: "Discover → Create → Execute → Progress → Evidence → Complete",
  initialStep: "discover",
  terminalStep: "complete",
  steps: [
    {
      id: "discover",
      label: "Order Received (Discover)",
      capability: "connector-ecosystem",
      command: "connector.ingest",
      description: "External order imported from marketplace (Shopee/Lazada/Tokopedia) as canonical Work. Shopee order ID + inventory SKU captured. (EOS 6-stage phase 1: discover)",
      requiredRoles: ["system", "ecommerce-manager"]
    },
    {
      id: "create",
      label: "Order Created (Create)",
      capability: "work-formation",
      command: "work.create",
      description: "Create canonical Work record with order details, customer info, and inventory reservation. (EOS 6-stage phase 2: create)",
      requiredRoles: ["system", "warehouse-manager"]
    },
    {
      id: "execute",
      label: "Fulfillment in Progress (Execute)",
      capability: "payment-processing",
      command: "payment.verify",
      description: "Validate successful payment, check fraud flags, reconcile transaction ID. Generate shipping label, pack items, handover to logistics partner. (EOS 6-stage phase 3: execute)",
      requiredRoles: ["finance-team", "system", "fulfillment-associate", "warehouse-manager"]
    },
    {
      id: "progress",
      label: "Order Shipped (Progress)",
      capability: "observability",
      command: "observability.monitor",
      description: "Tracking number synced to marketplace, monitor real-time delivery status, customer notified of shipment. (EOS 6-stage phase 4: progress)",
      requiredRoles: ["system", "logistics-coordinator"]
    },
    {
      id: "evidence",
      label: "Reconciliation Complete (Evidence)",
      capability: "governance-evidence",
      command: "evidence.record",
      description: "Reconcile payment, logistics cost, inventory adjustment, and marketplace fees. Revenue tracked in governance-evidence with full transaction chain. (EOS 6-stage phase 5: evidence)",
      requiredRoles: ["finance-team", "ecommerce-manager"]
    },
    {
      id: "complete",
      label: "Order Finalized (Complete)",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Archive all order records, logs, and transaction evidence to close Work. Full evidence chain preserved for audit and compliance. (EOS 6-stage phase 6: complete - terminal)",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "discover→create": { from: "discover", to: "create", requiredRoles: ["system", "warehouse-manager"] },
    "create→execute": { from: "create", to: "execute", requiredRoles: ["system", "finance-team", "warehouse-manager"] },
    "execute→progress": { from: "execute", to: "progress", requiredRoles: ["system", "fulfillment-associate", "logistics-coordinator"] },
    "progress→evidence": { from: "progress", to: "evidence", requiredRoles: ["system", "finance-team", "ecommerce-manager"] },
    "evidence→complete": { from: "evidence", to: "complete", requiredRoles: ["system", "ecommerce-manager"] }
  } as const
};

// Validate workflow definition immediately on module load - core-kernel type guard compliance check
if (!isValidWorkflowDefinition(ECOMMERCE_OPS_WORKFLOW)) {
  throw new Error("[ECOMMERCE_OPS_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}
console.log("[ECOMMERCE_OPS_WORKFLOW] ✅ Workflow validated successfully against core-kernel specification");