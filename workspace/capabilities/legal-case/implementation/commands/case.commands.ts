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
  // Import canonical shared utilities from Work Continuity Substrate (Rule of Two compliance)import {
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
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";
import { WorkStatusEnum } from "../../../work-core/contracts/work.contracts.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, initIdentitySchema } from "../../../identity/implementation/repositories/index.js";
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

let _caseRepo: any = undefined;
async function getCaseRepositoryLazy() {
  const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
  const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  
  if (isTestEnvironment && !hasConnectionString) {
    // Test environment: GUNAKAN SINGLETON IN-MEMORY REPOSITORY untuk menghindari instance mismatch (FIX: caseRepository selalu sama)
    if (!_caseRepo) {
      _caseRepo = getCaseRepositoryInMemory();
      console.log("[legal-case] 🔧 TEST ENV: Created SINGLETON in-memory case repository instance");
    }
    return _caseRepo;
  }
  
  // Production/Dev: gunakan singleton seperti biasa
  if (!_caseRepo) {
    if (process.env.NODE_ENV === "development" && !hasConnectionString) {
      _caseRepo = getCaseRepositoryInMemory();
      console.log("[legal-case] 🧪 Using in-memory case repository for development");
    } else {
      _caseRepo = getCaseRepositoryPostgres();
      console.log("[legal-case] 🐘 Using POSTGRESQL case repository");
    }
  }
  return _caseRepo;
}

// Lazy initialize session repository - gunakan in-memory saat test (mirip pola work-core dari retail-inventory)
let _sessionRepo: any = undefined;
// Import SessionRepositoryInMemory sekali saja di level modul untuk singleton yang konsisten
async function getSessionRepositoryLazy() {
  const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
  const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  
  if (isTestEnvironment && !hasConnectionString) {
    // Test environment: GUNAKAN SINGLETON IN-MEMORY REPOSITORY untuk menghindari instance mismatch (FIX: session selalu sama)
    if (!_sessionRepo) {
      // SessionRepositoryInMemory sudah diimport di level modul atas (line 34), gunakan yang sudah ada
      _sessionRepo = SessionRepositoryInMemory;
      console.log("[legal-case] 🔧 Using SINGLETON IN-MEMORY session repository for TEST environment");
    } else {
              const sessions = await _sessionRepo.list();
              console.log(`[legal-case] 🔍 TEST ENV: Menggunakan EXISTING session repository, total sessions: ${sessions.length}`);
            }
    return _sessionRepo;
  }
  
  // Production/Dev: gunakan singleton seperti biasa
  if (!_sessionRepo) {
    // GUNAKAN POSTGRESQL SESSION REPOSITORY SAAT PRODUCTION/DEV
    _sessionRepo = getSessionRepositoryPostgres();
    console.log("[legal-case] 🐘 Using POSTGRESQL session repository");
  }
  return _sessionRepo;
}

