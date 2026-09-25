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

  async createCase(input: CreateCaseInput & { linkedIntentId: string }): Promise<CreateCaseOutput> {
    // Map contract input to command schema that requires linkedIntentId
    const commandInput = {
      ...input,
      linkedIntentId: input.linkedIntentId,
    };
    return await createCase.execute(commandInput) as CreateCaseOutput;
  }
  async closeCase(input: CloseCaseInput): Promise<CloseCaseOutput> {
    // Map contract input (with id) to command schema that requires caseId
    const commandInput = {
      caseId: input.id,
    };
    return await closeCase.execute(commandInput) as CloseCaseOutput;
  }
  async assignLawyer(input: AssignLawyerInput): Promise<AssignLawyerOutput> {
    // Map contract input (with id) to command schema that requires caseId
    const commandInput = {
      caseId: input.id,
      lawyerId: input.lawyerId,
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