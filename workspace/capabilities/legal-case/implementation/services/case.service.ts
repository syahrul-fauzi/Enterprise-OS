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
} from "../contracts";
import { createCase, closeCase, assignLawyer } from "../commands";
import { getCase, searchCases } from "../queries";
import { CaseRepositoryInMemory } from "../repository";

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

export * from "../contracts";
export * from "../commands";
export * from "../queries";
export * from "../repository";
