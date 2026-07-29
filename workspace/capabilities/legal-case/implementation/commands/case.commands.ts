import {
  AssignLawyerInput,
  AssignLawyerOutput,
  CaseAggregate,
  CaseId,
  CloseCaseInput,
  CloseCaseOutput,
  CreateCaseInput,
  CreateCaseOutput,
} from "../contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
import { CaseRepositoryInMemory, newCaseId, defaultCasePriority, defaultCaseStatus } from "../repository";

type CreateCaseCommand = CapabilityCommand<CreateCaseInput, CreateCaseOutput>;
type CloseCaseCommand = CapabilityCommand<CloseCaseInput, CloseCaseOutput>;
type AssignLawyerCommand = CapabilityCommand<AssignLawyerInput, AssignLawyerOutput>;

export const createCase: CreateCaseCommand = {
  kind: "command",
  name: "case.create",
  version: "0.1.0",
  execute(input) {
    const entity: CaseAggregate = {
      id: newCaseId(),
      title: input.title.trim(),
      ...(input.description !== undefined && input.description !== ""
        ? { description: input.description }
        : {}),
      status: defaultCaseStatus,
      priority: input.priority ?? defaultCasePriority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    CaseRepositoryInMemory.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const closeCase: CloseCaseCommand = {
  kind: "command",
  name: "case.close",
  version: "0.1.0",
  execute(input) {
    const current = CaseRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[case.close] Case not found: ${input.id}`);
    }
    if (current.status === "closed") {
      return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
    }
    const closedAt = new Date();
    const next: CaseAggregate = { ...current, status: "closed", closedAt };
    CaseRepositoryInMemory.save(next);
    return { id: next.id, status: "closed", closedAt };
  },
};

export const assignLawyer: AssignLawyerCommand = {
  kind: "command",
  name: "case.assignLawyer",
  version: "0.1.0",
  execute(input) {
    const current = CaseRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[case.assignLawyer] Case not found: ${input.id}`);
    }
    if (current.status === "closed") {
      throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${input.id}`);
    }
    const nextStatus: CaseAggregate["status"] =
      current.status === "draft" ? "open" : current.status;
    const next: CaseAggregate = {
      ...current,
      lawyerId: input.lawyerId,
      status: nextStatus,
    };
    CaseRepositoryInMemory.save(next);
    return { id: next.id, lawyerId: next.lawyerId!, status: next.status };
  },
};

export const caseCommands: Readonly<Record<string, CapabilityCommand>> = {
  "case.create": createCase,
  "case.close": closeCase,
  "case.assignLawyer": assignLawyer,
} as const;

export type { CreateCaseCommand, CloseCaseCommand, AssignLawyerCommand };

export function nextCaseId(): CaseId {
  return newCaseId();
}
