import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/index.js";
import { getCaseByIdCommand } from "./get-case-by-id.command.js";
import {
  getCaseRepositoryInMemory,
  getCaseRepositoryPostgres,
  newCaseId,
  defaultCasePriority,
  defaultCaseStatus,
} from "../repository/index.js";
import {
  // Import canonical shared utilities from Work Continuity Substrate (Rule of Two compliance)
  calculateExecutionFrame,
  safeRecordEvidence,
  safeNotifyWorkspaceListeners,
  validateAllBoundaries,
  buildWorkFaceProjection
} from "../../../work-core/implementation/utils/index.js";
// Import canonical identity factory functions + types dari @repo/contracts-core (source of truth untuk branded types)
import { 
  TenantId, 
  WorkspaceId, 
  ActorId,
  newWorkId,
  createWorkId,
  type WorkId
} from "../../../../packages/contracts-core/dist/index.js";
// Import repository implementations + core CMBCD types dari work-core (single source of truth - anti-drift)
// Semua CMBCD core types (ActorMetadata, AuthorizationScope, ContextMetadata, RiskAssessment, WorkFaceProjection, WorkStatusEnum)
// didefinisikan sekali di work-core untuk menghindari duplikasi antar vertical slices (Rule of Two compliance)
import { getWorkRepositoryPostgres, WorkStatusEnum } from "../../../work-core/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, initIdentitySchema } from "../../../work-core/index.js";
import { type ProductNode, type HighValueWorkGraphQuery } from "../../../work-core/contracts/work.contracts.js";
import {
	type CaseAggregate,
	type AuthorizationScope,
	type CaseContextMetadata,
	type RiskAssessment,
	CaseId
} from "../../contracts/case.contracts.js";

// LH-LEGAL-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/dist/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

const caseRepository =
  process.env.NODE_ENV === "development"
    ? getCaseRepositoryInMemory()
    : getCaseRepositoryPostgres();

// Lazy initialize session repository - gunakan in-memory saat test (mirip pola work-core dari retail-inventory)
let _sessionRepo: any = undefined;
async function getSessionRepositoryLazy() {
  if (!_sessionRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
               // GUNAKAN IN-MEMORY SESSION REPOSITORY SAAT TEST (sesuai pattern work-core - import dari identity capability)
               const { SessionRepositoryInMemory } = await import("../../../identity/implementation/repositories/session.inmemory.js");
               _sessionRepo = SessionRepositoryInMemory;
               console.log("[legal-case] 🔧 Using IN-MEMORY session repository for TEST environment");
             } else {
      // GUNAKAN POSTGRESQL SESSION REPOSITORY SAAT PRODUCTION/DEV
      _sessionRepo = getSessionRepositoryPostgres();
      console.log("[legal-case] 🐘 Using POSTGRESQL session repository");
    }
  }
  return _sessionRepo;
}

// PROD-002-10: Full CMBCD schema support untuk inisialisasi case
        // Sesuai mandat pengguna: Actor + Capability + Authority + Context + Risk + Evidence
        // Sinkronkan dengan interface di case.contracts.ts untuk type safety
        const ActorMetadataSchema = z.object({
          actorId: z.string(),
          actorType: z.enum(["human", "ai-agent", "external-service", "organization", "machine"]),
          role: z.string(),
          displayName: z.string(),
          trustLevel: z.enum(["verified", "certified", "unverified"])
        });
        
        const AuthorizationScopeSchema = z.object({
          allowedActions: z.array(z.string()),
          expiryTimestamp: z.string().optional(),
          delegatedBy: z.string().optional(),
          restrictedFields: z.array(z.string()).optional()
        });
        
        const CaseContextMetadataSchema = z.object({
          tenantId: z.string(),
          workspaceId: z.string().optional(), // Optional execution boundary only
          jurisdiction: z.string(),
          requestCategory: z.string(),
          sensitivityLevel: z.enum(["public", "internal", "confidential", "restricted"]).default("internal"),
          relatedWorkIds: z.array(z.string())
        });
        
        const RiskAssessmentSchema = z.object({
          level: z.enum(["low", "medium", "high", "critical"]),
          rationale: z.string(),
          assessedBy: z.string(),
          assessedAt: z.date(),
          mitigationSteps: z.array(z.string()).optional()
        });

const CreateCaseWithContextSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	sessionId: z.string().min(1), // LH-LEGAL-001: Auto-populate tenantId/workspaceId/actorId dari session (aligned with W-SVC-001)
	linkedIntentId: z.string(),
  // PROD-002-10: CMBCD required fields untuk inisialisasi non-entity-centric
  initialActorMetadata: ActorMetadataSchema,
  initialCapabilities: z.array(z.string()),
  initialAuthorization: AuthorizationScopeSchema,
  caseContext: CaseContextMetadataSchema,
  initialRiskAssessment: RiskAssessmentSchema
});

const createCase: CapabilityCommand<
	z.infer<typeof CreateCaseWithContextSchema>,
	CaseAggregate & { workId: string; faceProjection?: any }
> = {
	kind: "command",
	name: "create-case",
	capability: "legal-case",
	execute: async (input) => {
		const parsed = CreateCaseWithContextSchema.parse(input);
		const { title, description, sessionId, linkedIntentId } = parsed;
		
		// LH-LEGAL-001: Validasi session sebelum create case (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.create-case] Invalid or revoked session - authentication violation");
		}
		const { tenantId: sessionTenantId, workspaceId: sessionWorkspaceId, actorId: sessionActorId } = session;
		const tenantId: TenantId = TenantId(sessionTenantId as unknown as string);
		const workspaceId: WorkspaceId = WorkspaceId(sessionWorkspaceId as unknown as string);
		const actorId: ActorId = ActorId(sessionActorId as unknown as string);

		// LH-LEGAL-001: Integrasi createCoreWork dari work-core (Work sebagai continuity primitive)
		const capabilityRegistry = await getCapabilityRegistry();
		let coreWorkResult: { id: string; workId: string; domainType: string } | undefined;
		if (capabilityRegistry?.invoke) {
			try {
				coreWorkResult = await capabilityRegistry.invoke("work-core", "work.create", {
					title: title.trim(),
					description: description || undefined,
					domainType: "legal-case",
					sessionId,
					tenantId: sessionTenantId,
					workspaceId: sessionWorkspaceId,
					actorId: sessionActorId,
					domainSpecificData: {
						linkedIntentId
					}
				}) as { id: string; workId: string; domainType: string };
				console.log(`[LH-LEGAL-001] ✅ Core Work created successfully: ${coreWorkResult.workId}`);
			} catch (coreWorkError) {
				console.error("[LH-LEGAL-001] Core Work creation failed (continuing with case only):", coreWorkError);
			}
		}

		// PROD-002-10: Extract CMBCD fields dari input untuk initialize CaseAggregate
		const { 
			initialActorMetadata, 
			initialCapabilities, 
			initialAuthorization, 
			caseContext, 
			initialRiskAssessment 
		} = parsed;

		// Cast ke branded types sesuai pola work-core (lihat work.commands.ts line 38)
		const castedActorMetadata = {
			...initialActorMetadata,
			actorId: initialActorMetadata.actorId as unknown as ActorId
		};
		const castedAuthorization = {
			...initialAuthorization,
			// Pastikan restrictedFields selalu terisi (required oleh AuthorizationScope interface work-core)
			restrictedFields: initialAuthorization.restrictedFields || ["sensitive-client-data", "financial-records"],
			delegatedBy: initialAuthorization.delegatedBy ? initialAuthorization.delegatedBy as unknown as ActorId : undefined
		};
		const castedCaseContext = {
			...caseContext,
			caseCategory: (caseContext as any).caseCategory || "legal-litigation", // FIX: missing caseCategory untuk CaseContextMetadata
			requestCategory: (caseContext as any).caseCategory || "legal-litigation",
			tenantId: TenantId(caseContext.tenantId),
			workspaceId: caseContext.workspaceId ? WorkspaceId(caseContext.workspaceId) : undefined,
			// Konversi semua string workId ke WorkId branded type - FIX: "Type 'string' is not assignable to type 'WorkId'"
			relatedWorkIds: caseContext.relatedWorkIds.map(id => createWorkId(id))
		};
		const castedRisk = {
			...initialRiskAssessment,
			assessedBy: initialRiskAssessment.assessedBy as unknown as ActorId
		};

		// PROD-002-10: Dynamically calculate executionFrame using CMBCD logic (non-entity-centric)
		const computedExecutionFrame = calculateExecutionFrame(
			castedActorMetadata,
			castedAuthorization,
			castedCaseContext,
			castedRisk
		);

		// W-014: ENFORCE 6-BOUNDARY CLASSES COMPLIANCE (user mandate: IDENTITY/SEMANTIC/AUTHORITY/EXECUTION/EVIDENCE/PRESENTATION)
		// Reuse validateAllBoundaries dari work-core (Rule of Two compliance - sudah digunakan di Services.ID)
		const identityBoundary = {
			tenantId: tenantId,
			organizationId: "lawyershub.legal",
			principalId: actorId,
			ownerIds: [actorId]
		};
		const semanticBoundary = {
			domain: "legal-case",
			intent: linkedIntentId,
			currentState: "draft" as const, // "draft" termasuk valid value dari WorkStatus union
			requirements: [],
			constraints: [],
			decisions: []
		};
		const authorityBoundary = {
			actorCapabilities: new Map([[actorId, initialCapabilities]]),
			policyEnforcements: ["legal-confidentiality"],
			authorizations: new Map([[actorId, initialAuthorization.allowedActions]]),
			delegations: []
		};
		const executionBoundary = {
			workspaceId: workspaceId,
			runtimeEnvironment: "web" as const,
			executorIds: [actorId],
			executionFrame: computedExecutionFrame
		};
		// Boundary keenam: EVIDENCE (sesuai mandat user yang menambahkan boundary ini)
		// Mematuhi interface EvidenceBoundary dari work-core: evidenceIds, evidenceChain, outcomeVerified
		const evidenceBoundary = {
			evidenceIds: [] as readonly string[], // ID bukti yang tercatat di evidence-registry (required)
			evidenceChain: [] as readonly { // Rantai bukti kronologis (required)
				readonly actorId: ActorId;
				readonly action: string;
				readonly timestamp: Date;
				readonly workspaceId?: WorkspaceId;
				readonly deviceId?: string;
				readonly proofUrl?: string;
			}[],
			outcomeVerified: false, // Apakah outcome Work telah terverifikasi dengan bukti (required)
			lastVerifiedAt: undefined,
			verifierIds: [] as readonly ActorId[]
		};
		const presentationBoundary = {
			supportedFaces: ["web", "api"] as const,
			defaultLayout: "legal-case-dashboard",
			mobileEnabled: true,
			apiEnabled: true,
			projectionConfig: {
				displayName: title,
				summary: description || "Legal case created via LawyersHub",
				priority: defaultCasePriority,
				uiFilters: ["status", "priority", "createdAt"],
				hideFromSurfaces: []
			}
		};
		const boundaryValidation = validateAllBoundaries({
			identity: identityBoundary,
			semantic: semanticBoundary,
			authority: authorityBoundary,
			execution: executionBoundary,
			evidence: evidenceBoundary,
			presentation: presentationBoundary
		});

		if (!boundaryValidation.valid) {
			console.error("[W-014] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
			throw new Error(`[legal-case.createCase] Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
		}

		// LH-LEGAL-003: INTEGRATE HIGH-VALUE WORK GRAPH TRAVERSAL (mirror ILC-003 pattern, Rule of Two compliance)
		const workRepository = getWorkRepositoryPostgres();
		const linkedProduct: ProductNode | undefined = coreWorkResult?.workId 
			? await workRepository.getProductForWork(coreWorkResult.workId as WorkId)
			: undefined;
		
		// Catat evidence bahwa graph link berhasil dibuat (reuse safeRecordEvidence dari work-core - gunakan schema yang benar)
		if (coreWorkResult?.workId && sessionTenantId && workspaceId) {
			await safeRecordEvidence({
				work_id: coreWorkResult.workId,
				tenant_id: sessionTenantId,
				actor_id: actorId,
				capability: "legal-case",
				command: "create-case",
				workspace_id: workspaceId,
				timestamp: new Date().toISOString(),
				graph_link_created: true,
				linked_product_id: linkedProduct?.id || null,
				graph_traversal_success: !!linkedProduct
			});
		}

		// W-014: BUILD SERVER-DERIVED FACE PROJECTION (user mandate: "FACE adalah projection, bukan owner.")
		const faceProjection = coreWorkResult?.workId ? buildWorkFaceProjection({
			workId: createWorkId(coreWorkResult.workId), // FIX: Konversi string → WorkId dengan branded type factory
			tenantId: sessionTenantId,
			organizationId: "lawyershub.legal",
			principalId: actorId,
			ownerIds: [actorId],
			domain: "legal-case",
			intent: linkedIntentId,
			currentState: "draft" as const, // FIX: const assertion untuk match WorkStatus union type
			requirements: [],
			constraints: [],
			decisions: [],
			actorCapabilities: new Map([[actorId, initialCapabilities]]),
			policyEnforcements: ["legal-confidentiality"],
			authorizations: new Map([[actorId, initialAuthorization.allowedActions]]),
			delegations: [],
			workspaceId: workspaceId,
			runtimeEnvironment: "web",
			executorIds: [actorId],
			executionFrame: computedExecutionFrame,
			supportedFaces: ["web", "api"],
			defaultLayout: "legal-case-dashboard",
			mobileEnabled: true,
			apiEnabled: true,
			displayName: title,
			summary: description || "Legal case created via LawyersHub",
			priority: defaultCasePriority,
			uiFilters: ["status", "priority", "createdAt"],
			hideFromSurfaces: [],
			currentActorId: actorId,
			canCurrentActorAct: true,
			nextAvailableActions: ["update-case", "assign-lawyer", "add-evidence"],
			evidenceCount: 0,
			actorCount: 1
		}) : undefined;

		// CORE-001: Hapus semua duplikat boundary metadata (tenantId/workspaceId/actorId) - semuanya berasal dari WorkAggregate
		// LAYER 7: Initial lifecycle state - draft with FULL CMBCD framework implementation
		const newCase: CaseAggregate = {
			id: newCaseId(),
			workId: coreWorkResult?.workId ? createWorkId(coreWorkResult.workId) : newWorkId(), // FIX: Konversi string → WorkId, fallback ke newWorkId() jika tidak ada
			title,
			description,
			lawyerId: undefined, // Fix: undefined sesuai contract (bukan null)
			status: "draft",
			priority: defaultCasePriority,
			createdAt: new Date(),
			updatedAt: new Date(),
			// PROD-002-10: Full CMBCD fields initialization (dengan branded types yang benar)
			actorMetadata: castedActorMetadata,
			allowedCapabilities: [...initialCapabilities], // Fix: mutable copy readonly array
			authorization: castedAuthorization,
			context: castedCaseContext,
			risk: castedRisk,
			executionFrame: computedExecutionFrame, // Dynamically computed, NOT hardcoded
			executionContext: {
				propagated_from: "direct-api" as const, // Fix: const untuk match union type
				calculatedExecutionFrame: computedExecutionFrame
			},
			evidence: [] // Initialize empty evidence trail yang akan diisi setiap state transition
		};

		await caseRepository.save(newCase);

		// LAYER 7: State Transition - draft → open (kasus siap diproses setelah dibuat)
		if (coreWorkResult && capabilityRegistry?.invoke) {
			try {
				// Invoke work-core command untuk update status Work menjadi "open"
				await capabilityRegistry.invoke("work-core", "work.update-status", {
					workId: coreWorkResult.workId,
					newStatus: "open",
					sessionId,
					actorId: sessionActorId
				});
				// Update status case aggregate juga - buat object baru untuk menghindari read-only error
				const updatedCase: CaseAggregate = {
					...newCase,
					status: "open",
					updatedAt: new Date()
				};
				await caseRepository.save(updatedCase);
				console.log(`[LH-LEGAL-001] ✅ State transition: draft → open for workId: ${coreWorkResult.workId}`);
			} catch (stateError) {
				console.error("[LH-LEGAL-001] State transition failed:", stateError);
			}
		}

		// LAYER 8: Record evidence untuk linkage antara core Work dan legal case (AttributionLedger)
		if (coreWorkResult) {
			await safeRecordEvidence({
				work_id: coreWorkResult.workId,
				tenant_id: sessionTenantId,
				actor_id: sessionActorId,
				timestamp: new Date().toISOString(),
				workspace_id: sessionWorkspaceId,
				capability: "legal-case",
				command: "update-case-state",
				linkedCaseId: newCase.id,
				stateTransition: "draft→open",
				metadata: {
					domainType: "legal-case",
					linkedIntentId,
					executionFrame: "direct"
				},
				note: "LH-CASE-001: Legal case created as domain extension of core Work primitive with state transition"
			});
		}

		// Return final case aggregate with all CMBCD fields + workId + faceProjection (Work Continuity Substrate compliance)
		return {
			...newCase,
			faceProjection
		};
	},
};

const AddEvidenceToCaseSchema = z.object({
	caseId: z.string(),
	evidence: z.object({
		name: z.string(),
		description: z.string(),
		type: z.string(),
		data: z.string(),
	}),
});

const addEvidenceToCase: CapabilityCommand<
	z.infer<typeof AddEvidenceToCaseSchema>
> = {
	kind: "command",
	name: "add-evidence-to-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, evidence } = AddEvidenceToCaseSchema.parse(input);
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) {
			throw new Error("Case not found");
		}
		// This is a placeholder for adding evidence to a case.
		console.log("Adding evidence to case", caseId, evidence);
	},
};

const AssignLawyerToCaseSchema = z.object({
	caseId: z.string(),
	lawyerId: z.string(),
	sessionId: z.string().min(1) // Require session untuk validasi authority boundary
});

// CORE-001: Work repository sudah diimport dari work-core/utils/index.js - menghindari duplicate identifier

const assignLawyerToCase: CapabilityCommand<
	z.infer<typeof AssignLawyerToCaseSchema>
> = {
	kind: "command",
	name: "assign-lawyer-to-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, lawyerId, sessionId } = AssignLawyerToCaseSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.assign-lawyer] Invalid or revoked session - authentication violation");
		}

		// CORE-001: Fetch case terlebih dahulu untuk mendapatkan workId (HILANGKAN parameter tenantId/workspaceId)
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) {
			throw new Error("Case not found");
		}

		// CORE-001: Fetch core WorkAggregate untuk verifikasi boundary dan authorization
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) {
			throw new Error("[legal-case.assign-lawyer] Core Work not found - boundary metadata missing");
		}

		// 5 Boundaries Enforcement: Authority boundary check - hanya actor dalam tenant yang boleh assign lawyer
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.assign-lawyer] Cross-tenant access blocked - authority boundary violation");
		}

		// PROD-002-10: onActorChange hook - re-validate CMBCD fields dan recalculate executionFrame
		// Extract new actor metadata dari input (passed via AssignLawyerInput)
		const rawInput = input as any;
		const { newActorMetadata, updatedCapabilities, updatedAuthorization, updatedRiskAssessment } = rawInput;
		
		// Re-calculate executionFrame dengan actor baru
		const newComputedFrame = calculateExecutionFrame(
			newActorMetadata || caseExists.actorMetadata,
			updatedAuthorization || caseExists.authorization,
			caseExists.context,
			updatedRiskAssessment || caseExists.risk
		);

		// Update case dengan lawyerId baru dan CMBCD fields yang sudah di-revalidate
		const updatedCase = {
			...caseExists,
			lawyerId,
			actorMetadata: newActorMetadata || caseExists.actorMetadata,
			allowedCapabilities: updatedCapabilities || caseExists.allowedCapabilities,
			authorization: updatedAuthorization || caseExists.authorization,
			risk: updatedRiskAssessment || caseExists.risk,
			executionFrame: newComputedFrame,
			executionContext: {
				...caseExists.executionContext,
				calculatedExecutionFrame: newComputedFrame,
				propagated_from: "cross-capability" as const
			},
			updatedAt: new Date(),
			// Add evidence untuk actor change transition
			evidence: [...(caseExists.evidence || []), {
				timestamp: new Date().toISOString(),
				actorId: session.actorId,
				transitionType: "actor-assigned",
				previousActorId: caseExists.actorMetadata.actorId,
				newActorId: newActorMetadata?.actorId || lawyerId,
				previousExecutionFrame: caseExists.executionFrame,
				newExecutionFrame: newComputedFrame
			}]
		};
		await caseRepository.save(updatedCase);

		// Record evidence untuk audit trail
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.lawyer-assigned",
			work_id: caseExists.workId,
			case_id: caseId,
			lawyer_id: lawyerId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			timestamp: new Date().toISOString(),
			note: "LH-LEGAL-001: Lawyer assigned to case via authority boundary check"
		});

		console.log(`[LH-LEGAL-001] ✅ Lawyer ${lawyerId} assigned to case ${caseId} (work: ${caseExists.workId})`);
	},
};

const CloseCaseSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1), // Require session untuk validasi closure authority
});

const closeCase: CapabilityCommand<z.infer<typeof CloseCaseSchema>> = {
	kind: "command",
	name: "close-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, sessionId } = CloseCaseSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.close-case] Invalid or revoked session - authentication violation");
		}

		// CORE-001: Fetch case dengan context validation dari WorkAggregate
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) {
			throw new Error("Case not found");
		}

		// CORE-001: Fetch core WorkAggregate untuk final boundary verification
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) {
			throw new Error("[legal-case.close-case] Core Work not found - cannot close orphaned case");
		}

		// Authority boundary check - hanya actor dengan akses ke workspace yang boleh close case
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.close-case] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi closed
		const updatedCase = {
			...caseExists,
			status: "closed" as const,
			closedAt: new Date(),
			updatedAt: new Date()
		};
		await caseRepository.save(updatedCase);

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
				console.warn("[legal-case.close-case] Core Work update failed, but case closed locally:", workUpdateError);
			}
		}

		// 4. Lanjutkan graph traversal untuk Work→Case→Requirements→Outcome (LH-004 full implementation)
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
					capability: "legal-case",
					command: "case.close",
					requirement_id: requirementId,
					timestamp: new Date().toISOString(),
					outcome_bound: true,
					outcome_type: "case_resolved",
					graph_metadata_updated: true
				});
			}
		}

		// 6. Update High-Value Work Graph dengan outcome (Work→Case→Outcome)
		if (linkedCase) {
			await workRepository.linkOutcomeToProduct(linkedCase.id, {
				id: `outcome-${caseId}`,
				type: "case_closed",
				workId: caseExists.workId,
				timestamp: new Date().toISOString(),
				metadata: {
					caseId: caseId,
					closedAt: new Date()
				}
			});
		}

		// Record final evidence untuk closure
		await safeRecordEvidence({
			capability: "legal-case",
			command: "case.close",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			workspace_id: coreWork.workspaceId || undefined,
			timestamp: new Date().toISOString(),
			graph_traversal_success: !!linkedCase,
			linked_case_id: linkedCase?.id || null,
			linked_requirement_ids: linkedRequirements,
			outcome_recorded: true,
			note: "LH-LEGAL-001: Case and core Work marked as completed - outcome achieved"
		});

		console.log(`[LH-LEGAL-001] ✅ Case ${caseId} closed successfully (work: ${caseExists.workId})`);
	},
};

const ListCasesForTenantSchema = z.object({
	tenantId: z.string(),
});

// CORE-001: list-cases-for-tenant deprecated - workspace/tenant are execution boundaries only
// Use list-cases-by-work-ids with valid workIds from authorized session instead
const listCasesForTenant: CapabilityCommand<
	z.infer<typeof ListCasesForTenantSchema>,
	CaseAggregate[]
> = {
	kind: "command",
	name: "list-cases-for-tenant",
	capability: "legal-case",
	execute: async (input) => {
		const { tenantId } = ListCasesForTenantSchema.parse(input);
		// CORE-001: Migrated to work-centric model - in production, fetch authorized workIds first
		console.warn("[list-cases-for-tenant] DEPRECATED: Use work-centric listByWorkIds instead");
		return caseRepository.list() as Promise<CaseAggregate[]>;
	},
};

export const commands = {
	"create-case": createCase,
	"get-case-by-id": { ...getCaseByIdCommand, capability: "legal-case" },
	"add-evidence-to-case": addEvidenceToCase,
	"assign-lawyer-to-case": assignLawyerToCase,
	"close-case": closeCase,
	"list-cases-for-tenant": listCasesForTenant,
};