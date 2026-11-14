// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";
import { isValidWorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";

// CROSS-INDUSTRY-001: Spesialisasi workflow value-metering untuk sengketa kontrak supplier marketplace
// Mengukur dan mengatribusikan semua biaya layanan hukum yang terkait dengan transaksi ecommerce-ops ↔ lawyershub
export const VALUEMETERING_CROSSINDUSTRY_001_WORKFLOW: WorkflowDefinition = {
  id: "valuemetering-crossindustry-001",
  productId: "value-metering",
  // ① Identity Boundary - sama dengan deal-coordinator untuk konteks terpadu
  identityBoundary: {
    tenantId: "tenant-crossindustry-001",
    organizationId: "org-multitenant-ecommerce-legal",
    authorizedActors: ["system", "finance-admin", "cost-analyst", "ecommerce-merchant", "legal-counsel"]
  },
  // ② Semantic Boundary - fokus pada pengukuran biaya layanan hukum untuk sengketa kontrak
  semanticBoundary: {
    domain: "cross-industry-value-measurement",
    primaryIntent: "Mengukur dan mengatribusikan semua biaya layanan hukum yang terkait dengan sengketa kontrak supplier marketplace ke Work dan organisasi yang bertanggung jawab",
    workType: "legal-service-cost-attribution-workflow",
    requirements: ["legal-service-metering", "usage-measurement", "cross-org-cost-attribution", "margin-calculation", "invoice-evidence", "financial-reporting", "payment-reconciliation"]
  },
  // ③ Authority Boundary - capabilites minimum untuk value metering (tambahkan legal-service-metering)
  authorityBoundary: {
    requiredCapabilities: ["requirement-management.create", "work-formation.configure", "governance-approval.request", "data-processing.execute", "observability.monitor", "governance-evidence.archive", "legal-service-metering.execute", "work.complete"],
    policyIds: ["cost-attribution-governance-policy", "financial-transparency-policy", "invoice-audit-integrity-policy", "legal-service-metering-policy"],
    delegable: false,
    approvalThreshold: 1
  },
  // ④ Execution Boundary
  executionBoundary: {
    workspaceId: "workspace-value-metering.crossindustry-001",
    runtimeEnvironment: "production",
    assignedActors: ["system", "finance-admin", "cost-analyst"],
    externalSystemIds: ["ecommerce-ops-finance-system", "lawyershub-billing-system", "shared-billing-platform", "cloud-infrastructure-metering"],
    executionFrame: "constrained-gui"
  },
  // ⑤ Presentation Boundary
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "value-metering-crossindustry-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // Referensi Work Graph
  productRef: "product-value-metering-001",
  caseRef: "case-crossindustry-001-contract-dispute",
  label: "Dispute Identified → Legal Metering Plan Created → Usage Tracked → Costs Attributed → Metrics Validated → Evidence Archived → Payment Reconciled → Completed",
  initialStep: "dispute_identified",
  terminalStep: "completed",
  steps: [
    {
      id: "dispute_identified",
      label: "Sengketa Kontrak Teridentifikasi",
      capability: "requirement-management",
      command: "requirement.create",
      description: "Identifikasi semua biaya yang terkait dengan CROSS-INDUSTRY-001: biaya layanan hukum, biaya operasional, potensi kerugian sengketa",
      requiredRoles: ["cost-analyst", "finance-admin"]
    },
    {
      id: "metering_plan_created",
      label: "Rencana Legal Metering Dibuat",
      capability: "work-formation",
      command: "work.configure",
      description: "Setup rencana pengukuran penggunaan layanan hukum dan atribusi biaya ke Work ID CROSS-INDUSTRY-001",
      requiredRoles: ["finops-lead", "system"]
    },
    {
      id: "legal_usage_tracked",
      label: "Penggunaan Layanan Hukum Terlacak",
      capability: "legal-service-metering",
      command: "metering.execute",
      description: "Lacak semua jam kerja pengacara, dokumen legal yang diproduksi, dan layanan hukum yang digunakan selama penanganan sengketa",
      requiredRoles: ["system", "legal-counsel"]
    },
    {
      id: "costs_attributed",
      label: "Biaya Teratribusikan ke Organisasi",
      capability: "cost-attribution",
      command: "attribution.execute",
      description: "Atribusikan total biaya layanan hukum ke tenant ecommerce-ops sesuai kesepakatan antarorganisasi",
      requiredRoles: ["finance-admin", "cost-analyst"]
    },
    {
      id: "metrics_validated",
      label: "Metrik Biaya Divalidasi",
      capability: "governance-approval",
      command: "approval.request",
      description: "Validasi semua perhitungan biaya, entitlement resources, dan integritas data sumber",
      requiredRoles: ["finance-auditor", "data-quality-officer"]
    },
    {
      id: "evidence_archived",
      label: "Bukti Biaya Tersimpan",
      capability: "governance-evidence",
      command: "evidence.archive",
      description: "Arsipkan semua bukti biaya untuk invoice, audit, dan rekonsiliasi keuangan",
      requiredRoles: ["system", "finance-admin"]
    },
    {
      id: "payment_reconciled",
      label: "Pembayaran Terekonsiliasi",
      capability: "payment-reconciliation",
      command: "reconciliation.execute",
      description: "Selesaikan rekonsiliasi pembayaran antara invoice lawyershub dan bukti pembayaran ecommerce-ops",
      requiredRoles: ["finance-admin", "system"]
    },
    {
      id: "completed",
      label: "Pelaporan Biaya Selesai",
      capability: "governance-evidence",
      command: "work.complete",
      description: "Laporan biaya CROSS-INDUSTRY-001 selesai, semua data terarsipkan dan Work ditandai selesai",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "dispute_identified→metering_plan_created": { from: "dispute_identified", to: "metering_plan_created", requiredRoles: ["finops-lead"] },
    "metering_plan_created→legal_usage_tracked": { from: "metering_plan_created", to: "legal_usage_tracked", requiredRoles: ["system", "legal-counsel"] },
    "legal_usage_tracked→costs_attributed": { from: "legal_usage_tracked", to: "costs_attributed", requiredRoles: ["cost-analyst", "finance-admin"] },
    "costs_attributed→metrics_validated": { from: "costs_attributed", to: "metrics_validated", requiredRoles: ["finance-auditor"] },
    "metrics_validated→evidence_archived": { from: "metrics_validated", to: "evidence_archived", requiredRoles: ["finance-admin", "system"] },
    "evidence_archived→payment_reconciled": { from: "evidence_archived", to: "payment_reconciled", requiredRoles: ["finance-admin"] },
    "payment_reconciled→completed": { from: "payment_reconciled", to: "completed", requiredRoles: ["system"] }
  } as const
};

// Validasi sesuai core-kernel spesifikasi
if (!isValidWorkflowDefinition(VALUEMETERING_CROSSINDUSTRY_001_WORKFLOW)) {
  throw new Error("[VALUEMETERING_CROSSINDUSTRY_001_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}

console.log("[VALUEMETERING_CROSSINDUSTRY_001_WORKFLOW] ✅ Workflow for CROSS-INDUSTRY-001 (Sengketa Kontrak Supplier Marketplace) validated successfully");