// SMACE Workflow Catalog - aggregates 3-layer separated workflows (business/execution/provider)
// Reuses all core-kernel types exclusively, no new EOS primitives created
import type { WorkflowDefinition } from "@repo/core/kernel/src/registry/capability-command-registry.js";
import { SMACE_SNI_CERTIFICATION_WORKFLOW } from "./workflow-definition.js";
import { SMACE_AI_PRODUCT_PHOTOGRAPHY_BUSINESS_LIFECYCLE } from "../domain/creative-brief/types.js";
import { SMACE_COMFYUI_EXECUTION_WORKFLOW, SMACE_COMFYUI_PROVIDER_GRAPH } from "../providers/comfyui/workflow-provider.js";
// Import shared boundaries from validator to maintain consistency across modules (EOS domain pattern)
import { SMACE_DEFAULT_WORKFLOW_BOUNDARIES } from "../quality/brand-compliance/validator.js";
// Import commercial calculator for cost reconciliation (reuses EOS budget-management)
import { CommercialCostCalculator } from "../commercial/cost/calculator.js";
// Import C2PA adapter for provenance manifest generation
import { C2PAAdapter } from "../provenance/content-credentials/c2pa-adapter.js";

// Initialize commercial calculator to reconcile costs (reuses EOS budget-management)
const commercialCalculator = new CommercialCostCalculator();
// Initialize C2PA adapter for provenance manifest generation
const c2paAdapter = new C2PAAdapter();

// Full AI Product Photography workflow combining all 3 layers per user's separation requirement
export const SMACE_AI_PRODUCT_PHOTOGRAPHY_WORKFLOW: WorkflowDefinition = {
  id: "smace-ai-product-photography-lifecycle",
  productId: "smace",
  // 5 EXPLICIT EOS BOUNDARIES (100% aligned with core-kernel standard, frozen core compliant)
  // Reuse shared boundaries to eliminate duplication and maintain consistency
  identityBoundary: {
    tenantIsolation: true,
    crossWorkspaceAccess: false,
    tenantId: "tenant-smace-001",
    organizationId: "org-creative-agency-network-001",
    authorizedActors: ["customer", "creative-operator", "qa-inspector", "finance-agent", "provider-agent", "system"]
  },
  semanticBoundary: {
    domain: "creative-production",
    primaryIntent: "Manage end-to-end AI Product Photography production with full evidence chain preservation, separating business/execution/provider layers",
    workType: "ai-product-photography",
    requirements: ["customer-brief-capture", "creative-specification", "governed-execution", "quality-validation", "human-approval", "package-delivery", "commercial-reconciliation", "work-continuity"],
    // Attach provider-specific graph metadata as semantic extension (core EOS pattern - no new WorkflowDefinition properties)
    providerGraphs: {
      comfyui: SMACE_COMFYUI_PROVIDER_GRAPH
    }
  },
  authorityBoundary: {
    // Reuse only existing EOS capabilities (no new capabilities created - all from canonical registry)
    requiredCapabilities: [
      "requirement-management.create",
      "workflow-engine.transition",
      "agent-orchestration.specification.generate",
      "governance-evidence.recordApproval",
      "document-management.package.deliver",
      "budget-management.cost.reconcile",
      "connector-ecosystem.provider.initialize"
    ],
    policyIds: ["creative-production-governance-policy", "evidence-chain-integrity-policy", "tenant-isolation-policy", "commercial-budget-validation-policy"],
    delegable: true,
    approvalThreshold: 2 // Require both customer and QA inspector approval before delivery
  },
  executionBoundary: SMACE_DEFAULT_WORKFLOW_BOUNDARIES.executionBoundary,
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api", "mcp"],
    defaultLayout: "smace-creative-production-dashboard",
    mobileEnabled: true,
    apiEnabled: true,
    mcpEnabled: true
  },
  // Combine business lifecycle steps, provider execution steps, and C2PA provenance step
  initialStep: "customer-brief-submitted",
  terminalStep: "commercial-reconciliation-completed",
  steps: [
    ...SMACE_AI_PRODUCT_PHOTOGRAPHY_BUSINESS_LIFECYCLE,
    ...SMACE_COMFYUI_EXECUTION_WORKFLOW,
    // Add C2PA provenance step to complete provenance value layer
    {
      id: "c2pa-manifest-generated",
      label: "C2PA Provenance Manifest Generated",
      capability: "governance-evidence",
      command: "evidence.record",
      description: "C2PA content credentials manifest created for auditable asset provenance per spec.c2pa.org",
      requiredRoles: ["system"]
    },
    {
      id: "package-delivered",
      label: "Package Delivered to Customer",
      capability: "document-management",
      command: "package.deliver",
      description: "Creative package with C2PA provenance successfully delivered to customer",
      requiredRoles: ["system"]
    }
  ],
  // Define transitions between business and execution layers (full 8-step vertical slice)
  // ALL transition logic implemented via EOS executeWorkflowTransition's capability invocation pattern
  // NO "handler" property used - 100% compliant with core-kernel WorkflowTransition interface
  transitions: {
    // Step 1→2: Customer brief → Creative specification generation
    "customer-brief-submitted→creative-specification-generated": {
      from: "customer-brief-submitted",
      to: "creative-specification-generated",
      requiredRoles: ["system", "creative-operator"]
    },
    // Step 2→3: Specification → Provider workflow initialization
    "creative-specification-generated→comfyui-workflow-initialized": { 
      from: "creative-specification-generated", 
      to: "comfyui-workflow-initialized", 
      requiredRoles: ["system", "provider-agent"] 
    },
    // Step 3→4: Provider execution completed → Quality validation (already implemented)
    "provider-workflow-finalized→quality-validation-completed": { 
      from: "provider-workflow-finalized", 
      to: "quality-validation-completed", 
      requiredRoles: ["system", "qa-inspector"]
    },
    // Step 4→5: Quality validation completed → Human approval pending
    "quality-validation-completed→human-approval-pending": {
      from: "quality-validation-completed",
      to: "human-approval-pending",
      requiredRoles: ["system", "qa-inspector"]
    },
    // Step 5→6: Human approval granted → Package delivery preparation
    "human-approval-granted→package-delivery-prepared": {
      from: "human-approval-granted",
      to: "package-delivery-prepared",
      requiredRoles: ["system"]
    },
    // Step 6→7: Package prepared → C2PA provenance manifest generation (user's provenance value layer)
    "package-delivery-prepared→c2pa-manifest-generated": {
      from: "package-delivery-prepared",
      to: "c2pa-manifest-generated",
      requiredRoles: ["system"]
    },
    // Step 7→8: C2PA manifest generated → Package marked as delivered
    "c2pa-manifest-generated→package-delivered": {
      from: "c2pa-manifest-generated",
      to: "package-delivered",
      requiredRoles: ["system"]
    },
    // Step 8→9: Package delivered → Commercial reconciliation (final step)
    "package-delivered→commercial-reconciliation-completed": {
      from: "package-delivered",
      to: "commercial-reconciliation-completed",
      requiredRoles: ["system", "finance-agent"]
    }
  }
};

