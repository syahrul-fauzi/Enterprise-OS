// SMACE-ARCH-003: workflow-definition.ts sekarang menjadi wrapper minimal - hanya koordinasi layer
// Tidak lagi menjadi pusat seluruh logika SMACE, memisahkan:
// 1. Business production lifecycle (domain/creative-brief)
// 2. Execution workflow (runtime/execution-mapping)
// 3. Provider workflow (providers/comfyui)

import { processCustomerBrief, validateBriefCompliance, validateOutputAgainstBrief, processApproval } from '../domain/creative-brief/brief-processor.js';
import { createCanonicalWorkFromBrief, submitWorkForExecution } from './execution-mapping.js';
import { buildComfyWorkflowFromSpecs, executeComfyWorkflow, type ProviderExecutionResult } from '../providers/comfyui/comfy-api-client.js';
import { generateAndPackageAssets } from '../domain/delivery/package-generator.js';
import { reconcileCommercials } from '../domain/commercial/reconciler.js';
import { BriefStatus, CreativeBrief } from '../contracts/creative-brief.contract.js';
// Perbaiki import error: SMACE_DEFAULT_WORKFLOW_BOUNDARIES untuk workflow (bukan quality) didefinisikan lokal
// Workflow boundaries yang sesuai dengan EOS core-kernel standard (SMACE-ARCH-003 separation)
const SMACE_DEFAULT_WORKFLOW_BOUNDARIES = {
  identityBoundary: { tenantIsolation: true, crossWorkspaceAccess: false },
  executionBoundary: { maxRetries: 3, timeoutMs: 3600000, concurrencyLimit: 5 }
};
// Alias sederhana untuk WorkflowDefinition (legacy SNI workflow tidak mengganggu SMACE-007)
type WorkflowDefinition = any;
// Gunakan import evidenceRegistry dari canonical EOS export (tidak merusak SMACE-007)
import { evidenceRegistry } from '../../../capabilities/evidence-registry/implementation/index.js';
const evidenceRegistryService = evidenceRegistry; // Reuse EOS Evidence Registry

export interface SMACEWorkflow {
  id: string;
  briefId: string;
  canonicalWorkId: string;
  providerWorkflowId: string;
  status: BriefStatus;
  partialSuccess?: boolean;
}

// Main workflow coordinator - hanya menghubungkan layer yang sudah dipisahkan
export async function createAndExecuteWorkflow(rawCustomerInput: any): Promise<SMACEWorkflow> {
  // Layer 1: Business production lifecycle - proses dan validasi brief
  const validatedBrief = processCustomerBrief(rawCustomerInput);
  const compliance = validateBriefCompliance(validatedBrief);
  
  if (!compliance.valid) {
    throw new Error(`Brief tidak valid: ${compliance.issues.join(', ')}`);
  }

  // Layer 2: Execution workflow - buat EOS canonical Work
  const eosWork = createCanonicalWorkFromBrief(validatedBrief);
  validatedBrief.canonicalWorkId = eosWork.id;
  validatedBrief.status = BriefStatus.SUBMITTED;

  // Layer 3: Provider workflow - bangun dan eksekusi provider-specific workflow
  const providerWorkflow = buildComfyWorkflowFromSpecs(validatedBrief.specifications);
  const providerJob = await executeComfyWorkflow(providerWorkflow);
  // SMACE-008-W004: Track partial success from provider execution
  validatedBrief.partialSuccess = providerJob.normalizedResults?.partialSuccess || false;

  // Submit ke EOS untuk governed execution
  await submitWorkForExecution(validatedBrief);
  validatedBrief.status = BriefStatus.IN_PRODUCTION;

  return {
    id: `smace-workflow-${validatedBrief.id}`,
    briefId: validatedBrief.id,
    canonicalWorkId: eosWork.id,
    providerWorkflowId: providerJob.jobId,
    status: BriefStatus.IN_PRODUCTION,
    partialSuccess: validatedBrief.partialSuccess
  };
}

// SMACE-ARCH-004: Fungsi untuk menyelesaikan seluruh alur setelah provider selesai menghasilkan aset
// Menjalankan Langkah 5-8: Quality Check → Human Approval → Package & Delivery → Commercial Reconciliation
export async function completeProductionWorkflow(
  brief: CreativeBrief,
  generatedAssets: string[],
  actorId: string,
  sessionId: string,
  approvalDecision: 'approved' | 'rejected' | 'revision_requested',
  approvalComments?: string
): Promise<{
  success: boolean;
  finalStatus: BriefStatus;
  assetPackage?: any;
  commercialMetrics?: any;
}> {
  // Langkah 5: Quality & Brand Validation
  brief.generatedAssets = generatedAssets;
  brief.status = BriefStatus.QUALITY_CHECK;
  const qualityCheck = validateOutputAgainstBrief(brief, generatedAssets);
  
  if (!qualityCheck.passed) {
    await evidenceRegistryService.recordEvidence({
      workId: brief.canonicalWorkId!,
      tenantId: brief.tenantId,
      type: 'brief.quality.check.failed',
      actorId: 'smace:quality-system',
      payload: { technicalIssues: qualityCheck.technicalIssues, brandIssues: qualityCheck.brandIssues },
      timestamp: new Date().toISOString()
    });
    throw new Error(`Quality check gagal: ${[...qualityCheck.technicalIssues, ...qualityCheck.brandIssues].join(', ')}`);
  }

  // Langkah 6: Human Approval
  const approvalResult = await processApproval(brief, actorId, approvalDecision, approvalComments);
  if (approvalResult.newStatus !== BriefStatus.APPROVED) {
    return { success: false, finalStatus: approvalResult.newStatus };
  }

  // Langkah 7: Package & Delivery
  const assetPackage = await generateAndPackageAssets(brief);
  brief.finalPackageUrl = `/packages/${assetPackage.packageId}.zip`;

  // Langkah 8: Commercial Reconciliation
  const commercialMetrics = await reconcileCommercials(brief, sessionId);
  brief.status = BriefStatus.DELIVERED;

  // Catat seluruh workflow selesai ke EOS Evidence Registry
  await evidenceRegistryService.recordEvidence({
    workId: brief.canonicalWorkId!,
    tenantId: brief.tenantId,
    type: 'brief.workflow.completed',
    actorId: 'smace:workflow-coordinator',
    payload: {
      briefId: brief.id,
      finalStatus: BriefStatus.DELIVERED,
      packageUrl: brief.finalPackageUrl,
      revenue: commercialMetrics.revenue,
      margin: commercialMetrics.contributionMargin
    },
    timestamp: new Date().toISOString()
  });

  return {
    success: true,
    finalStatus: BriefStatus.DELIVERED,
    assetPackage,
    commercialMetrics
  };
}