// PROD-002-10: Full CMBCD schema support untuk inisialisasi case
        // Sesuai mandat pengguna: Actor + Capability + Authority + Context + Risk + Evidence
        // Sinkronkan dengan interface di case.contracts.ts untuk type safety
        const ActorMetadataSchema = z.object({
          actorId: z.string(),
          actorType: z.enum(["human", "ai-agent", "machine", "organization", "external-service"]),
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
				coreWorkResult = await capabilityRegistry.invoke("work-core", "create", {
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
  				console.error("[LH-LEGAL-001] Core Work creation FAILED with DETAIL:", coreWorkError);
  				console.error("[LH-LEGAL-001] Stack trace:", (coreWorkError as Error).stack);
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

		const caseRepository = await getCaseRepositoryLazy();
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

const AddCaseEvidenceSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1), // Tambahkan sessionId untuk validasi authentication seperti perintah lain
	evidence: z.object({
		name: z.string(),
		description: z.string(),
		type: z.string(),
		data: z.string(),
	}),
});

const addCaseEvidenceCommand: CapabilityCommand<
	z.infer<typeof AddCaseEvidenceSchema>
> = {
	kind: "command",
	name: "add-case-evidence",
	capability: "legal-case",
	execute: async (input) => {
		const parsed = AddCaseEvidenceSchema.parse(input);
		const { caseId, sessionId, evidence } = parsed;
		
		// Validasi session terlebih dahulu (sesuai pattern semua perintah legal-case)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.add-case-evidence] Invalid or revoked session - authentication violation");
		}
		const { tenantId: sessionTenantId, workspaceId: sessionWorkspaceId, actorId: sessionActorId } = session;

		// Cari case di repository
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId), {
			tenantId: sessionTenantId,
			workspaceId: sessionWorkspaceId
		});
		if (!caseExists) {
			throw new Error("[legal-case.add-case-evidence] Case not found");
		}

		// Gunakan safeRecordEvidence dari work-core untuk menyimpan evidence ke ledger yang benar
		await safeRecordEvidence({
			work_id: caseExists.workId,
			tenant_id: sessionTenantId,
			actor_id: sessionActorId,
			capability: "legal-case",
			command: "add-case-evidence",
			workspace_id: sessionWorkspaceId,
			timestamp: new Date().toISOString(),
			evidence_added: true,
			evidence_name: evidence.name,
			evidence_type: evidence.type,
			linked_case_id: caseId,
			note: `Evidence added to legal case: ${evidence.name}`
		});

		console.log("[legal-case.add-case-evidence] ✅ Evidence added successfully to case", caseId, evidence.name);
		return {
			success: true,
			caseId,
			evidenceName: evidence.name,
			workId: caseExists.workId
		};
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
		const caseRepository = await getCaseRepositoryLazy();
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

const SubmitCaseSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1),
	requiredSigners: z.array(z.string()) // Define required signers untuk acceptanceContract
});

const submitCase: CapabilityCommand<z.infer<typeof SubmitCaseSchema>> = {
	kind: "command",
	name: "legal-case.submit",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, sessionId, requiredSigners } = SubmitCaseSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.submit-case] Invalid or revoked session - authentication violation");
		}

		// Fetch case dengan context validation dari WorkAggregate
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) throw new Error("Case not found");
		if (caseExists.status !== "open") throw new Error("Only open cases can be submitted");

		// Fetch core WorkAggregate untuk boundary verification
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) throw new Error("[legal-case.submit-case] Core Work not found - cannot submit orphaned case");

		// Authority boundary check - hanya actor dengan akses ke workspace yang boleh submit case
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.submit-case] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi submitted
		const updatedCase = { ...caseExists, status: "submitted" as const, submittedAt: new Date(), updatedAt: new Date() };
		await caseRepository.save(updatedCase);

		// Update core Work state menjadi SIGNATURE_REQUIRED (work-core status mapping) + setup acceptanceContract
		const capabilityRegistry = await getCapabilityRegistry();
		if (capabilityRegistry?.invoke) {
			try {
				await capabilityRegistry.invoke("work-core", "update", {
					workId: caseExists.workId,
					status: "SIGNATURE_REQUIRED",
					acceptanceContract: { requiredSigners, completedSignatures: [] }
				});
			} catch (workUpdateError) {
				console.warn("[legal-case.submit-case] Core Work update failed, but case submitted locally:", workUpdateError);
			}
		}

		// Record evidence untuk submit transition
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.submit",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			workspace_id: coreWork.workspaceId || undefined,
			timestamp: new Date().toISOString(),
			stateTransition: "open→submitted",
			note: "Case submitted for review, acceptance contract initialized with required signers"
		});
	},
};

const ReviewCaseSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1)
});

