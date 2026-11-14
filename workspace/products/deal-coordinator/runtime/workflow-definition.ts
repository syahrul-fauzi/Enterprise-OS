// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";
import { isValidWorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";

// CROSS-INDUSTRY-001: Spesialisasi workflow untuk transaksi Sengketa Kontrak Supplier Marketplace
// ecommerce-ops (PT Retail Indonesia) ↔ lawyershub (Firma Hukum Indonesia) - Minimum implementation sesuai user mandate
export const DEALCOORDINATOR_CROSSINDUSTRY_001_WORKFLOW: WorkflowDefinition = {
  id: "dealcoordinator-crossindustry-001",
  productId: "deal-coordinator",
  // ① Identity Boundary (core-kernel mandatory field) - spesifik untuk cross-org transaction
  identityBoundary: {
    tenantId: "tenant-crossindustry-001",
    organizationId: "org-multitenant-ecommerce-legal",
    authorizedActors: ["system", "ecommerce-merchant", "legal-counsel", "finance-admin", "dispute-coordinator"]
  },
  // ② Semantic Boundary - spesifik masalah bisnis CROSS-INDUSTRY-001
  semanticBoundary: {
    domain: "cross-industry-commercial-coordination",
    primaryIntent: "Koordinasi sengketa kontrak supplier marketplace dari ecommerce-ops ke firma hukum dengan sinkronisasi hukum dan operasional",
    workType: "contract-dispute-resolution-workflow",
    requirements: ["legal-case-creation", "contract-verification", "multi-party-approval", "cost-attribution", "dispute-resolution", "evidence-preservation", "cross-org-agreement.execute", "payment-reconciliation.execute"]
  },
  // ③ Authority Boundary - capabilites minimum yang dibutuhkan
  authorityBoundary: {
    requiredCapabilities: ["connector-ecosystem.ingest", "work-formation.create", "governance-approval.approve", "budget-management.allocate", "workflow-engine.transition", "reconciliation.execute", "cross-org-agreement.execute", "payment-reconciliation.execute", "governance-evidence.archive"],
    policyIds: ["cross-org-agreement-governance-policy", "legal-evidence-integrity-policy", "financial-reconciliation-audit-policy"],
    delegable: false,
    approvalThreshold: 2 // Membutuhkan approval dari ecommerce dan legal
  },
  // ④ Execution Boundary
  executionBoundary: {
    workspaceId: "workspace-deal-coordinator.crossindustry-001",
    runtimeEnvironment: "production",
    assignedActors: ["system", "ecommerce-merchant", "legal-counsel", "finance-admin", "dispute-coordinator"],
    externalSystemIds: ["ecommerce-ops-order-system", "lawyershub-case-management", "shared-billing-platform"],
    executionFrame: "constrained-gui"
  },
  // ⑤ Presentation Boundary
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "deal-coordinator-crossindustry-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // Referensi Work Graph
  productRef: "product-deal-coordinator-001",
  caseRef: "case-crossindustry-001-contract-dispute",
  label: "Dispute Ingested → Cross-Org Agreement Created → Legal Case Opened → Usage Tracked → Cost Attributed → Resolution Implemented → Payment Reconciled → Completed",
  initialStep: "dispute_ingested",
  terminalStep: "completed",
  steps: [
    {
      id: "dispute_ingested",
      label: "Sengketa Kontrak Diterima",
      capability: "connector-ecosystem",
      command: "connector.ingest",
      description: "Data sengketa kontrak supplier dari ecommerce-ops (CTR-20261106-00001) diimpor sebagai canonical Work - CROSS-INDUSTRY-001 mulai",
      requiredRoles: ["system", "ecommerce-merchant"]
    },
    {
      id: "agreement_created",
      label: "Kesepakatan Antarorganisasi Dibuat",
      capability: "cross-org-agreement",
      command: "agreement.execute",
      description: "Kesepakatan kerjasama penanganan sengketa antara PT Retail Indonesia dan Firma Hukum Indonesia dibuat di knowledge graph",
      requiredRoles: ["system", "dispute-coordinator"]
    },
    {
      id: "legal_case_opened",
      label: "Kasus Hukum Dibuka di LawyersHub",
      capability: "work-formation",
      command: "work.create",
      description: "Synchronisasi data sengketa ke lawyershub - knowledge graph hyper-edge menghubungkan kedua organisasi",
      requiredRoles: ["system", "legal-counsel"]
    },
    {
      id: "usage_tracked",
      label: "Penggunaan Layanan Hukum Terlacak",
      capability: "legal-service-metering",
      command: "metering.track",
      description: "Penggunaan layanan hukum (consultation, document review, court representation) dicatat di value-metering",
      requiredRoles: ["system", "legal-counsel"]
    },
    {
      id: "cost_attributed",
      label: "Biaya Layanan Diatribusikan",
      capability: "cost-attribution",
      command: "attribution.assign",
      description: "Total biaya layanan hukum (Rp15.000.000) diatribusikan ke tenant ecommerce-ops sesuai kesepakatan",
      requiredRoles: ["finance-admin", "legal-officer"]
    },
    {
      id: "resolution_implemented",
      label: "Resolusi Sengketa Dijalankan",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Kesepakatan penyelesaian kontrak diproses, sengketa supplier di ecommerce-ops ditandai selesai",
      requiredRoles: ["ecommerce-merchant", "legal-counsel"]
    },
    {
      id: "payment_reconciled",
      label: "Rekonsiliasi Pembayaran Selesai",
      capability: "payment-reconciliation",
      command: "reconciliation.execute",
      description: "Pembayaran biaya hukum dikonfirmasi, invoice reference dicocokkan antara kedua organisasi",
      requiredRoles: ["finance-admin", "account-manager"]
    },
    {
      id: "completed",
      label: "Sengketa Kontrak Selesai",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Semua bukti transaksi CROSS-INDUSTRY-001 terarsipkan, Work ditandai selesai dengan audit trail lengkap",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "dispute_ingested→agreement_created": { from: "dispute_ingested", to: "agreement_created", requiredRoles: ["system", "dispute-coordinator"] },
    "agreement_created→legal_case_opened": { from: "agreement_created", to: "legal_case_opened", requiredRoles: ["system", "legal-counsel"] },
    "legal_case_opened→usage_tracked": { from: "legal_case_opened", to: "usage_tracked", requiredRoles: ["system", "legal-counsel"] },
    "usage_tracked→cost_attributed": { from: "usage_tracked", to: "cost_attributed", requiredRoles: ["finance-admin"] },
    "cost_attributed→resolution_implemented": { from: "cost_attributed", to: "resolution_implemented", requiredRoles: ["ecommerce-merchant", "legal-counsel"] },
    "resolution_implemented→payment_reconciled": { from: "resolution_implemented", to: "payment_reconciled", requiredRoles: ["finance-admin"] },
    "payment_reconciled→completed": { from: "payment_reconciled", to: "completed", requiredRoles: ["system"] }
  } as const
};

// Validasi sesuai core-kernel spesifikasi
if (!isValidWorkflowDefinition(DEALCOORDINATOR_CROSSINDUSTRY_001_WORKFLOW)) {
  throw new Error("[DEALCOORDINATOR_CROSSINDUSTRY_001_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}

console.log("[DEALCOORDINATOR_CROSSINDUSTRY_001_WORKFLOW] ✅ Workflow for CROSS-INDUSTRY-001 (Sengketa Kontrak Supplier) validated successfully");