// Legacy SNI certification workflow preserved for backwards compatibility (no new primitive creation)
export const SMACE_SNI_CERTIFICATION_WORKFLOW: WorkflowDefinition = {
  id: "smace-sni-certification-lifecycle",
  productId: "smace",
  identityBoundary: SMACE_DEFAULT_WORKFLOW_BOUNDARIES.identityBoundary,
  semanticBoundary: {
    domain: "manufacturing-certification",
    primaryIntent: "Manage end-to-end SNI (Standar Nasional Indonesia) certification process for manufactured products with full evidence chain preservation",
    workType: "sni-certification",
    requirements: ["factory-inspection-evidence", "product-testing-results", "sni-standard-compliance", "certificate-issuance", "evidence-preservation", "work-continuity"]
  },
  authorityBoundary: {
    requiredCapabilities: [
      "requirement-management.create",
      "workflow-engine.transition",
      "governance-evidence.recordApproval",
      "governance-evidence.finalize",
      "document-management.upload",
      "sensor.read.recordTestData",
      "institutional-coordination.scheduleAudit"
    ],
    policyIds: ["sni-certification-governance-policy", "evidence-chain-integrity-policy", "tenant-isolation-policy"],
    delegable: true,
    approvalThreshold: 2
  },
  executionBoundary: SMACE_DEFAULT_WORKFLOW_BOUNDARIES.executionBoundary,
  presentationBoundary: {
    supportedFaces: ["human", "agent", "api"],
    defaultLayout: "smace-certification-dashboard",
    mobileEnabled: true,
    apiEnabled: true
  },
  productRef: "product-smace-001",
  caseRef: "case-sni-certification-template",
  label: "Application Submitted → Documents Verified → Factory Inspection → Product Testing → Audit Scheduled → Certification Granted → Certificate Issued",
  initialStep: "sni-application-submitted",
  terminalStep: "certification-issued",
  steps: [
    {
      id: "sni-application-submitted",
      label: "SNI Certification Application Received",
      capability: "requirement-management",
      command: "requirement.create",
      description: "Formal SNI certification application captured and registered in canonical work lifecycle",
      requiredRoles: ["system", "factory-manager"]
    },
    {
      id: "documents-verified",
      label: "Application Documents Verified",
      capability: "workflow-engine",
      command: "workflow.transition",
      description: "Application documents (product specs, factory permits) reviewed and verified complete",
      requiredRoles: ["system", "certification-officer"]
    },
    {
      id: "factory-inspection-completed",
      label: "Factory Inspection Completed",
      capability: "governance-evidence",
      command: "evidence.recordApproval",
      description: "On-site factory inspection completed, compliance with SNI manufacturing standards verified",
      requiredRoles: ["sni-auditor", "factory-manager"]
    },
    {
      id: "product-testing-completed",
      label: "Product Laboratory Testing Completed",
      capability: "sensor.read",
      command: "recordTestData",
      description: "Product samples tested in laboratory, all SNI safety/quality parameters met",
      requiredRoles: ["qa-inspector", "manufacturing-engineer"]
    },
    {
      id: "audit-scheduled",
      label: "Final Certification Audit Scheduled",
      capability: "institutional-coordination",
      command: "scheduleAudit",
      description: "Final SNI audit scheduled with national certification body",
      requiredRoles: ["certification-officer", "sni-auditor"]
    },
    {
      id: "certification-granted",
      label: "SNI Certification Approved",
      capability: "governance-evidence",
      command: "evidence.recordApproval",
      description: "All requirements met, SNI certification officially granted by national body",
      requiredRoles: ["sni-auditor", "certification-officer"]
    },
    {
      id: "certification-issued",
      label: "SNI Certificate Issued",
      capability: "governance-evidence",
      command: "evidence.finalize",
      description: "Official SNI certificate issued to manufacturer, work completed with full evidence chain preserved",
      requiredRoles: ["certification-officer", "system"]
    }
  ],
  transitions: {
    "application-submitted→documents-verified": { from: "sni-application-submitted", to: "documents-verified", requiredRoles: ["certification-officer", "system"] },
    "documents-verified→inspection": { from: "documents-verified", to: "factory-inspection-completed", requiredRoles: ["sni-auditor"] },
    "inspection→testing": { from: "factory-inspection-completed", to: "product-testing-completed", requiredRoles: ["qa-inspector"] },
    "testing→audit-scheduled": { from: "product-testing-completed", to: "audit-scheduled", requiredRoles: ["certification-officer"] },
    "audit-scheduled→certification-granted": { from: "audit-scheduled", to: "certification-granted", requiredRoles: ["sni-auditor", "certification-officer"] },
    "granted→issued": { from: "certification-granted", to: "certification-issued", requiredRoles: ["system", "certification-officer"] }
  }
};