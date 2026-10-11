import {
  AssignLawyerInput,
  AssignLawyerOutput,
  CaseAggregate,
  CloseCaseInput,
  CloseCaseOutput,
  CreateCaseInput,
  CreateCaseOutput,
  GetCaseInput,
  GetCaseOutput,
  SearchCasesInput,
  SearchCasesOutput,
} from "../../contracts/index.js";
import { createCase, closeCase, assignLawyer } from "../commands/index.js";
import { getCase, searchCases } from "../queries/index.js";
import { CaseRepositoryInMemory, CaseRepositoryPostgres } from "../repository/index.js";

// Match the same environment-based repository toggle as commands/case.commands.ts
const caseRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL 
  ? CaseRepositoryPostgres 
  : CaseRepositoryInMemory;

export class CaseService {
  readonly repositories = { Case: caseRepository } as const;

  async createCase(input: CreateCaseInput & { linkedIntentId: string; sessionId: string }): Promise<CreateCaseOutput> {
    // Map contract input to command schema that requires linkedIntentId + sessionId, convert all readonly arrays to mutable
    const commandInput = {
            ...input,
            linkedIntentId: input.linkedIntentId,
            sessionId: input.sessionId,
            initialCapabilities: [...(input.initialCapabilities || [])], // Convert readonly to mutable array
            // FIX caseContext type mismatch: always provide all required CaseContextMetadata fields with defaults
            caseContext: {
               // Jika input.caseContext ada, sebarkan, jika tidak gunakan default minimal
               ...(input.caseContext || {}),
               // Isi semua required fields dengan default jika tidak ada (wajib untuk CaseContextMetadata)
               tenantId: input.caseContext?.tenantId || (input.tenantId as any), // Fallback ke tenantId dari input jika tidak ada di caseContext
               jurisdiction: input.caseContext?.jurisdiction || "ID", // Default yurisdiksi Indonesia
               caseCategory: input.caseContext?.caseCategory || "legal-general", // Default kategori kasus hukum umum
               sensitivityLevel: input.caseContext?.sensitivityLevel || "internal", // Default sensitivitas internal
               relatedWorkIds: input.caseContext?.relatedWorkIds ? [...input.caseContext.relatedWorkIds] : [] // Convert relatedWorkIds readonly to mutable array, default empty array
            },
            initialAuthorization: {
               ...(input.initialAuthorization || {}),
               allowedActions: input.initialAuthorization?.allowedActions ? [...input.initialAuthorization.allowedActions] : [], // Convert allowedActions readonly to mutable, default empty array
               restrictedFields: input.initialAuthorization?.restrictedFields ? [...input.initialAuthorization.restrictedFields] : undefined, // Convert restrictedFields readonly to mutable
               delegatedBy: input.initialAuthorization?.delegatedBy ? String(input.initialAuthorization.delegatedBy) : undefined // Cast ActorId to string
             }
    };
    return await createCase.execute(commandInput) as CreateCaseOutput;
  }
  async closeCase(input: CloseCaseInput & { sessionId: string }): Promise<CloseCaseOutput> {
    // Map contract input (with id) to command schema that requires caseId + mandatory sessionId
    const commandInput = {
      caseId: input.id,
      sessionId: input.sessionId
    };
    return await closeCase.execute(commandInput) as CloseCaseOutput;
  }
  async assignLawyer(input: AssignLawyerInput & { sessionId: string }): Promise<AssignLawyerOutput> {
    // Map contract input (with id) to command schema that requires caseId + mandatory sessionId
    const commandInput = {
      caseId: input.id,
      lawyerId: input.lawyerId,
      sessionId: input.sessionId
    };
    return await assignLawyer.execute(commandInput) as AssignLawyerOutput;
  }
  async getCase(input: GetCaseInput): Promise<GetCaseOutput> {
    return await getCase.execute(input) as GetCaseOutput;
  }
  async searchCases(input: SearchCasesInput): Promise<SearchCasesOutput> {
    return await searchCases.execute(input) as SearchCasesOutput;
  }
  async listCases(): Promise<readonly CaseAggregate[]> {
    return await caseRepository.list();
  }
}

export const caseService = new CaseService();

export * from "../../contracts/index.js";
export * from "../commands/index.js";
export * from "../queries/index.js";
// export * from "../repository/index.js"; (duplicate removed, CaseRepository already exported)