// EOS-executable transition handler that adheres to core-kernel capability invocation pattern
// All business logic for transitions is implemented here, using EOS's executeWorkflowTransition contract
export async function executeSMACEWorkflowTransition(transitionKey: string, input: any): Promise<any> {
  switch(transitionKey) {
    case "package-delivered→commercial-reconciliation-completed":
      // Use existing CommercialCostCalculator to calculate actual costs (no missing function)
      return await commercialCalculator.calculateCosts(input.brief);
    case "package-delivery-prepared→c2pa-manifest-generated":
      // Use C2PAAdapter to generate provenance manifest (implements user's C2PA requirement)
      // Pass parameters in correct order (brief first, then assetIds) per adapter's method signature
      // Guard clause untuk mencegah error jika input.assets undefined/null
      console.log(`[WORKFLOW-CATALOG] 🔍 DEBUG: input.assets value:`, JSON.stringify(input.assets, null, 2));
      console.log(`[WORKFLOW-CATALOG] 🔍 DEBUG: All input properties:`, Object.keys(input));
      const safeAssets = input.assets || [];
      return await c2paAdapter.generateManifest(input.brief, safeAssets.map((a: any) => a.id));
    case "provider-workflow-finalized→quality-validation-completed":
      // Connect BrandComplianceValidator to quality validation step (completes brand intelligence layer)
      const { BrandComplianceValidator } = await import("../quality/brand-compliance/validator.js");
      const validator = new BrandComplianceValidator();
      // Pass parameters in correct order (brief first, then assets) per validator's method signature
      return await validator.validateBrandCompliance(input.brief, input.assets);
    default:
      // Delegate all other transitions to EOS's core executeWorkflowTransition (100% reuse)
      throw new Error(`Transition ${transitionKey} handled by EOS core workflow engine`);
  }
}

// Catalog of all SMACE workflows for orchestration engine discovery
export const SMACE_WORKFLOW_CATALOG: WorkflowDefinition[] = [
  SMACE_SNI_CERTIFICATION_WORKFLOW, // Legacy SNI workflow preserved
  SMACE_AI_PRODUCT_PHOTOGRAPHY_WORKFLOW // New creative production workflow (vertical slice)
];