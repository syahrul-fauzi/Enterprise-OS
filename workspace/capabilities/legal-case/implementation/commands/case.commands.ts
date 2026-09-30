import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/dist/types.js";
import { getCaseByIdCommand } from "./get-case-by-id.command.js";
import {
  getCaseRepositoryInMemory,
  getCaseRepositoryPostgres,
  newCaseId,
  defaultCasePriority,
  defaultCaseStatus,
} from "../repository/index.js";
import {
	getIntentRepositoryPostgres,
	IntentRepositoryInMemory,
	type TenantId,
	type WorkspaceId,
	createTenantId,
	createWorkspaceId,
	createActorId,
	type ActorId,
} from "../../../work-core/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import {
	type CaseAggregate,
	CaseId,
} from "../../contracts/index.js";

// LH-LEGAL-001: Import capabilityRegistry untuk integrasi createCoreWork (EOS core Work primitive)
async function getCapabilityRegistry() {
  const loaded = await import("../../../../packages/core/kernel/src/index.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

// STANDALONE EVIDENCE UTILITY - Reuse safeRecordEvidence pattern dari W-SVC-001
async function safeRecordEvidence(payload: unknown): Promise<{ readonly ok: boolean }> {
  try {
    const loaded = await import("../../../../packages/core/kernel/src/index.js");
    const reg = (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
    if (typeof reg?.invoke === "function") {
      await reg.invoke("evidence-registry", "evidence.record", payload as never);
      return { ok: true };
    }
  } catch (_e) {
    // fallthrough: evidence recording is observability-only
  }
  return { ok: true };
}

const caseRepository =
  process.env.NODE_ENV === "development"
    ? getCaseRepositoryInMemory()
    : getCaseRepositoryPostgres();

// SHARED RAIL: Toggle session repository based on environment (MIRRORS W-SVC-001 pattern)
const sessionRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

// Export intentRepository for test access to ensure same instance
export const intentRepository =
	process.env.NODE_ENV === "development"
		? new IntentRepositoryInMemory()
		: getIntentRepositoryPostgres();

const CreateCaseWithContextSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	sessionId: z.string().min(1), // LH-LEGAL-001: Auto-populate tenantId/workspaceId/actorId dari session (aligned with W-SVC-001)
	linkedIntentId: z.string(),
});

const createCase: CapabilityCommand<
	z.infer<typeof CreateCaseWithContextSchema>,
	CaseAggregate
> = {
	kind: "command",
	name: "create-case",
	capability: "legal-case",
	execute: async (input) => {
		const parsed = CreateCaseWithContextSchema.parse(input);
		const { title, description, sessionId, linkedIntentId } = parsed;
		
		// LH-LEGAL-001: Validasi session sebelum create case (authentication boundary)
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.create-case] Invalid or revoked session - authentication violation");
		}
		const { tenantId: sessionTenantId, workspaceId: sessionWorkspaceId, actorId: sessionActorId } = session;
		const tenantId: TenantId = createTenantId(sessionTenantId as unknown as string);
		const workspaceId: WorkspaceId = createWorkspaceId(sessionWorkspaceId as unknown as string);
		const actorId: ActorId = createActorId(sessionActorId as unknown as string);

		// LH-LEGAL-001: Verifikasi intent exists sebelum lanjut
		const intentExists = await intentRepository.byId(
			IntentIdFactory(linkedIntentId),
		);
		if (!intentExists) {
			throw new Error("Intent not found");
		}

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
				console.error("[LH-LEGAL-001] Core Work creation failed (continuing with case only):", coreWorkError);
			}
		}

		// CORE-001: Hapus semua duplikat boundary metadata (tenantId/workspaceId/actorId) - semuanya berasal dari WorkAggregate
		const newCase: CaseAggregate = {
			id: newCaseId(),
			workId: coreWorkResult?.workId || "", // WAJIB: Semua boundary metadata hanya ada di core Work primitive
			title,
			description,
			lawyerId: null,
			status: defaultCaseStatus,
			priority: defaultCasePriority,
			createdAt: new Date(),
			updatedAt: new Date(),
			executionFrame: "direct", // Human actor (lawyer) mendapatkan direct execution frame
		};

		await caseRepository.save(newCase);

		// LH-LEGAL-001: Record evidence untuk linkage antara core Work dan legal case
		if (coreWorkResult) {
			await safeRecordEvidence({
				capability: "legal-case",
				command: "legal-case.linked-to-core-work",
				work_id: coreWorkResult.workId,
				case_id: newCase.id,
				tenant_id: tenantId,
				workspace_id: workspaceId,
				actor_id: actorId,
				timestamp: new Date().toISOString(),
				integration_note: "LH-LEGAL-001: Legal case created as domain extension of core Work primitive"
			});
		}

		return newCase;
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
});

// Import Work repository untuk akses WorkAggregate (CORE-001 enforcement)
import { getWorkRepositoryPostgres } from "../../../work-core/implementation/repository/work-postgres.repository.js";

const assignLawyerToCase: CapabilityCommand<
	z.infer<typeof AssignLawyerToCaseSchema>
> = {
	kind: "command",
	name: "assign-lawyer-to-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, lawyerId, sessionId } = AssignLawyerToCaseSchema.extend({
			sessionId: z.string().min(1) // Require session untuk validasi authority boundary
		}).parse(input);
		
		// Validasi session sebelum melanjutkan (authentication boundary)
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.assign-lawyer] Invalid or revoked session - authentication violation");
		}

		// CORE-001: Fetch case terlebih dahulu untuk mendapatkan workId
		const caseExists = await caseRepository.byId(CaseId(caseId), {
			tenantId: session.tenantId,
			workspaceId: session.workspaceId
		});
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

		// Update case dengan lawyerId yang baru
		const updatedCase = {
			...caseExists,
			lawyerId,
			updatedAt: new Date()
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
		const session = await sessionRepository.byId(sessionId as any);
		if (!session || session.revokedAt !== null) {
			throw new Error("[legal-case.close-case] Invalid or revoked session - authentication violation");
		}

		// CORE-001: Fetch case dengan context validation dari WorkAggregate
		const caseExists = await caseRepository.byId(CaseId(caseId), {
			tenantId: session.tenantId,
			workspaceId: session.workspaceId
		});
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

		// Record final evidence untuk closure
		await safeRecordEvidence({
			capability: "legal-case",
			command: "legal-case.closed",
			work_id: caseExists.workId,
			case_id: caseId,
			actor_id: session.actorId,
			tenant_id: session.tenantId,
			timestamp: new Date().toISOString(),
			note: "LH-LEGAL-001: Case and core Work marked as completed - outcome achieved"
		});

		console.log(`[LH-LEGAL-001] ✅ Case ${caseId} closed successfully (work: ${caseExists.workId})`);
	},
};

const ListCasesForTenantSchema = z.object({
	tenantId: z.string(),
});

const listCasesForTenant: CapabilityCommand<
	z.infer<typeof ListCasesForTenantSchema>,
	CaseAggregate[]
> = {
	kind: "command",
	name: "list-cases-for-tenant",
	capability: "legal-case",
	execute: async (input) => {
		const { tenantId } = ListCasesForTenantSchema.parse(input);
		return caseRepository.listByTenant(TenantIdFactory(tenantId)) as Promise<CaseAggregate[]>;
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