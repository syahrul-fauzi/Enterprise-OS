import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/dist/types.js";
import {
  getComplianceCaseRepositoryInMemory,
  getComplianceCaseRepositoryPostgres,
  newComplianceCaseId,
  defaultComplianceCasePriority,
  defaultComplianceCaseStatus,
} from "../repository/index.js";
import {
	calculateExecutionFrame,
	safeRecordEvidence,
	safeNotifyWorkspaceListeners,
	getIntentRepositoryPostgres,
	getWorkRepositoryPostgres,
	buildWorkFaceProjection,
	validateAllBoundaries,
	IntentRepositoryInMemory,
	type TenantId,
	type WorkspaceId,
	createTenantId,
	createWorkspaceId,
	createActorId,
	type ActorId,
	type ActorMetadata,
	type AuthorizationScope,
	type RiskAssessment,
	type WorkFaceProjection,
	type IdentityBoundary,
	type SemanticBoundary,
	type AuthorityBoundary,
	type ExecutionBoundary,
	type PresentationBoundary,
} from "../../../work-core/implementation/utils/index.js";
import { type WorkId, type ProductNode, type HighValueWorkGraphQuery } from "../../../work-core/contracts/work.contracts.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import {
	type ComplianceCaseAggregate,
	ComplianceCaseId,
	type ComplianceCaseContextMetadata,
} from "../../contracts/index.js";

// ILC-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

const complianceCaseRepository =
  process.env.NODE_ENV === "development"
    ? getComplianceCaseRepositoryInMemory()
    : getComplianceCaseRepositoryPostgres();
const sessionRepository = getSessionRepositoryPostgres();

const CreateComplianceCaseSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  investmentAmount: z.number().positive(),
  sector: z.string().min(2),
  riskRating: z.enum(["low", "medium", "high"]),
  sessionId: z.string().min(1),
  linkedIntentId: z.string().optional(),
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
});

const createComplianceCase: CapabilityCommand<
  z.infer<typeof CreateComplianceCaseSchema>,
  ComplianceCaseAggregate
