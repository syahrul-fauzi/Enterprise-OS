// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { isValidWorkflowDefinition } from "../../../packages/core/kernel/src/registry/capability-command-registry.js";

export const DIGITAL_OPS_BUSINESS_WORKFLOW: WorkflowDefinition = {
  id: "digital-operations-universal-execution",
  productId: "digital-operations",
  label: "Onboard → Assess → Activate → Operate → Report → Renew → Operate",
  initialStep: "onboard",
  terminalStep: "non-terminal-cycle", // Siklus tak terbatas untuk subscription berulang (renew→operate) - sesuai P0 Work Continuity
  // core-kernel execution logic recognizes "non-terminal-cycle" sebagai indikator workflow siklikal yang tidak memiliki terminal state
  // ① Identity Boundary (core-kernel mandatory field - P1 requirement)
  identityBoundary: {
    tenantId: "tenant-digital-ops-001",
    organizationId: "org-digital-ops-enterprise",
    authorizedActors: ["system", "customer-success", "devops-engineer", "sre", "billing-contact", "site-owner"]
  },
  // ② Semantic Boundary (core-kernel mandatory field - P1 requirement)
  semanticBoundary: {
    domain: "digital-operations",
    primaryIntent: "Manage end-to-end managed digital operations for WordPress/ecommerce clients with continuous monitoring and renewal",
    workType: "managed-digital-services-workflow",
    requirements: ["subscription-billing", "infrastructure-monitoring", "incident-resolution", "monthly-reporting", "renewal-management"]
  },
  // ③ Authority Boundary (core-kernel mandatory field - P1 requirement)
  authorityBoundary: {
    requiredCapabilities: ["customer.onboard", "assessment.run", "monitoring.enable", "operation.execute", "report.generate", "subscription.renew"],
    policyIds: ["digital-ops-governance-policy", "work-continuity-preservation-policy"],
    delegable: true,
    approvalThreshold: 1
  },
  // ④ Execution Boundary (core-kernel mandatory field - P1 requirement)
  executionBoundary: {
    workspaceId: "workspace-digital-ops.anonymous",
    runtimeEnvironment: "production",
    assignedActors: ["system", "customer-success", "devops-engineer", "sre"],
    externalSystemIds: ["cloud-monitoring-connector", "billing-gateway", "incident-management-platform"],
    executionFrame: "constrained-gui"
  },
  // ⑤ Presentation Boundary (core-kernel mandatory field - P1 requirement)
  // EOS-360-002: Menambahkan "mcp" ke supportedFaces untuk mengaktifkan MCP server access
  // Memenuhi invariant EOS-360-001: Product headless - dapat diakses tanpa bergantung pada FACE tertentu
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api", "mcp"],
    defaultLayout: "digital-ops-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  // High-Value Work Graph Semantic References
  productRef: "product-digital-operations-001",
  caseRef: "managed-digital-services-template",
  steps: [
    {
      id: "onboard",
      label: "Customer Onboarding",
      capability: "atomic-composition",
      command: "customer.subscribe",
      description: "Pelanggan mendaftar langganan dan menghubungkan platform mereka.",
      requiredRoles: ["site-owner", "billing-contact"]
    },
    {
      id: "assess",
      label: "Infrastructure Assessment",
      capability: "agent-orchestration",
      command: "assessment.run",
      description: "Tim CS + AI melakukan audit infrastruktur dan operasional pelanggan.",
      requiredRoles: ["customer-success", "devops-engineer"]
    },
    {
      id: "activate",
      label: "Service Activation",
      capability: "observability",
      command: "monitoring.enable",
      description: "Monitoring uptime, performance, dan error diaktifkan untuk semua platform.",
      requiredRoles: ["sre", "customer-success"]
    },
    {
      id: "operate",
      label: "Continuous Operations",
      capability: "incident-management",
      command: "operation.execute",
      description: "Pekerjaan operasional berjalan: update, fix insiden, scaling, backup bulanan.",
      requiredRoles: ["devops", "digital-ops-engineer", "ai-agent"]
    },
    {
      id: "report",
      label: "Monthly Report",
      capability: "governance-evidence",
      command: "report.generate",
      description: "Laporan bulanan: uptime, insiden yang diselesaikan, biaya yang dihemat, rekomendasi.",
      requiredRoles: ["customer-success", "finance"]
    },
    {
      id: "renew",
      label: "Subscription Renewal",
      capability: "subscription-management",
      command: "subscription.renew",
      description: "Langganan diperpanjang, diupgrade, atau diakhiri dengan offboarding teratur.",
      requiredRoles: ["billing-contact", "site-owner"]
    }
  ] as const,
  transitions: {
    "onboard→assess": { from: "onboard", to: "assess", requiredRoles: ["customer-success"] },
    "assess→activate": { from: "assess", to: "activate", requiredRoles: ["devops-engineer"] },
    "activate→operate": { from: "activate", to: "operate", requiredRoles: ["sre"] },
    "operate→report": { from: "operate", to: "report", requiredRoles: ["customer-success"] },
    "report→renew": { from: "report", to: "renew", requiredRoles: ["billing-contact"] },
    "renew→operate": { from: "renew", to: "operate", requiredRoles: ["system"] }
  } as const
};

// Pindahkan recurring logic ke dalam authorityBoundary.requiredCapabilities (sesuai interface)
// recurringTrigger bukan bagian dari WorkflowDefinition interface core-kernel v1.0.0
// Subscription cycle diimplementasikan melalui capability subscription-management yang sudah terdaftar

// Core-kernel validation (reused from ecommerce-ops pattern)
if (!isValidWorkflowDefinition(DIGITAL_OPS_BUSINESS_WORKFLOW)) {
  throw new Error("[DIGITAL_OPS_BUSINESS_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}
console.log("[DIGITAL_OPS_BUSINESS_WORKFLOW] ✅ Workflow validated successfully against core-kernel specification (managed digital operations lifecycle active)");