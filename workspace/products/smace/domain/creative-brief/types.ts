// @ts-nocheck
// Creative Brief domain model for SMACE AI Product Photography vertical slice
// Reuses core-kernel types exclusively, no new EOS primitives created
import type { WorkflowStep, WorkflowDefinition } from "@repo/core-kernel";

export interface CreativeBrief {
  id: string;
  customerId: string;
  workspaceId: string;
  tenantId: string;
  productType: string;
  targetMarketplace: string;
  assetCount: number;
  brandGuidelinesUrl: string;
  productImagesUrl: string;
  specifications: CreativeSpecification;
  createdAt: string;
  createdBy: string;
  requiredProviderType?: string;
  sessionId: string;
  actorId: string;
  canonicalWorkId?: string;
  reviewerIds?: string[];
  brandGuidelines?: any;
}

export interface CreativeSpecification {
  angles: string[];
  background: string;
  format: string;
  resolution: string;
  style: string;
  variations: string[];
}

// Business production lifecycle layer - aligned with user's 3-layer separation requirement
export const SMACE_AI_PRODUCT_PHOTOGRAPHY_BUSINESS_LIFECYCLE: WorkflowDefinition["steps"] = [
  {
    id: "customer-brief-submitted",
    label: "Customer Brief Submitted",
    capability: "requirement-management",
    command: "requirement.create",
    description: "Customer submitted product photography brief with brand guidelines and product assets",
    requiredRoles: ["system", "human-customer"]
  },
  {
    id: "creative-specification-generated",
    label: "Creative Specification Generated",
    capability: "agent-orchestration",
    command: "specification.generate",
    description: "SMACE converted brief into executable creative specifications (angles, background, format)",
    requiredRoles: ["system", "creative-operator"]
  },
  {
    id="content-produced",
    label: "Creative Content Produced",
    capability: "workflow-engine",
    command: "workflow.transition",
    description: "Provider (ComfyUI/Adobe) generated all requested product photography assets",
    requiredRoles: ["system", "provider-agent"]
  },
  {
    id: "quality-validation-completed",
    label: "Quality & Brand Validation Completed",
    capability: "governance-evidence",
    command: "evidence.recordApproval",
    description: "Automated QA passed all technical and brand guideline checks",
    requiredRoles: ["system", "qa-inspector"]
  },
  {
    id: "human-approval-granted",
    label: "Human Approval Granted",
    capability: "governance-evidence",
    command: "evidence.recordApproval",
    description: "Customer or reviewer approved final assets, no revisions required",
    requiredRoles: ["human-reviewer", "customer"]
  },
  {
    id: "package-delivered",
    label: "Asset Package Delivered",
    capability: "document-management",
    command: "package.deliver",
    description: "Final package with assets, manifest, and provenance delivered to customer",
    requiredRoles: ["system", "delivery-agent"]
  },
  {
    id: "commercial-reconciliation-completed",
    label: "Commercial Reconciliation Completed",
    capability: "budget-management",
    command: "cost.reconcile",
    description: "Actual provider costs, revenue, and contribution margin calculated and recorded",
    requiredRoles: ["system", "finance-agent"]
  }
];