import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export const ECOMMERCE_OPS_WORKFLOW: WorkflowDefinition = {
  id: "ecommerce-universal-execution",
  productId: "ecommerce-ops",
  label: "Order Received → Sync → Payment Verify → Inventory Check → Fulfill → Track → Reconcile → Close",
  initialStep: "order_received",
  terminalStep: "completed",
  steps: [
    {
      id: "order_received",
      label: "Order Received",
      capability: "connector-ecosystem",
      command: "connector.ingest",
      description: "External order imported from marketplace (Shopee/Lazada/Tokopedia) as canonical Work.",
      requiredRoles: ["system", "ecommerce-manager"]
    },
    {
      id: "payment_verify",
      label: "Payment Verification",
      capability: "payment-processing",
      command: "payment.verify",
      description: "Validate successful payment, check fraud flags, reconcile transaction ID.",
      requiredRoles: ["finance-team", "system"]
    },
    {
      id: "discrepancy_investigate",
      label: "Investigasi Ketidaksesuaian Stok",
      capability: "work-inspection",
      command: "inspection.execute",
      description: "Cek root cause ketidaksesuaian stok, verifikasi data platform",
      requiredRoles: ["ecommerce-manager", "warehouse-manager"]
    },
    {
      id: "inventory_check",
      label: "Inventory Validation",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Verify stock availability, reserve SKU for fulfillment, trigger restock if needed.",
      requiredRoles: ["warehouse-manager", "system"]
    },
    {
      id: "fulfill",
      label: "Order Fulfillment",
      capability: "requirement-management",
      command: "requirement.resolve",
      description: "Generate shipping label, pack items, handover to logistics partner.",
      requiredRoles: ["fulfillment-associate", "system"]
    },
    {
      id: "track",
      label: "Shipment Tracking",
      capability: "observability",
      command: "observability.monitor",
      description: "Track shipment real-time, sync delivery status back to marketplace.",
      requiredRoles: ["system", "logistics-coordinator"]
    },
    {
      id: "reconcile",
      label: "Post-Delivery Reconciliation",
      capability: "governance-approval",
      command: "approval.confirm",
      description: "Reconcile payment, logistics cost, inventory adjustment, and marketplace fees.",
      requiredRoles: ["finance-team", "ecommerce-manager"]
    },
    {
      id: "completed",
      label: "Order Closed",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Archive all order records, logs, and transaction evidence to close Work.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "order_received→payment_verify": { from: "order_received", to: "payment_verify", requiredRoles: ["system", "finance-team"] },
    "payment_verify→discrepancy_investigate": { from: "payment_verify", to: "discrepancy_investigate", requiredRoles: ["system", "ecommerce-manager"] },
    "discrepancy_investigate→inventory_check": { from: "discrepancy_investigate", to: "inventory_check", requiredRoles: ["ecommerce-manager", "warehouse-manager"] },
    "inventory_check→fulfill": { from: "inventory_check", to: "fulfill", requiredRoles: ["system", "fulfillment-associate"] },
    "fulfill→track": { from: "fulfill", to: "track", requiredRoles: ["system", "logistics-coordinator"] },
    "track→reconcile": { from: "track", to: "reconcile", requiredRoles: ["finance-team", "ecommerce-manager"] },
    "reconcile→completed": { from: "reconcile", to: "completed", requiredRoles: ["system"] }
  } as const
};