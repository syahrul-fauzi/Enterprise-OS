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
} from "../../contracts/index";
import { createCase, closeCase, assignLawyer } from "../commands/index";
import { getCase, searchCases } from "../queries/index";
import { CaseRepositoryInMemory, CaseRepositoryPostgres } from "../repository/index";

// Match the same environment-based repository toggle as commands/case.commands.ts
const caseRepository = process.env.DATABASE_URL 
  ? CaseRepositoryPostgres 
  : new CaseRepositoryInMemory();

export class CaseService {
  readonly repositories = { Case: caseRepository } as const;

  async createCase(input: CreateCaseInput): Promise<CreateCaseOutput> {
    return await createCase.execute(input) as CreateCaseOutput;
  }
  async closeCase(input: CloseCaseInput): Promise<CloseCaseOutput> {
    return await closeCase.execute(input) as CloseCaseOutput;
  }
  async assignLawyer(input: AssignLawyerInput): Promise<AssignLawyerOutput> {
    return await assignLawyer.execute(input) as AssignLawyerOutput;
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