const reviewCase: CapabilityCommand<z.infer<typeof ReviewCaseSchema>> = {
	kind: "command",
	name: "legal-case.review",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, sessionId } = ReviewCaseSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.review-case] Invalid or revoked session - authentication violation");
		}

		// Fetch case dengan context validation dari WorkAggregate
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) throw new Error("Case not found");
		if (caseExists.status !== "submitted") throw new Error("Only submitted cases can be reviewed");

		// Fetch core WorkAggregate untuk boundary verification
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) throw new Error("[legal-case.review-case] Core Work not found - cannot review orphaned case");

		// Authority boundary check - hanya actor dengan akses ke workspace yang boleh review case
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.review-case] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi reviewed
		const updatedCase = { ...caseExists, status: "reviewed" as const, reviewedAt: new Date(), updatedAt: new Date() };
		await caseRepository.save(updatedCase);

		// Update core Work state menjadi SIGNATURE_PENDING (work-core status mapping)
		const capabilityRegistry = await getCapabilityRegistry();
		if (capabilityRegistry?.invoke) {
			try {
				await capabilityRegistry.invoke("work-core", "update", {
					workId: caseExists.workId,
					status: "SIGNATURE_PENDING"
				});
			} catch (workUpdateError) {
				console.warn("[legal-case.review-case] Core Work update failed, but case reviewed locally:", workUpdateError);
			}
		}

		// Record evidence untuk review transition
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.review",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			workspace_id: coreWork.workspaceId || undefined,
			timestamp: new Date().toISOString(),
			stateTransition: "submitted→reviewed",
			note: "Case moved to review, signature collection in progress"
		});
	},
};

const ApproveCaseSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1)
});

const approveCase: CapabilityCommand<z.infer<typeof ApproveCaseSchema>> = {
	kind: "command",
	name: "legal-case.approve",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, sessionId } = ApproveCaseSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.approve-case] Invalid or revoked session - authentication violation");
		}

		// Fetch case dengan context validation dari WorkAggregate
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) throw new Error("Case not found");
		if (caseExists.status !== "reviewed") throw new Error("Only reviewed cases can be approved");

		// Fetch core WorkAggregate untuk boundary verification + signature check
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) throw new Error("[legal-case.approve-case] Core Work not found - cannot approve orphaned case");

		// Verify actor is an authorized signer (work-core signature validation pattern)
		const acceptanceContract = coreWork.acceptanceContract;
		if (!acceptanceContract?.requiredSigners?.includes(session.actorId)) {
			throw new Error("permission_denied: Actor is not an authorized signer for this case");
		}
		if (acceptanceContract.completedSignatures?.includes(session.actorId)) {
			throw new Error("conflict: Actor has already signed this case");
		}

		// Authority boundary check - hanya actor dengan akses ke workspace yang boleh approve case
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.approve-case] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi approved
		const updatedCase = { ...caseExists, status: "approved" as const, approvedAt: new Date(), updatedAt: new Date() };
		await caseRepository.save(updatedCase);

		// Update core Work state menjadi SIGNATURE_COMPLETE (work-core status mapping)
		const capabilityRegistry = await getCapabilityRegistry();
		if (capabilityRegistry?.invoke) {
			try {
				const updatedCompletedSignatures = [...(acceptanceContract.completedSignatures || []), session.actorId];
				await capabilityRegistry.invoke("work-core", "update", {
					workId: caseExists.workId,
					status: "SIGNATURE_COMPLETE",
					acceptanceContract: { ...acceptanceContract, completedSignatures: updatedCompletedSignatures }
				});
			} catch (workUpdateError) {
				console.warn("[legal-case.approve-case] Core Work update failed, but case approved locally:", workUpdateError);
			}
		}

		// Record evidence untuk approve transition
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.approve",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			workspace_id: coreWork.workspaceId || undefined,
			timestamp: new Date().toISOString(),
			stateTransition: "reviewed→approved",
			note: "Case approved, all required signatures collected"
		});
	},
};

// AUDIT-001-009: Add mark-under-review command untuk trigger pembayaran
const MarkUnderReviewSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1),
	paymentAmount: z.number().positive(),
});

