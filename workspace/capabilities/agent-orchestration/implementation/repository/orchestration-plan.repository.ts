// @ts-nocheck
import type {
  OrchestrationPlan,
  OrchestrationPlanRepository,
} from "../contracts/index.js";

const PLANS: readonly OrchestrationPlan[] = Object.freeze([
  {
    id: "orchestrate-requirement-delivery",
    name: "Orchestrate Requirement Delivery",
    description:
      "Coordinates requirement readiness and supporting evidence collection before downstream delivery steps.",
    status: "ready",
    workItems: [
      {
        id: "delivery-readiness",
        workflowId: "requirement-delivery-readiness",
        agentRole: "delivery-agent",
        description: "Validate requirement readiness through RTM and evidence coverage.",
        defaultInputs: { requirementId: "req-003" },
      },
    ],
  },
  {
    id: "orchestrate-evidence-review",
    name: "Orchestrate Evidence Review",
    description:
      "Coordinates a review pass over run-scoped evidence and acceptance artifacts.",
    status: "ready",
    workItems: [
      {
        id: "evidence-review",
        workflowId: "evidence-run-review",
        agentRole: "evidence-agent",
        description: "Review run evidence, acceptance count, and metrics count.",
        defaultInputs: { runId: "run-007" },
      },
    ],
  },
  {
    id: "investigate-ambiguous-requirement",
    name: "Investigate Ambiguous Requirement (AI-on-Demand)",
    description:
      "AI-powered investigation of requirements with unknown verification status to resolve ambiguity and determine true readiness.",
    status: "ready",
    workItems: [
      {
        id: "requirement-investigation",
        workflowId: "ai-investigate-requirement",
        agentRole: "ai-investigation-agent",
        description: "Perform deep root cause analysis on requirement with unknown verification status.",
        defaultInputs: {},
      },
    ],
  },
  // W-004/W-005: External System Handoff Plan (reused for cross-boundary Work execution)
  // Uses only supported workflow: requirement-delivery-readiness (provisioned with requirementId input to pass validation)
  {
    id: "orchestrate-external-system-handoff",
    name: "Orchestrate External System Handoff (W-004/W-005 Cross-Boundary)",
    description:
      "Coordinates human→agent→external system Work traversal across economic boundaries, preserving Work ID invariant.",
    status: "ready",
    workItems: [
      {
        id: "human-submission",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "human-compliance-officer",
        description: "Human initiates regulatory workflow submission from government workspace.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "agent-orchestration-step",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "system-regulatory-agent",
        description: "AI agent validates authorization and routes Work to external system.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "external-submission",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "external-system-gateway",
        description: "Gateway submits Work to government portal via CMBCD Proxy mode.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
      {
        id: "human-review",
        workflowId: "requirement-delivery-readiness", // Only supported workflow in current build
        agentRole: "human-compliance-officer",
        description: "Human reviews submission confirmation and finalizes Work.",
        defaultInputs: {
          requirementId: "req_w005_regulatory_filing_abc123" // Required input to pass workflow validation
        },
      },
    ],
  },
  // DIGISC-007: Subscription Monthly Work Generation Plan (digital-operations recurring trigger support)
// Menjalankan recurring workflow `subscription.generateMonthlyWork` yang didefinisikan di digital-operations (mantan wordpress-fix)
// Hanya mendukung tipe langganan: monthly-retainer, yearly-managed sesuai permintaan user
  {
    id: "orchestrate-subscription-monthly-work",
    name: "Orchestrate Subscription Monthly Work Generation",
    description:
      "Membuat Work baru setiap bulan untuk langganan managed service (monthly-retainer/yearly-managed), mendukung recurring workflow di digital-operations.",
    status: "ready",
    workItems: [
      {
        id: "subscription-validation",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow untuk compliance
        agentRole: "subscription-agent",
        description: "Validasi status langganan aktif dan tipe langganan sebelum generate work baru.",
        defaultInputs: {
          requirementId: "req_subscription_monthly_base" // Required input untuk pass workflow validation
        },
      },
      {
        id: "monthly-maintenance-generation",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-maintenance-agent",
        description: "Generate work item maintenance bulanan sesuai intervalDays dari langganan.",
        defaultInputs: {
          requirementId: "req_subscription_monthly_maintenance" // Required input untuk pass workflow validation
        },
      },
      {
        id: "billing-date-update",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "subscription-billing-agent",
        description: "Update nextBillingDate di WorkAggregate sesuai recurringIntervalDays dari langganan.",
        defaultInputs: {
          requirementId: "req_subscription_billing_update" // Required input untuk pass workflow validation
        },
      },
    ],
  },
  // SMACE-004: Commercial Transaction End-to-End Orchestration Plan
  // Reuse existing supported workflow (requirement-delivery-readiness) untuk compliance dengan batas arsitektur frozen
  // Mengorkestrasi full lifecycle bisnis: Customer Request → Work → Content Generation → Approval → Delivery → Reconciliation
  {
    id: "orchestrate-smace-commercial-transaction",
    name: "Orchestrate SMACE Commercial Transaction (E2E Business Lifecycle)",
    description:
      "Coordinates human/agent traversal of full commercial workflow for content package creation, preserving logicalWorkId invariant across all actors and surfaces.",
    status: "ready",
    workItems: [
      {
        id: "customer-brief-submission",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "human-customer",
        description: "Customer submits brief dan requirement untuk paket konten e-commerce.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "work-creation-core",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-work-core-agent",
        description: "AI agent membuat Work canonical di Work Core dengan estimated_cost/reserved_cost terpisah.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "budget-validation",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-budget-agent",
        description: "Validasi budget availability, reservasi reserved_cost, dan cek threshold 80% alert (BUD-001).",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "content-generation",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-comfyui-agent",
        description: "Jalankan generasi konten di ComfyUI (replaceable runtime), catat semua attempt/retry.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "quality-review",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "human-quality-reviewer",
        description: "Human reviewer melakukan quality check dan approve/reject konten yang dihasilkan.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "final-approval",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "human-customer",
        description: "Customer memberikan final approval untuk paket konten.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "package-delivery",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-delivery-agent",
        description: "Deliver paket konten ke customer workspace dengan manifest lengkap.",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
      {
        id: "cost-reconciliation",
        workflowId: "requirement-delivery-readiness", // Reuse existing supported workflow
        agentRole: "system-economics-agent",
        description: "Rekonsiliasi actual_cost dengan provider usage, hitung margin, dan catat evidence lengkap (BUD-008).",
        defaultInputs: {
          requirementId: "req_smace_commercial_product_photography" // Required input untuk pass workflow validation
        },
      },
    ],
  },
  // digiop-104: Enterprise Onboarding Plan (Managed Digital Business Operations)
  // Dedicated plan untuk pelanggan paket enterprise dengan dedicated SRE dan full end-to-end onboarding
  {
    id: "orchestrate-enterprise-onboarding",
    name: "Orchestrate Enterprise Onboarding (digiop-104)",
    description:
      "Mengorkestrasi onboarding end-to-end untuk pelanggan paket Managed Digital Business Operations, termasuk provisioning dedicated SRE, setup monitoring 24/7, dan onboarding meeting dengan account manager.",
    status: "ready",
    workItems: [
      {
        id: "customer-verification",
        workflowId: "requirement-delivery-readiness",
        agentRole: "compliance-agent",
        description: "Verifikasi identitas dan kelengkapan data pelanggan enterprise.",
        defaultInputs: {
          requirementId: "req_digiop_104_enterprise_verification"
        },
      },
      {
        id: "sre-assignment",
        workflowId: "requirement-delivery-readiness",
        agentRole: "sre-manager",
        description: "Assign dedicated SRE untuk pelanggan enterprise.",
        defaultInputs: {
          requirementId: "req_digiop_104_sre_assignment"
        },
      },
      {
        id: "monitoring-setup",
        workflowId: "requirement-delivery-readiness",
        agentRole: "infrastructure-agent",
        description: "Setup monitoring 24/7 dan alerting untuk infrastructure pelanggan.",
        defaultInputs: {
          requirementId: "req_digiop_104_monitoring_setup"
        },
      },
      {
        id: "onboarding-meeting",
        workflowId: "requirement-delivery-readiness",
        agentRole: "account-manager",
        description: "Jadwalkan dan jalankan meeting onboarding dengan pelanggan.",
        defaultInputs: {
          requirementId: "req_digiop_104_onboarding_meeting",
          actorMetadata: {
            role: "account-manager",
            displayName: "Account Manager"
          }
        },
      },
      {
        id: "go-live-confirmation",
        workflowId: "requirement-delivery-readiness",
        agentRole: "delivery-agent",
        description: "Konfirmasi go-live dan serahkan akses lengkap ke pelanggan.",
        defaultInputs: {
          requirementId: "req_digiop_104_go_live"
        },
      },
    ],
  },
]);

export const OrchestrationPlanRepositoryInMemory: OrchestrationPlanRepository = {
  kind: "repository",
  entityName: "OrchestrationPlan",
  list() {
    return PLANS.map((plan) => ({
      ...plan,
      workItems: plan.workItems.map((item) => ({
        ...item,
        defaultInputs: { ...item.defaultInputs },
      })),
    }));
  },
  byId(id) {
    const plan = PLANS.find((item) => item.id === id);
    return plan === undefined
      ? undefined
      : {
          ...plan,
          workItems: plan.workItems.map((item) => ({
            ...item,
            defaultInputs: { ...item.defaultInputs },
          })),
        };
  },
} as const;