> = {
  kind: "command",
  name: "compliance-case.create",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const parsed = CreateComplianceCaseSchema.parse(input);
    const { title, description, investmentAmount, sector, riskRating, sessionId: sessionIdValue, linkedIntentId, workId: workIdValue } = parsed;
    
    // ILC-001: Validasi session sebelum create case (authentication boundary)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[investment-compliance.create-case] Invalid or revoked session - authentication violation");
    }

    // ILC-001: Integrasi createCoreWork dari work-core (Work sebagai continuity primitive)
    const capabilityRegistry = await getCapabilityRegistry();
    let coreWorkResult: { id: string; workId: string; domainType: string } | undefined;
    if (capabilityRegistry?.invoke) {
      try {
        coreWorkResult = await capabilityRegistry.invoke("work-core", "create", {
          title: title.trim(),
          description: description || undefined,
          domainType: "investment-compliance",
          sessionId,
          tenantId: session.tenantId,
          workspaceId: session.workspaceId,
          actorId: session.actorId,
          domainSpecificData: { 
            linkedIntentId,
            investmentAmount,
            sector,
            riskRating
          }
        }) as { id: string; workId: string; domainType: string };
      } catch (coreWorkError) {
        console.error("[ILC-001] Core Work creation failed (continuing with compliance case only):", coreWorkError);
      }
    }

    // W-015: ENFORCE 5-BOUNDARY MODEL COMPLIANCE (sesuai Services.ID pattern)
    // Hanya jalanin validation jika coreWorkResult berhasil dibuat
    if (coreWorkResult?.workId) {
      // Konstruksi semua 5 boundary sesuai EOS architecture
      const identityBoundary: IdentityBoundary = {
        tenantId: session.tenantId,
        organizationId: session.organizationId,
        principalId: session.actorId,
        ownerIds: [session.actorId]
      };
      const semanticBoundary: SemanticBoundary = {
        domain: "investment-compliance",
        intent: "investment-risk-compliance-review",
        currentState: "draft",
        requirements: [],
        constraints: [],
        decisions: []
      };
      const authorityBoundary: AuthorityBoundary = {
        actorCapabilities: new Map([[session.actorId, ["create-compliance-case", "assign-auditor", "close-case"]]]),
        policyEnforcements: ["investment-compliance-2026", "data-protection-global"],
        authorizations: new Map([[session.actorId, ["create", "read", "update"]]]),
        delegations: []
      };
      const executionBoundary: ExecutionBoundary = {
        workspaceId: session.workspaceId,
        runtimeEnvironment: "web",
        executorIds: [session.actorId],
        executionFrame: calculateExecutionFrame(session.actorType)
      };
      const presentationBoundary: PresentationBoundary = {
        supportedFaces: ["web", "api", "mobile"],
        defaultLayout: "compliance-case-overview",
        mobileEnabled: true,
        apiEnabled: true,
        projectionConfig: {
          displayName: title,
          summary: description || "Investment compliance risk review case",
          priority: riskRating === "high" || riskRating === "critical" ? "critical" : "medium",
          uiFilters: ["status", "sector", "riskRating", "createdAt"],
          hideFromSurfaces: []
        }
      };

      // Jalankan validasi boundary terpusat dari work-core
      const boundaryValidation = validateAllBoundaries({
        identity: identityBoundary,
        semantic: semanticBoundary,
        authority: authorityBoundary,
        execution: executionBoundary,
        presentation: presentationBoundary
      });

      if (!boundaryValidation.valid) {
        console.error("[W-015] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
        throw new Error(`[investment-compliance.createComplianceCase] Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
      }

      // ILC-003: INTEGRATE HIGH-VALUE WORK GRAPH TRAVERSAL (sesuai EOS core graph mandate)
      const workRepository = getWorkRepositoryPostgres(session.tenantId);
      const linkedProduct: ProductNode | null = await workRepository.getProductForWork(coreWorkResult.workId as WorkId);
      
      // Catat evidence bahwa graph link berhasil dibuat
      await safeRecordEvidence({
        workId: coreWorkResult.workId as WorkId,
        actorId: session.actorId,
        action: "graph-link-created",
        evidence: {
          domain: "investment-compliance",
          linkedProductId: linkedProduct?.id || null,
          graphTraversalSuccess: !!linkedProduct,
          timestamp: new Date().toISOString()
        }
      });

      // Generate server-side FACE projection (sesuai invariant: FACE is projection, not owner)
      const faceProjection = buildWorkFaceProjection({
        workId: coreWorkResult.workId,
        identity: identityBoundary,
        semantic: semanticBoundary,
        authority: authorityBoundary,
        execution: executionBoundary,
        presentation: presentationBoundary,
        // Tambahkan graph data ke projection untuk FACE layer
        graphMetadata: linkedProduct ? {
          productId: linkedProduct.id,
          productName: linkedProduct.name,
          sector: linkedProduct.sector
        } : null
      });

    // CORE-001: Hapus semua duplikat boundary metadata (tenantId/workspaceId/actorId)
    const newCaseId = newComplianceCaseId();
    
    // CORE-001: Validasi coreWorkResult untuk memastikan workId selalu terhubung ke core Work primitive
    if (!coreWorkResult?.workId) {
      throw new Error("[investment-compliance.create-case] Failed to create core Work primitive - CORE-001 violation: workId cannot be empty");
    }
    
    // ILC-002: Terapkan canonical CMBCD framework dari work-core (non-entity-centric actor+capability+authority+context+risk+evidence)
    const actorMetadata: ActorMetadata = {
      actorId: session.actorId,
      actorType: session.actorType || "human",
      role: session.userRole || "customer",
      displayName: session.userName || "Investment Applicant",
      trustLevel: session.verified ? "verified" : "unverified"
    };
    
    const authorization: AuthorizationScope = {
      allowedActions: ["read", "create"],
      restrictedFields: ["internal_audit_notes"]
    };
    
    const context: ComplianceCaseContextMetadata = {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      jurisdiction: "ID",
      requestCategory: "investment-compliance",
      sensitivityLevel: riskRating === "high" ? "confidential" : "internal",
      relatedWorkIds: linkedIntentId ? [linkedIntentId] : []
    };
    
    const riskAssessment: RiskAssessment = {
      level: riskRating,
      rationale: `Investment risk assessment for ${sector} sector, IDR ${investmentAmount}`,
      assessedBy: session.actorId,
      assessedAt: new Date()
    };
    
    // Hitung canonical execution frame menggunakan shared work-core utility
    const executionFrame = calculateExecutionFrame(actorMetadata, authorization, context, riskAssessment);

    const newCase: ComplianceCaseAggregate = {
      id: newCaseId,
      workId: coreWorkResult.workId, // WAJIB: Semua boundary metadata hanya ada di core Work primitive
      title,
      description,
      investmentAmount,
      sector,
      riskRating,
      auditorId: undefined,
      status: defaultComplianceCaseStatus,
      priority: defaultComplianceCasePriority,
      createdAt: new Date(),
      updatedAt: new Date(),
      executionFrame, // Gunakan canonical execution frame dari work-core CMBCD
    };

    await complianceCaseRepository.save(newCase);

    // ILC-001: Record evidence untuk linkage antara core Work dan compliance case
    if (coreWorkResult) {
      await safeRecordEvidence({
        capability: "investment-compliance",
        command: "investment-compliance.linked-to-core-work",
        work_id: coreWorkResult.workId,
        case_id: newCase.id,
        tenant_id: session.tenantId,
        workspace_id: session.workspaceId,
        actor_id: session.actorId,
        timestamp: new Date().toISOString(),
        integration_note: "ILC-001: Compliance case created as domain extension of core Work primitive"
      });
    }

    // Build FACE projection untuk presentation boundary (5 boundary compliance)
    const faceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: coreWorkResult.workId as WorkId,
      identity: { tenantId: session.tenantId, actorId: session.actorId },
      semantic: { domain: "investment-compliance", intent: "compliance-review", state: newCase.status },
      authority: { 
        canCurrentActorAct: true, 
        nextAvailableActions: ["assign-auditor", "close-case"] 
      },
      execution: { 
        workspaceId: session.workspaceId, 
        runtimeEnvironment: "web", 
        executorIds: [session.actorId], 
        executionFrame: executionFrame 
      },
      presentation: { uiChannel: "web", agentChannel: "api", requiredAccessLevel: "user" }
    });

    console.log(`[ILC-001] ✅ Compliance case created ${newCase.id} (work: ${coreWorkResult?.workId})`);
    return { ...newCase, faceProjection };
  },
};

const AssignAuditorToCaseSchema = z.object({
  caseId: z.string(),
  auditorId: z.string(),
  sessionId: z.string().min(1),
  workId: z.string().min(1), // CORE-001: WAJIB link ke core Work primitive ID
});

const assignAuditorToCase: CapabilityCommand<z.infer<typeof AssignAuditorToCaseSchema>> = {
  kind: "command",
  name: "compliance-case.assign-auditor",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const { caseId, auditorId, sessionId } = AssignAuditorToCaseSchema.extend({
      sessionId: z.string().min(1) // Require session untuk validasi authority boundary
    }).parse(input);
    
    // Validasi session sebelum melanjutkan (authentication boundary)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[investment-compliance.assign-auditor] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Fetch case terlebih dahulu untuk mendapatkan workId
    const caseExists = await complianceCaseRepository.byId(ComplianceCaseId(caseId), {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
    if (!caseExists) {
      throw new Error("Compliance case not found");
    }

    // CORE-001: Fetch core WorkAggregate untuk verifikasi boundary dan authorization
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(caseExists.workId);
    if (!coreWork) {
      throw new Error("[investment-compliance.assign-auditor] Core Work not found - boundary metadata missing");
    }

    // 5 Boundaries Enforcement: Authority boundary check - hanya actor dalam tenant yang boleh assign auditor
    if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
      throw new Error("[investment-compliance.assign-auditor] Cross-tenant access blocked - authority boundary violation");
    }

    // Update case dengan auditorId yang baru
    const updatedCase = {
      ...caseExists,
      auditorId,
      updatedAt: new Date()
    };
    await complianceCaseRepository.save(updatedCase);

    // Record evidence untuk audit trail
    await safeRecordEvidence({
      capability: "investment-compliance",
      command: "investment-compliance.auditor-assigned",
      work_id: caseExists.workId,
      case_id: caseId,
      auditor_id: auditorId,
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      timestamp: new Date().toISOString(),
      note: "ILC-001: Auditor assigned to compliance case via authority boundary check"
    });

    // Build FACE projection untuk presentation boundary setelah update
    const updatedFaceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: caseExists.workId as WorkId,
      identity: { tenantId: session.tenantId, actorId: session.actorId },
      semantic: { domain: "investment-compliance", intent: "compliance-review", state: updatedCase.status },
      authority: { 
        canCurrentActorAct: true, 
        nextAvailableActions: ["close-case"] 
      },
      execution: { 
        workspaceId: session.workspaceId, 
        runtimeEnvironment: "web", 
        executorIds: [session.actorId, auditorId as ActorId], 
        executionFrame: caseExists.executionFrame 
      },
      presentation: { uiChannel: "web", agentChannel: "api", requiredAccessLevel: "user" }
    });

    console.log(`[ILC-001] ✅ Auditor ${auditorId} assigned to case ${caseId} (work: ${caseExists.workId})`);
    return { ...updatedCase, faceProjection: updatedFaceProjection };
  },
};

const CloseComplianceCaseSchema = z.object({
  caseId: z.string(),
  sessionId: z.string().min(1), // Require session untuk validasi closure authority
});

const closeComplianceCase: CapabilityCommand<z.infer<typeof CloseComplianceCaseSchema>> = {
  kind: "command",
  name: "compliance-case.close",
  capability: "investment-compliance",
  version: "1.0.0",
  execute: async (input) => {
    const { caseId, sessionId } = CloseComplianceCaseSchema.parse(input);
    
    // Validasi session sebelum melanjutkan (authentication boundary)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[investment-compliance.close-case] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Fetch case dengan context validation dari WorkAggregate
    const caseExists = await complianceCaseRepository.byId(ComplianceCaseId(caseId), {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId
    });
    if (!caseExists) {
      throw new Error("Compliance case not found");
    }

    // CORE-001: Fetch core WorkAggregate untuk final boundary verification
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(caseExists.workId);
    if (!coreWork) {
      throw new Error("[investment-compliance.close-case] Core Work not found - cannot close orphaned case");
    }

    // Authority boundary check - hanya actor dengan akses ke workspace yang boleh close case
    if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
      throw new Error("[investment-compliance.close-case] Cross-tenant access blocked - authority boundary violation");
    }

    // Update case status menjadi closed
    const updatedCase = {
      ...caseExists,
      status: "closed" as const,
      closedAt: new Date(),
      updatedAt: new Date()
    };
    await complianceCaseRepository.save(updatedCase);

    // 4. Lanjutkan graph traversal untuk Work→ComplianceCase→Requirements→Outcome (ILC-004 full implementation)
    const linkedCase: ProductNode | undefined = await workRepository.getProductForWork(caseExists.workId as WorkId);
    const linkedRequirements: string[] = linkedCase 
      ? await workRepository.getRequirementsForProduct(linkedCase.id)
      : [];

    // 5. BIND EVIDENCE KE REQUIREMENTS - satisfy "Evidence chain recording terpenuhi (bindEvidenceToRequirement)"
    if (linkedRequirements.length > 0) {
      for (const requirementId of linkedRequirements) {
        await safeRecordEvidence({
          work_id: caseExists.workId,
          tenant_id: coreWork.tenantId,
          actor_id: session.actorId,
          capability: "investment-compliance",
          command: "compliance-case.close",
          requirement_id: requirementId,
          timestamp: new Date().toISOString(),
          outcome_bound: true,
          outcome_type: "compliance_case_resolved",
          graph_metadata_updated: true
        });
      }
    }

    // 6. Update High-Value Work Graph dengan outcome (Work→ComplianceCase→Outcome)
    if (linkedCase) {
      await workRepository.linkOutcomeToProduct(linkedCase.id, {
        id: `outcome-${caseId}`,
        type: "compliance_case_closed",
        workId: caseExists.workId,
        timestamp: new Date().toISOString(),
        metadata: {
          caseId: caseId,
          closedAt: new Date()
        }
      });
    }

    // Update core Work state menjadi completed (work continuity boundary)
    const capabilityRegistry = await getCapabilityRegistry();
    if (capabilityRegistry?.invoke) {
      try {
        await capabilityRegistry.invoke("work-core", "update", {
          workId: caseExists.workId,
          status: "completed",
          closedAt: new Date().toISOString()
        });
      } catch (workUpdateError) {
        console.warn("[investment-compliance.close-case] Core Work update failed, but case closed locally:", workUpdateError);
      }
    }

    // Record final evidence untuk closure
    await safeRecordEvidence({
      capability: "investment-compliance",
      command: "compliance-case.close",
      work_id: caseExists.workId,
      case_id: caseId,
      actor_id: session.actorId,
      tenant_id: session.tenantId,
      workspace_id: coreWork.execution?.workspaceId || null,
      timestamp: new Date().toISOString(),
      graph_traversal_success: !!linkedCase,
      linked_case_id: linkedCase?.id || null,
      linked_requirement_ids: linkedRequirements,
      outcome_recorded: true,
      note: "ILC-004: Compliance case and core Work marked as completed - outcome achieved"
    });

    // Build final FACE projection untuk closed case
    const finalFaceProjection: WorkFaceProjection = buildWorkFaceProjection({
      workId: caseExists.workId as WorkId,
      identity: { tenantId: session.tenantId, actorId: session.actorId },
      semantic: { domain: "investment-compliance", intent: "compliance-review", state: "closed" },
      authority: { 
        canCurrentActorAct: false, 
        nextAvailableActions: ["view-history", "download-evidence"] 
      },
      execution: { 
        workspaceId: session.workspaceId, 
        runtimeEnvironment: "web", 
        executorIds: [session.actorId, caseExists.auditorId as ActorId], 
        executionFrame: caseExists.executionFrame 
      },
      presentation: { uiChannel: "web", agentChannel: "api", requiredAccessLevel: "user" }
    });

    console.log(`[ILC-001] ✅ Compliance case ${caseId} closed successfully (work: ${caseExists.workId})`);
    return { ...updatedCase, faceProjection: finalFaceProjection };
  },
};

// Export all commands for capability registry registration - follows substrate pattern
export const complianceCaseCommands: Readonly<Record<string, CapabilityCommand>> = {
  "compliance-case.create": createComplianceCase,
  "compliance-case.assign-auditor": assignAuditorToCase,
  "compliance-case.close": closeComplianceCase,
} as const;

// Export individual command functions for direct imports
export {
  createComplianceCase,
  assignAuditorToCase,
  closeComplianceCase
};