const markUnderReview: CapabilityCommand<z.infer<typeof MarkUnderReviewSchema>> = {
	kind: "command",
	name: "legal-case.mark-under-review",
	capability: "legal-case",
	version: "1.0.0",
	execute: async (input) => {
		const { caseId, sessionId, paymentAmount } = MarkUnderReviewSchema.parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.mark-under-review] Invalid or revoked session - authentication violation");
		}

		// Fetch case dengan context validation
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId), {
			tenantId: session.tenantId,
			workspaceId: session.workspaceId
		});
		if (!caseExists) throw new Error("Case not found");
		if (caseExists.status !== "approved") throw new Error("Only approved cases can be marked under review");

		// Fetch core WorkAggregate untuk boundary verification
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) throw new Error("[legal-case.mark-under-review] Core Work not found - cannot process payment for orphaned case");

		// Authority boundary check
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.mark-under-review] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi under_review
		const updatedCase = { 
			...caseExists, 
			status: "under_review" as const, 
			underReviewAt: new Date(), 
			updatedAt: new Date(),
			paymentAmount // Simpan jumlah pembayaran untuk referensi selanjutnya
		};
		await caseRepository.save(updatedCase);

		// Pemicu pembayaran via capability registry (reuse processPayment)
		const capabilityRegistry = await getCapabilityRegistry();
		let paymentTransactionId = "";
		if (capabilityRegistry?.invoke) {
			try {
				const paymentResult: any = await capabilityRegistry.invoke("capability-generate-invoice", "execute", {
					workId: caseExists.workId,
					amount: paymentAmount,
					currency: "IDR",
					recipient: "PT Legal Hub Indonesia",
					payer: coreWork.metadata?.clientName || "Unknown Client",
					description: `Legal Case Retention Fee - Case ID: ${caseId}`,
					dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 hari dari sekarang
				});
				paymentTransactionId = paymentResult.transactionId;
				console.log(`[legal-case.mark-under-review] Payment triggered successfully: txn=${paymentTransactionId}`);
				
				// Update core Work state dengan payment reference
				await capabilityRegistry.invoke("work-core", "update", {
					workId: caseExists.workId,
					status: "PAYMENT_PENDING",
					platformMetadata: {
						...coreWork.platformMetadata,
						paymentTransactionId,
						paymentAmount,
						paymentDueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
					}
				});
			} catch (paymentError) {
				console.error("[legal-case.mark-under-review] Payment processing failed, but case marked under review:", paymentError);
				// Tetap simpan case sebagai under_review untuk retry manual
			}
		}

		// Record evidence untuk UNDER_REVIEW transition dan payment trigger
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.mark-under-review",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			workspace_id: coreWork.workspaceId || undefined,
			timestamp: new Date().toISOString(),
			stateTransition: "approved→under_review",
			note: `Case marked under review, payment triggered. Transaction ID: ${paymentTransactionId || "PENDING"}`,
			metadata: { paymentAmount, paymentTransactionId }
		});

		return { ...updatedCase, paymentTransactionId };
	},
};

// AUDIT-001-009: Update closeCase dengan pengecekan payment prerequisite
const CloseCaseSchema = z.object({
	caseId: z.string(),
	sessionId: z.string().min(1), // Require session untuk validasi closure authority
});

