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
} from "../contracts/index.js";
import { createCase, closeCase, assignLawyer } from "../commands/index.js";
import { getCase, searchCases } from "../queries/index.js";
import { CaseRepositoryInMemory } from "../repository/index.js";

export class CaseService {
  readonly repositories = { Case: CaseRepositoryInMemory } as const;

  createCase(input: CreateCaseInput): CreateCaseOutput {
    return createCase.execute(input) as CreateCaseOutput;
  }
  closeCase(input: CloseCaseInput): CloseCaseOutput {
    return closeCase.execute(input) as CloseCaseOutput;
  }
  assignLawyer(input: AssignLawyerInput): AssignLawyerOutput {
    return assignLawyer.execute(input) as AssignLawyerOutput;
  }
  getCase(input: GetCaseInput): GetCaseOutput {
    return getCase.execute(input) as GetCaseOutput;
  }
  searchCases(input: SearchCasesInput): SearchCasesOutput {
    return searchCases.execute(input) as SearchCasesOutput;
  }
  listCases(): readonly CaseAggregate[] {
    return CaseRepositoryInMemory.list();
  }
}

export const caseService = new CaseService();

export * from "../contracts/index.js";
export * from "../commands/index.js";
export * from "../queries/index.js";
export * from "../repository/index.js";
