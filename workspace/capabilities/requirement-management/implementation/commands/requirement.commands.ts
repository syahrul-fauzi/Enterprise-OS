import type { CapabilityCommand } from "@repo/core-kernel";
import {
  type ApproveRequirementInput,
  type ApproveRequirementOutput,
  type CreateRequirementInput,
  type CreateRequirementOutput,
  type MarkRequirementImplementedInput,
  type MarkRequirementImplementedOutput,
  RequirementAggregate,
  type StartRequirementDeliveryInput,
  type StartRequirementDeliveryOutput,
  type UpdateRequirementInput,
  type UpdateRequirementOutput,
  type VerifyRequirementInput,
  type VerifyRequirementOutput,
} from "../contracts";
import {
  defaultRequirementPriority,
  defaultRequirementStatus,
  defaultRequirementVerificationStatus,
  newRequirementId,
  RequirementRepositoryCurrent,
} from "../repository";

type CreateRequirementCommand = CapabilityCommand<
  CreateRequirementInput,
  CreateRequirementOutput
>;
type UpdateRequirementCommand = CapabilityCommand<
  UpdateRequirementInput,
  UpdateRequirementOutput
>;
type ApproveRequirementCommand = CapabilityCommand<
  ApproveRequirementInput,
  ApproveRequirementOutput
>;
type StartRequirementDeliveryCommand = CapabilityCommand<
  StartRequirementDeliveryInput,
  StartRequirementDeliveryOutput
>;
type MarkRequirementImplementedCommand = CapabilityCommand<
  MarkRequirementImplementedInput,
  MarkRequirementImplementedOutput
>;
type VerifyRequirementCommand = CapabilityCommand<
  VerifyRequirementInput,
  VerifyRequirementOutput
>;

function trimOptional(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next && next.length > 0 ? next : undefined;
}

export const createRequirement: CreateRequirementCommand = {
  kind: "command",
  name: "requirement.create",
  version: "0.1.0",
  execute(input: CreateRequirementInput) {
    const title = input.title.trim();
    if (title.length === 0) {
      throw new Error("[requirement.create] Requirement title cannot be empty");
    }
    const now = new Date();
    const entity: RequirementAggregate = {
      id: newRequirementId(),
      title,
      ...(trimOptional(input.summary) !== undefined ? { summary: trimOptional(input.summary) } : {}),
      ...(trimOptional(input.description) !== undefined
        ? { description: trimOptional(input.description) }
        : {}),
      status: defaultRequirementStatus,
      priority: input.priority ?? defaultRequirementPriority,
      ...(trimOptional(input.owner) !== undefined ? { owner: trimOptional(input.owner) } : {}),
      ...(trimOptional(input.source) !== undefined ? { source: trimOptional(input.source) } : {}),
      linkedCapabilityIds: [...(input.linkedCapabilityIds ?? [])],
      acceptanceCriteria: [...(input.acceptanceCriteria ?? [])].map((item) => item.trim()).filter(Boolean),
      verificationStatus: defaultRequirementVerificationStatus,
      dependsOn: [],
      createdAt: now,
      updatedAt: now,
    };
    RequirementRepositoryCurrent.save(entity);
    return {
      id: entity.id,
      status: entity.status,
      verificationStatus: entity.verificationStatus,
      createdAt: now,
    };
  },
};

