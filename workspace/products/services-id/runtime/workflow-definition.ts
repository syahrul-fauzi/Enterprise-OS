import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export const SERVICESID_BUSINESS_WORKFLOW: WorkflowDefinition = {
  id: "services-id-business-fulfillment",
  productId: "services-id",
  label: "Request → Document → Verification → External Response → Inspection → Review → Approval → Payment → Completed",
  initialStep: "request",
  terminalStep: "completed",
  steps: [
    {
      id: "request",
      label: "Service Request",
      capability: "service-directory",
      command: "request.create",
      description: "Submit business service request and anchor Work identity.",
      requiredRoles: ["customer", "agent"]
    },
    {
      id: "document",
      label: "Document Preparation",
      capability: "legal-document",
      command: "document.create",
      description: "Prepare all required business registration and compliance documents.",
      requiredRoles: ["processor", "notary"]
    },
    {
      id: "verification",
      label: "Compliance Verification",
      capability: "governance-approval",
      command: "approval.request",
      description: "Verify customer identity, KYC, and business compliance requirements.",
      requiredRoles: ["compliance-officer"]
    },
    {
      id: "external-response",
      label: "OSS/Institution Response",
      capability: "legal-case",
      description: "Wait for response from Online Single Submission (OSS) or related institutions.",
      requiredRoles: ["processor", "agent"]
    },
    {
      id: "inspection",
      label: "Service Inspection",
      capability: "legal-case",
      description: "System inspection: verify work identity, all documents, and external response validity.",
      requiredRoles: ["system"]
    },
    {
      id: "review",
      label: "Processor Review",
      capability: "legal-case",
      command: "case.markCompleted",
      description: "Service processor reviews external response and approves service fulfillment.",
      requiredRoles: ["senior-processor"]
    },
    {
      id: "approval",
      label: "Customer Approval",
      capability: "governance-approval",
      command: "approval.request",
      description: "Customer approves the business service delivery outcome.",
      requiredRoles: ["customer"]
    },
    {
      id: "payment",
      label: "Final Payment",
      capability: "legal-payment",
      command: "payment.initiate",
      description: "Process final payment for completed business service.",
      requiredRoles: ["customer", "finance"]
    },
    {
      id: "completed",
      label: "Service Completed",
      capability: "legal-case",
      description: "Business service is fully delivered, archived with complete evidence chain.",
      requiredRoles: ["system"]
    }
  ] as const,
  transitions: {
    "request→document": { from: "request", to: "document", requiredRoles: ["agent", "processor"] },
    "document→verification": { from: "document", to: "verification", requiredRoles: ["compliance-officer"] },
    "verification→external-response": { from: "verification", to: "external-response", requiredRoles: ["processor", "agent"] },
    "external-response→inspection": { from: "external-response", to: "inspection", requiredRoles: ["system"] },
    "inspection→review": { from: "inspection", to: "review", requiredRoles: ["senior-processor"] },
    "review→approval": { from: "review", to: "approval", requiredRoles: ["senior-processor"] },
    "approval→payment": { from: "approval", to: "payment", requiredRoles: ["finance"] },
    "payment→completed": { from: "payment", to: "completed", requiredRoles: ["system"] }
  } as const
};

// Domain-specific type alias for type safety (no new interface created)
export type ServicesIDWorkflowStepId = "request" | "document" | "verification" | "external-response" | "inspection" | "review" | "approval" | "payment" | "completed";