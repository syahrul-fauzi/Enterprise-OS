// @ts-nocheck
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";
import { isValidWorkflowDefinition } from "@repo/core-kernel/registry/capability-command-registry";

export const SERVICESID_BUSINESS_WORKFLOW: WorkflowDefinition = {
  id: "services-id-business-fulfillment",
  productId: "services-id",
  // 5 BOUNDARY MAPPINGS (mandat EOS High-Value Work - aligned with core-kernel definition)
  tenantId: "tenant-services-id-001",        // ① Identity Boundary: Tenant ownership
  domain: "marketplace-services",           // ② Semantic Boundary: Domain classification (aligned with Services.ID JTBD)
  executionFrame: "constrained-gui",         // ④ Execution Boundary: CMBCD mechanism
  presentationConfig: {                       // ⑤ Presentation Boundary: FACE projection
    supportedFaces: ["human", "agent", "api", "web"],
    defaultLayout: "service-portal-dashboard"
  },
  // High-Value Work Graph Semantic References
  productRef: "product-services-id-001",     // Product node reference
  caseRef: "case-business-registration-template", // Case template reference
  label: "Services.ID 6-Stage Marketplace Lifecycle: discover→create→execute→progress→evidence→complete",
  initialStep: "draft",
  terminalStep: "archived",
  steps: [
    {
      id: "draft",
      label: "Service Request Draft (Discover)",
      capability: "service-directory",
      command: "request.create",
      description: "Submit business service request, anchor Work identity - discover stage complete.",
      requiredRoles: ["customer", "agent"]
    },
    {
      id: "processing",
      label: "Document Preparation (Create)",
      capability: "legal-document",
      command: "document.create",
      description: "Prepare all required business registration and compliance documents - create stage active.",
      requiredRoles: ["processor", "notary"]
    },
    {
      id: "shipped",
      label: "Compliance Submitted (Execute)",
      capability: "governance-approval",
      command: "approval.request",
      description: "Verify customer identity, KYC, and submit for compliance review - execute stage active.",
      requiredRoles: ["compliance-officer"]
    },
    {
      id: "delivered",
      label: "Service Delivery Complete (Progress)",
      capability: "legal-case",
      description: "Receive OSS/institution response, pass system inspection - progress stage complete.",
      requiredRoles: ["processor", "agent", "system"]
    },
    {
      id: "completed",
      label: "Evidence Chain Finalized (Evidence)",
      capability: "governance-evidence",
      command: "evidence.record",
      description: "Record all commercial evidence, payment confirmation, and customer approval - evidence stage complete.",
      requiredRoles: ["system", "finance"]
    },
    {
      id: "archived",
      label: "Service Archived (Complete)",
      capability: "legal-case",
      description: "Business service fully delivered, archived with complete immutable evidence chain - 6-stage lifecycle complete.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    // 5 MANDATORY TRANSITIONS FOR 6-STAGE LIFECYCLE (PORTSID-001 REQUIREMENT)
    "draft→processing": { from: "draft", to: "processing", requiredRoles: ["agent", "processor"] },
    "processing→shipped": { from: "processing", to: "shipped", requiredRoles: ["compliance-officer", "system"] },
    "shipped→delivered": { from: "shipped", to: "delivered", requiredRoles: ["processor", "agent", "system"] },
    "delivered→completed": { from: "delivered", to: "completed", requiredRoles: ["system", "finance", "customer"] },
    "completed→archived": { from: "completed", to: "archived", requiredRoles: ["system"] }
  } as const
};

// Core-kernel validation (reused from LawyersHub pattern - no duplicate work)
if (!isValidWorkflowDefinition(SERVICESID_BUSINESS_WORKFLOW)) {
  throw new Error("[SERVICESID_BUSINESS_WORKFLOW] Invalid workflow definition - fails core-kernel isValidWorkflowDefinition check");
}
console.log("[SERVICESID_BUSINESS_WORKFLOW] ✅ Workflow validated successfully against core-kernel specification (6-stage marketplace lifecycle active)");

// Domain-specific type alias for type safety (updated to match new workflow step IDs)
export type ServicesIDWorkflowStepId = "draft" | "processing" | "shipped" | "delivered" | "completed" | "archived";