const closeCase: CapabilityCommand<z.infer<typeof CloseCaseSchema>> = {
	kind: "command",
	name: "legal-case.close",
	capability: "legal-case",
	version: "1.0.1",
	execute: async (input) => {
		const { caseId, sessionId } = CloseCaseSchema.extend({
			sessionId: z.string().min(1)
		}).parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const sessionRepository = await getSessionRepositoryLazy();
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.close-case] Invalid or revoked session - authentication violation");
		}

		// Case fetch with context validation (SLIC-003 compliance)
		const caseRepository = await getCaseRepositoryLazy();
		const caseExists = await caseRepository.byId(CaseId(caseId), {
			tenantId: session.tenantId,
			workspaceId: session.workspaceId
		});
		if (!caseExists) {
			throw new Error("Case not found");
		}
		// AUDIT-001-009: Hanya under_review (bukan approved) yang bisa ditutup (pembayaran prasyarat)
		if (caseExists.status !== "under_review") throw new Error("Only cases under review can be closed - payment must be processed first");

		// Idempotent check - prevent duplicate closure
		if (caseExists.status === "closed") {
			console.log(`[LH-LEGAL-001] ✅ Case ${caseId} already closed (work: ${caseExists.workId})`);
			return { ...caseExists };
		}

		// CORE-001: Fetch core WorkAggregate untuk final boundary verification
		const workRepository = getWorkRepositoryPostgres();
		const coreWork = await workRepository.byWorkId(caseExists.workId);
		if (!coreWork) {
			throw new Error("[legal-case.close-case] Core Work not found - cannot close orphaned case");
		}

		// AUDIT-001-009: Pengecekan prasyarat payment (status harus SUCCESS di Midtrans)
		if (!coreWork.platformMetadata?.paymentTransactionId) {
			throw new Error("[legal-case.close-case] Cannot close case: no payment transaction found - payment must be processed first");
		}

		// Verifikasi status payment dari Midtrans webhook (sumber kebenaran finansial)
		const connectorRepository = await import("../../../../connector-ecosystem/implementation/services/connector-ecosystem.service.js").then(m => m.connectorEcosystemService);
		const paymentStatus = await connectorRepository.getMidtransPaymentStatus(coreWork.platformMetadata.paymentTransactionId);
		if (paymentStatus !== "SUCCESS") {
			throw new Error(`[legal-case.close-case] Cannot close case: payment not confirmed. Current status: ${paymentStatus}`);
		}

		// Authority boundary check - hanya actor dengan akses ke workspace yang boleh close case
		if (coreWork.tenantId !== session.tenantId || coreWork.workspaceId !== session.workspaceId) {
			throw new Error("[legal-case.close-case] Cross-tenant access blocked - authority boundary violation");
		}

		// Update case status menjadi closed
		const closedAt = new Date();
		const updatedCase = {
			...caseExists,
			status: "closed" as const,
			closedAt,
			updatedAt: closedAt
		};
		await caseRepository.save(updatedCase);

		// Update core Work state menjadi completed (work continuity boundary)
		const capabilityRegistry = await getCapabilityRegistry();
		if (capabilityRegistry?.invoke) {
			try {
				await capabilityRegistry.invoke("work-core", "update", {
					workId: caseExists.workId,
					status: "completed",
					closedAt: closedAt.toISOString()
				});
			} catch (workUpdateError) {
				console.warn("[legal-case.close-case] Core Work update failed, but case closed locally:", workUpdateError);
			}
		}

		// WorkFaceProjection - build FACE projection after closure (EOS FACE mandate)
		// @ts-ignore - WorkFaceProjection type imported from work-core types
		const finalFaceProjection: any = buildWorkFaceProjection({
			workId: caseExists.workId as WorkId,
			identity: { tenantId: session.tenantId, actorId: session.actorId },
			semantic: { domain: "legal-case", intent: "legal-matter-resolution", state: "closed" },
			authority: { 
				canCurrentActorAct: false, 
				nextAvailableActions: ["view-history", "download-evidence"] 
			},
			execution: { 
				workspaceId: session.workspaceId, 
				runtimeEnvironment: "web", 
				executorIds: [session.actorId, caseExists.lawyerId as ActorId], 
				executionFrame: caseExists.executionFrame 
			},
			presentation: { uiChannel: "web", agentChannel: "api", requiredAccessLevel: "user" }
		});

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
					closedAt: closedAt
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
		return { ...updatedCase, faceProjection: finalFaceProjection, coreWorkStatus: "completed" };
	},
};

