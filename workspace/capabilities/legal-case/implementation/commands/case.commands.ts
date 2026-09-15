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
} from "../../../identity/dist/implementation/repositories/index.js";
import {
	TenantId as TenantIdFactory,
	WorkspaceId as WorkspaceIdFactory,
	IntentId as IntentIdFactory,
} from "../../../identity/dist/implementation/contracts/index.js";

import {
	type CaseAggregate,
	CaseId,
} from "../../contracts/index.js";

const caseRepository =
  process.env.NODE_ENV === "development"
    ? getCaseRepositoryInMemory()
    : getCaseRepositoryPostgres();



// Export intentRepository for test access to ensure same instance
export const intentRepository =
	process.env.NODE_ENV === "development"
		? new IntentRepositoryInMemory()
		: getIntentRepositoryPostgres();

const CreateCaseWithContextSchema = z.object({
	title: z.string(),
	description: z.string().optional(),
	tenantId: z.string(),
	workspaceId: z.string(),
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
		const { title, description, tenantId, workspaceId } =
			CreateCaseWithContextSchema.parse(input);

		const intentExists = await intentRepository.byId(
			IntentIdFactory(CreateCaseWithContextSchema.parse(input).linkedIntentId),
		);

		if (!intentExists) {
			throw new Error("Intent not found");
		}

		const newCase: CaseAggregate = {
			id: newCaseId(),
			title,
			description,
			tenantId: TenantIdFactory(tenantId),
			workspaceId: WorkspaceIdFactory(workspaceId),
			status: defaultCaseStatus,
			priority: defaultCasePriority,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		await caseRepository.save(newCase);
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

const assignLawyerToCase: CapabilityCommand<
	z.infer<typeof AssignLawyerToCaseSchema>
> = {
	kind: "command",
	name: "assign-lawyer-to-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId, lawyerId } = AssignLawyerToCaseSchema.parse(input);
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) {
			throw new Error("Case not found");
		}
		// This is a placeholder for assigning a lawyer to a case.
		console.log("Assigning lawyer to case", caseId, lawyerId);
	},
};

const CloseCaseSchema = z.object({
	caseId: z.string(),
});

const closeCase: CapabilityCommand<z.infer<typeof CloseCaseSchema>> = {
	kind: "command",
	name: "close-case",
	capability: "legal-case",
	execute: async (input) => {
		const { caseId } = CloseCaseSchema.parse(input);
		const caseExists = await caseRepository.byId(CaseId(caseId));
		if (!caseExists) {
			throw new Error("Case not found");
		}
		// This is a placeholder for closing a case.
		console.log("Closing case", caseId);
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