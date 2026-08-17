import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
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
} from "../contracts/index.js";
import {
  defaultRequirementPriority,
  defaultRequirementStatus,
  defaultRequirementVerificationStatus,
  newRequirementId,
  RequirementRepositoryCurrent,
} from "../repository/index.js";
import { getRequirementsByOwnerCommand } from "./get-requirements-by-owner.command.js";
import { getAllRequirementsCommand } from "./get-all-requirements.command.js";
import { getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";
import { SessionRepositoryInMemory } from "../../../identity/implementation/repositories/index.js";

// Toggle session repository based on environment — same pattern as legal-case.commands.ts
const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

// Initialize schema only in production Postgres mode, not per invocation
let schemaInitialized = false;
async function ensureIdentitySchema() {
  if (!schemaInitialized && process.env.DATABASE_URL) {
    await initIdentitySchema();
    schemaInitialized = true;
  }
}

const CreateRequirementWithContextSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  linkedCapabilityIds: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const UpdateRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  linkedCapabilityIds: z.array(z.string()).optional(),
  acceptanceCriteria: z.array(z.string()).optional(),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type CreateRequirementCommand = CapabilityCommand<
  z.infer<typeof CreateRequirementWithContextSchema>,
  Promise<CreateRequirementOutput>
>;
type UpdateRequirementCommand = CapabilityCommand<
  z.infer<typeof UpdateRequirementWithContextSchema>,
  Promise<UpdateRequirementOutput>
>;
type ApproveRequirementCommand = CapabilityCommand<
  z.infer<typeof ApproveRequirementWithContextSchema>,
  Promise<ApproveRequirementOutput>
>;
type StartRequirementDeliveryCommand = CapabilityCommand<
  z.infer<typeof StartRequirementDeliveryWithContextSchema>,
  Promise<StartRequirementDeliveryOutput>
>;
type MarkRequirementImplementedCommand = CapabilityCommand<
  z.infer<typeof MarkRequirementImplementedWithContextSchema>,
  Promise<MarkRequirementImplementedOutput>
>;
type VerifyRequirementCommand = CapabilityCommand<
  z.infer<typeof VerifyRequirementWithContextSchema>,
  Promise<VerifyRequirementOutput>
>;


function trimOptional(value: string | undefined): string | undefined {
  const next = value?.trim();
  return next && next.length > 0 ? next : undefined;
}

export const createRequirement: CreateRequirementCommand = {
  kind: "command",
  name: "requirement.create",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = CreateRequirementWithContextSchema.parse(input);
    const { 
      title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      tenantId, workspaceId, sessionId, actorId 
    } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.create] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.create] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.create] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.create] Cross-workspace access attempt blocked - security violation");
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      throw new Error("[requirement.create] Requirement title cannot be empty");
    }
    const now = new Date();
    const entityId = await newRequirementId();
    const entity: RequirementAggregate = {
      id: entityId,
      title: cleanTitle,
      ...(trimOptional(summary) !== undefined ? { summary: trimOptional(summary) } : {}),
      ...(trimOptional(description) !== undefined
        ? { description: trimOptional(description) }
        : {}),
      status: defaultRequirementStatus,
      priority: priority ?? defaultRequirementPriority,
      ...(trimOptional(owner) !== undefined ? { owner: trimOptional(owner) } : {}),
      ...(trimOptional(source) !== undefined ? { source: trimOptional(source) } : {}),
      linkedCapabilityIds: [...(linkedCapabilityIds ?? [])],
      acceptanceCriteria: [...(acceptanceCriteria ?? [])].map((item) => item.trim()).filter(Boolean),
      verificationStatus: defaultRequirementVerificationStatus,
      dependsOn: [],
      createdAt: now,
      updatedAt: now,
    };
    // Add tenant/workspace context for isolation
    (entity as any).tenantId = tenantId;
    (entity as any).workspaceId = workspaceId;
    await RequirementRepositoryCurrent.save(entity);
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
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = UpdateRequirementWithContextSchema.parse(input);
    const { 
      id, title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      tenantId, workspaceId, sessionId, actorId 
    } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.update] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.update] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.update] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.update] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.update] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same tenant/workspace
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[requirement.update] Requirement not found in workspace - security violation");
    }
    const next: RequirementAggregate = {
      ...current,
      ...(title !== undefined ? { title: title.trim() || current.title } : {}),
      ...(summary !== undefined ? { summary: trimOptional(summary) } : {}),
      ...(description !== undefined
        ? { description: trimOptional(description) }
        : {}),
      ...(priority !== undefined ? { priority: priority } : {}),
      ...(owner !== undefined ? { owner: trimOptional(owner) } : {}),
      ...(source !== undefined ? { source: trimOptional(source) } : {}),
      ...(linkedCapabilityIds !== undefined
        ? { linkedCapabilityIds: [...linkedCapabilityIds] }
        : {}),
      ...(acceptanceCriteria !== undefined
        ? {
            acceptanceCriteria: acceptanceCriteria
              .map((item) => item.trim())
              .filter(Boolean),
          }
        : {}),
    };
    const saved = await RequirementRepositoryCurrent.save(next);
    return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
  },
};

const ApproveRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const StartRequirementDeliveryWithContextSchema = z.object({
  id: z.string().min(1),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const MarkRequirementImplementedWithContextSchema = z.object({
  id: z.string().min(1),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

const VerifyRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  // Required context for tenant isolation
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});



export const approveRequirement: ApproveRequirementCommand = {
  kind: "command",
  name: "requirement.approve",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = ApproveRequirementWithContextSchema.parse(input);
    const { id, sessionId, tenantId, workspaceId, actorId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.approve] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.approve] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.approve] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.approve] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.approve] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same tenant/workspace
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[requirement.approve] Requirement not found in workspace - security violation");
    }
    if (current.status !== "draft") {
      throw new Error(
        `[requirement.approve] Requirement must be in draft status before approval: ${id}`,
      );
    }
    const approvedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "approved",
      verificationStatus: "not_ready",
      approvedAt,
    };
    await RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "approved", approvedAt };
  },
};

export const startRequirementDelivery: StartRequirementDeliveryCommand = {
  kind: "command",
  name: "requirement.startDelivery",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = StartRequirementDeliveryWithContextSchema.parse(input);
    const { id, sessionId, tenantId, workspaceId, actorId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.startDelivery] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.startDelivery] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.startDelivery] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.startDelivery] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.startDelivery] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same tenant/workspace
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[requirement.startDelivery] Requirement not found in workspace - security violation");
    }
    if (current.status !== "approved") {
      throw new Error(
        `[requirement.startDelivery] Requirement must be approved before delivery starts: ${id}`,
      );
    }
    const next: RequirementAggregate = {
      ...current,
      status: "in_delivery",
      verificationStatus: "pending",
    };
    await RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "in_delivery" };
  },
};

export const markRequirementImplemented: MarkRequirementImplementedCommand = {
  kind: "command",
  name: "requirement.markImplemented",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = MarkRequirementImplementedWithContextSchema.parse(input);
    const { id, sessionId, tenantId, workspaceId, actorId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.markImplemented] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.markImplemented] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.markImplemented] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.markImplemented] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.markImplemented] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same tenant/workspace
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[requirement.markImplemented] Requirement not found in workspace - security violation");
    }
    if (current.status !== "in_delivery") {
      throw new Error(
        `[requirement.markImplemented] Requirement must be in delivery before implementation is recorded: ${id}`,
      );
    }
    const implementedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "implemented",
      verificationStatus: "pending",
      implementedAt,
    };
    await RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "implemented", implementedAt };
  },
};

export const verifyRequirement: VerifyRequirementCommand = {
  kind: "command",
  name: "requirement.verify",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = VerifyRequirementWithContextSchema.parse(input);
    const { id, sessionId, tenantId, workspaceId, actorId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.verify] Invalid or revoked session - authentication violation");
    }

    // 2. Enforce actor match - session actor must match request actor
    if (session.actorId !== actorId) {
      throw new Error("[requirement.verify] Session actor mismatch - authentication violation");
    }

    // 3. Enforce tenant isolation - requested tenant must match session's tenant
    if (session.tenantId !== tenantId) {
      throw new Error("[requirement.verify] Cross-tenant access attempt blocked - security violation");
    }

    // 4. Enforce workspace isolation - requested workspace must match session's workspace
    if (session.workspaceId !== workspaceId) {
      throw new Error("[requirement.verify] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.verify] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same tenant/workspace
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[requirement.verify] Requirement not found in workspace - security violation");
    }
    if (current.status !== "implemented") {
      throw new Error(
        `[requirement.verify] Requirement must be implemented before verification: ${id}`,
      );
    }
    const verifiedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "verified",
      verificationStatus: "passed",
      verifiedAt,
    };
    await RequirementRepositoryCurrent.save(next);
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
  "requirement.getByOwner": getRequirementsByOwnerCommand,
  "requirement.getAll": getAllRequirementsCommand,
} as const;