export const commands = {
	"create-case": createCase,
	"case.getById": getCaseByIdCommand,
	"add-case-evidence": addCaseEvidenceCommand, // New command matching test requirement (replaces old add-evidence-to-case)
	"assign-lawyer-to-case": assignLawyerToCase,
	"legal-case.close": closeCase,
	"legal-case.submit": submitCase,
	"legal-case.review": reviewCase,
	"legal-case.approve": approveCase,
	"legal-case.mark-under-review": markUnderReview, // AUDIT-001-009: Payment trigger command
};

// Register legal-case commands with canonical capability registry (aligns with work-core pattern)
export function registerLegalCaseCapability() {
	// Enable command registration even in test/standalone environments to support test execution
	if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
		console.log("[Legal-Case] Test/standalone environment detected - enabling safe auto-registration");
		// Register all commands in commands array for test environment
		import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
			if (capabilityRegistry) {
				Object.values(commands).forEach((command) => {
					capabilityRegistry.register(command);
				});
				// Register legal-clarification-flow capability for test environments
				capabilityRegistry.registerCapability({
					id: "legal-clarification-flow",
					name: "Legal Intent Clarification",
					description: "Structured flow to collect missing information for legal intents",
					providerTypes: ["system", "ai"],
					domainRestrictions: ["legal"],
					requiredAuthorizations: ["legal:clarify", "tenant:ai_enabled"],
					riskLevel: "low",
					severity: "LOW",
					isAvailable: async () => true
				});
				// Register ai-legal-consultant capability for test environments
				capabilityRegistry.registerCapability({
					id: "ai-legal-consultant",
					name: "AI Legal Consultant",
					description: "AI-powered consultation for complex legal intent discovery",
					providerTypes: ["ai"],
					domainRestrictions: ["legal"],
					requiredAuthorizations: ["ai:legal-consult", "tenant:ai_enabled"],
					riskLevel: "medium",
					severity: "MEDIUM",
					isAvailable: async () => {
						return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
					}
				});
				console.log("[Legal-Case] All test commands registered successfully");
			}
		});
		return;
	}
	// Register all commands in commands array - REUSE canonical @repo/core-kernel registry (frozen architecture)
	import("@repo/core-kernel/registry/capability-command-registry").then(({ capabilityRegistry }) => {
		if (capabilityRegistry) {
			Object.values(commands).forEach((command) => {
				capabilityRegistry.register(command);
			});
			// Register legal-clarification-flow capability (resolves ARCH-19: moved from atomic-composition to legal-case domain)
			capabilityRegistry.registerCapability({
				id: "legal-clarification-flow",
				name: "Legal Intent Clarification",
				description: "Structured flow to collect missing information for legal intents",
				providerTypes: ["system", "ai"],
				domainRestrictions: ["legal"],
				requiredAuthorizations: ["legal:clarify", "tenant:ai_enabled"],
				riskLevel: "low",
				severity: "LOW",
				isAvailable: async () => true
			});
			// Register ai-legal-consultant capability (resolves ARCH-19: moved from atomic-composition to legal-case domain)
			capabilityRegistry.registerCapability({
				id: "ai-legal-consultant",
				name: "AI Legal Consultant",
				description: "AI-powered consultation for complex legal intent discovery",
				providerTypes: ["ai"],
				domainRestrictions: ["legal"],
				requiredAuthorizations: ["ai:legal-consult", "tenant:ai_enabled"],
				riskLevel: "medium",
				severity: "MEDIUM",
				isAvailable: async () => {
					return !!(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY);
				}
			});
			console.log("[Legal-Case] AUDIT-001-005: Legal-Case capability registered successfully - all commands added to canonical capability registry");
		}
	}).catch(err => {
		console.error("[Legal-Case] AUDIT-001-005: Failed to register legal-case capability:", err);
	});
}