export const updateRequirement: UpdateRequirementCommand = {
  kind: "command",
  name: "requirement.update",
  version: "0.1.0",
  execute(input: UpdateRequirementInput) {
    const current = RequirementRepositoryCurrent.byId(input.id);
    if (current === undefined) {
      throw new Error(`[requirement.update] Requirement not found: ${input.id}`);
    }
    const next: RequirementAggregate = {
      ...current,
      ...(input.title !== undefined ? { title: input.title.trim() || current.title } : {}),
      ...(input.summary !== undefined ? { summary: trimOptional(input.summary) } : {}),
      ...(input.description !== undefined
        ? { description: trimOptional(input.description) }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.owner !== undefined ? { owner: trimOptional(input.owner) } : {}),
      ...(input.source !== undefined ? { source: trimOptional(input.source) } : {}),
      ...(input.linkedCapabilityIds !== undefined
        ? { linkedCapabilityIds: [...input.linkedCapabilityIds] }
        : {}),
      ...(input.acceptanceCriteria !== undefined
        ? {
            acceptanceCriteria: input.acceptanceCriteria
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : {}),
    };
    const saved = RequirementRepositoryCurrent.save(next);
    return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
  },
};

export const approveRequirement: ApproveRequirementCommand = {
  kind: "command",
  name: "requirement.approve",
  version: "0.1.0",
  execute(input: ApproveRequirementInput) {
    const current = RequirementRepositoryCurrent.byId(input.id);
    if (current === undefined) {
      throw new Error(`[requirement.approve] Requirement not found: ${input.id}`);
    }
    if (current.status !== "draft") {
      throw new Error(
        `[requirement.approve] Requirement must be in draft status before approval: ${input.id}`,
      );
    }
    const approvedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "approved",
      verificationStatus: "not_ready",
      approvedAt,
    };
    RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "approved", approvedAt };
  },
};

export const startRequirementDelivery: StartRequirementDeliveryCommand = {
  kind: "command",
  name: "requirement.startDelivery",
  version: "0.1.0",
  execute(input: StartRequirementDeliveryInput) {
    const current = RequirementRepositoryCurrent.byId(input.id);
    if (current === undefined) {
      throw new Error(`[requirement.startDelivery] Requirement not found: ${input.id}`);
    }
    if (current.status !== "approved") {
      throw new Error(
        `[requirement.startDelivery] Requirement must be approved before delivery starts: ${input.id}`,
      );
    }
    const next: RequirementAggregate = {
      ...current,
      status: "in_delivery",
      verificationStatus: "pending",
    };
    RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "in_delivery" };
  },
};

export const markRequirementImplemented: MarkRequirementImplementedCommand = {
  kind: "command",
  name: "requirement.markImplemented",
  version: "0.1.0",
  execute(input: MarkRequirementImplementedInput) {
    const current = RequirementRepositoryCurrent.byId(input.id);
    if (current === undefined) {
      throw new Error(`[requirement.markImplemented] Requirement not found: ${input.id}`);
    }
    if (current.status !== "in_delivery") {
      throw new Error(
        `[requirement.markImplemented] Requirement must be in delivery before implementation is recorded: ${input.id}`,
      );
    }
    const implementedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "implemented",
      verificationStatus: "pending",
      implementedAt,
    };
    RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "implemented", implementedAt };
  },
};

export const verifyRequirement: VerifyRequirementCommand = {
  kind: "command",
  name: "requirement.verify",
  version: "0.1.0",
  execute(input: VerifyRequirementInput) {
    const current = RequirementRepositoryCurrent.byId(input.id);
    if (current === undefined) {
      throw new Error(`[requirement.verify] Requirement not found: ${input.id}`);
    }
    if (current.status !== "implemented") {
      throw new Error(
        `[requirement.verify] Requirement must be implemented before verification: ${input.id}`,
      );
    }
    const verifiedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "verified",
      verificationStatus: "passed",
      verifiedAt,
    };
    RequirementRepositoryCurrent.save(next);
    return {
      id: next.id,
      status: "verified",
      verificationStatus: "passed",
      verifiedAt,
    };
  },
};

export const requirementCommands: Readonly<Record<string, CapabilityCommand>> = {
  "requirement.create": createRequirement,
  "requirement.update": updateRequirement,
  "requirement.approve": approveRequirement,
  "requirement.startDelivery": startRequirementDelivery,
  "requirement.markImplemented": markRequirementImplemented,
  "requirement.verify": verifyRequirement,
} as const;