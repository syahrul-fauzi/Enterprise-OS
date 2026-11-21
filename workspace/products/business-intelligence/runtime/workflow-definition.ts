// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";
import { isValidWorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";

export const BUSINESS_INTELLIGENCE_WORKFLOW: WorkflowDefinition = {
  id: "business-intelligence-universal-execution",
  productId: "business-intelligence",
  identityBoundary: {
    tenantId: "tenant-business-intelligence-001",
    organizationId: "org-business-domain-001",
    authorizedActors: ["system", "bi-analyst", "business-owner", "strategy-agent", "evidence-registry"]
  },
  semanticBoundary: {
    domain: "business-intelligence",
    primaryIntent: "Execute end-to-end business intelligence workflow for any business type (UMKM, retail, e-commerce) with full evidence chain",
    workType: "business-intelligence-workflow",
    requirements: ["data-onboarding", "context-analysis", "insight-generation", "recommendation-creation", "evidence-preservation"]
  },
  authorityBoundary: {
    requiredCapabilities: ["state-intelligence.observe", "observability.monitor", "evidence-registry.record", "strategy-agent.analyze", "governance-approval.confirm"],
    policyIds: ["business-intelligence-governance-policy", "evidence-chain-integrity-policy", "decision-authorization-policy"],
    delegable: false,
    approvalThreshold: 1
  },
  executionBoundary: {
    workspaceId: "workspace-business-intelligence.anonymous",
    runtimeEnvironment: "production",
    assignedActors: ["system", "bi-analyst", "business-owner", "strategy-agent", "evidence-registry"],
    externalSystemIds: ["market-intelligence-api", "industry-trends-connector", "competitor-analysis-service"],
    executionFrame: "constrained-gui"
  },
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "business-intelligence-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  productRef: "product-business-intelligence-001",
  caseRef: "case-business-intelligence-template",
  label: "Onboard → Assess → Activate → Analyze → Recommend → Learn",
  initialStep: "onboard",
  terminalStep: "learn",
  steps: [
    {
      id: "onboard",
      label: "Data Onboard (Onboard)",
      capability: "state-intelligence",
      command: "intelligence.observe",
      description: "Onboard business data from client (UMKM, retail, e-commerce) including sales, inventory, customer, and market data. (EOS 6-stage phase 1: onboard)",
      requiredRoles: ["system", "bi-analyst"]
    },
    {
      id: "assess",
      label: "Business Assessment (Assess)",
      capability: "observability",
      command: "observability.monitor",
      description: "Analyze current business condition, sales performance, and market position. Generate initial business context model. (EOS 6-stage phase 2: assess)",
      requiredRoles: ["system", "bi-analyst", "business-owner"]
    },
    {
      id: "activate",
      label: "Intelligence Activate (Activate)",
      capability: "state-intelligence",
      command: "intelligence.remember",
      description: "Activate intelligence capabilities to generate initial business insights. Connect to existing State Intelligence Substrate. (EOS 6-stage phase 3: activate)",
      requiredRoles: ["system", "strategy-agent"]
    },
    {
      id: "analyze",
      label: "Deep Analysis (Analyze)",
      capability: "strategy-agent",
      command: "strategy.analyze",
      description: "Deep analysis of market opportunities, sales trends, and improvement areas. Generate strategic scenarios. (EOS 6-stage phase 4: analyze)",
      requiredRoles: ["system", "strategy-agent", "bi-analyst"]
    },
    {
      id: "recommend",
      label: "Recommendation (Recommend)",
      capability: "state-intelligence",
      command: "intelligence.recommend",
      description: "Generate actionable strategic recommendations and decision proposals. Record all evidence to Evidence Registry. (EOS 6-stage phase 5: recommend)",
      requiredRoles: ["system", "business-owner", "governance-approval"]
    },
    {
      id: "learn",
      label: "Business Learning (Learn)",
      capability: "evidence-registry",
      command: "evidence.record",
      description: "Record implementation results of recommendations and update intelligence model for next iteration. Preserve full evidence chain. (EOS 6-stage phase 6: learn - terminal)",
      requiredRoles: ["system", "evidence-registry"]
    }
  ] as const,
  transitions: {
    "onboard→assess": { from: "onboard", to: "assess", requiredRoles: ["system", "bi-analyst"] },
    "assess→activate": { from: "assess", to: "activate", requiredRoles: ["system", "strategy-agent"] },
    "activate→analyze": { from: "activate", to: "analyze", requiredRoles: ["system", "strategy-agent", "bi-analyst"] },
    "analyze→recommend": { from: "analyze", to: "recommend", requiredRoles: ["system", "business-owner"] },
    "recommend→learn": { from: "recommend", to: "learn", requiredRoles: ["system", "evidence-registry"] }
  } as const
};

if (!isValidWorkflowDefinition(BUSINESS_INTELLIGENCE_WORKFLOW)) {
  throw new Error("[BUSINESS_INTELLIGENCE_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}
console.log("[BUSINESS_INTELLIGENCE_WORKFLOW] ✅ Workflow validated successfully against core-kernel specification");