// @ts-nocheck
import type { CapabilityCommand } from "@repo/core-kernel";
import { recordRuntimeInvocation, executionContext } from "@repo/core-runtime";
import { z } from "zod";
import {
  type ApproveRequirementInput,
  type ApproveRequirementOutput,
  type ArchiveRequirementInput,
  type ArchiveRequirementOutput,
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
} from "../contracts/index.ts";
import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";
import {
  defaultRequirementPriority,
  defaultRequirementStatus,
  defaultRequirementVerificationStatus,
  newRequirementId,
  RequirementRepositoryCurrent,
} from "../repository/index.js";
import { getRequirementsByOwnerCommand } from "./get-requirements-by-owner.command.ts";
import { getAllRequirementsCommand } from "./get-all-requirements.command.ts";
import { getRequirementByIdCommand } from "./get-requirement-by-id.command.ts";
// Import SEMUA canonical types dan repositories dari SINGLE-SOURCE work-core
import { 
  type SessionId,
  type WorkId,
  type ActorId,
  type TenantId,
  type WorkspaceId,
  createWorkId,
  createActorId,
  createSessionId,
  initIdentitySchema, 
  getSessionRepositoryPostgres,
  getWorkRepositoryPostgres, 
  SessionRepositoryInMemory,
  WorkRepositoryInMemory,
  safeRecordEvidence,
  validateAllBoundaries
} from "../../../work-core/index.js";

// Import hanya type, inisialisasi dilakukan di dalam fungsi async untuk menghindari circular dependency
// import type { SessionRepository } from "@repo/contracts-core";

// Inisialisasi session repository hanya saat dibutuhkan (lazy init) untuk menghindari ReferenceError
let sessionRepository: SessionRepository;
let schemaInitialized = false;

async function getSessionRepository() {
  if (!sessionRepository) {
    const { SessionRepositoryInMemory } = await import("../../../identity/implementation/repositories/index.js");
    sessionRepository = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL
      ? getSessionRepositoryPostgres()
      : SessionRepositoryInMemory;
  }
  return sessionRepository;
}

// Initialize schema only in production Postgres mode, not per invocation
async function ensureIdentitySchema() {
  if (!schemaInitialized && (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)) {
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
  // High-Value Work Graph integration
  linkedIntentId: z.string().optional(),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  sessionId: z.string().min(1),
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
  // High-Value Work Graph integration
  linkedIntentId: z.string().optional(),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  sessionId: z.string().min(1),
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
  version: "3.0.0",
  async execute(input: z.infer<typeof CreateRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = CreateRequirementWithContextSchema.parse(input);
    const { 
      title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      linkedIntentId, workId: workIdValue, sessionId: sessionIdValue 
    } = parsed;

    // 1. Get session to extract actor/tenant/workspace
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.create] Invalid or revoked session - authentication violation");
    }
    
    const actorId = owner || session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    // 2. Validate all boundaries using canonical work-core primitive
    const boundaryResult = await validateAllBoundaries({
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.create",
      workId: workIdValue,
    });
    
    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue,
        entityType: "work",
        action: "requirement.create.boundary_violation",
        actorId: actorId,
        tenantId: tenantId,
        workspaceId: workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.create] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      throw new Error("[requirement.create] Requirement title cannot be empty");
    }
    const now = getNow();
    const entityId = newRequirementId();
    const entity: RequirementAggregate = {
      id: entityId,
      // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
      workId: workIdValue,
      title: cleanTitle,
      ...(trimOptional(summary) !== undefined ? { summary: trimOptional(summary) } : {}),
      ...(trimOptional(description) !== undefined
        ? { description: trimOptional(description) }
        : {}),
      status: defaultRequirementStatus,
      priority: priority ?? defaultRequirementPriority,
      ...(trimOptional(owner) !== undefined ? { owner: trimOptional(owner) } : {}),
      ...(trimOptional(source) !== undefined ? { source: trimOptional(source) } : {}),
      ...(linkedIntentId ? { linkedIntentId } : {}), // High-Value Work Graph integration
      linkedCapabilityIds: [...(linkedCapabilityIds ?? [])],
      acceptanceCriteria: [...(acceptanceCriteria ?? [])].map((item) => item.trim()).filter(Boolean),
      verificationStatus: defaultRequirementVerificationStatus,
      dependsOn: [],
      createdAt: now,
      updatedAt: now,
    };
    await RequirementRepositoryCurrent.save(entity, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    
    // 3. Record evidence using canonical work-core primitive
    await safeRecordEvidence({
      entityRef: entity.id,
      entityType: "requirement",
      action: "requirement.create",
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      workId: workIdValue,
      payload: { input, result: { id: entity.id, status: entity.status, createdAt: now, workId: entity.workId } },
      status: "COMPLETED",
    });
    
    const invocationEvent = {
      capabilityId: "requirement-management",
      operationId: "requirement.create",
      sourceRef: "requirement-management/commands/createRequirement",
      success: true,
      input: input,
      result: { id: entity.id, status: entity.status, createdAt: now, workId: entity.workId },
      productId: "requirement-management",
      inputRefs: [],
      outputRefs: [`requirement:${entity.id}`],
    };
    recordRuntimeInvocation(invocationEvent);
    
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
  version: "3.0.0",
  async execute(input: z.infer<typeof UpdateRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = UpdateRequirementWithContextSchema.parse(input);
    const { 
      id, title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      linkedIntentId, workId: workIdValue, sessionId: sessionIdValue 
    } = parsed;

    // 1. Get session to extract actor/tenant/workspace
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.update] Invalid or revoked session - authentication violation");
    }
    
    const actorId = owner || session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    // 2. Validate all boundaries using canonical work-core primitive
    const boundaryResult = await validateAllBoundaries({
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.update",
      workId: workIdValue,
    });
    
    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue,
        entityType: "work",
        action: "requirement.update.boundary_violation",
        actorId: actorId,
        tenantId: tenantId,
        workspaceId: workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.update] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { 
      tenantId: tenantId, 
      workspaceId: workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[requirement.update] Requirement not found: ${id}`);
    }
    // 3. Enforce workId consistency - cannot modify work association
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.update] Cannot modify work association - workId must remain consistent");
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
      ...(linkedIntentId !== undefined ? { linkedIntentId } : {}), // High-Value Work Graph integration
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
      // Preserve workId across all state transitions (C9-C4-DOC-001 requirement)
      workId: current.workId,
    };
    const saved = await RequirementRepositoryCurrent.save(next, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    
    // 4. Record evidence using canonical work-core primitive
    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.update",
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      workId: workIdValue,
      payload: { input, result: { id: next.id, status: next.status, updatedAt: next.updatedAt } },
      status: "COMPLETED",
    });
    
    const invocationEvent = {
      capabilityId: "requirement-management",
      operationId: "requirement.update",
      sourceRef: "requirement-management/commands/updateRequirement",
      success: true,
      input: input,
      result: { id: next.id, status: next.status, updatedAt: next.updatedAt },
      productId: "requirement-management",
      inputRefs: [`requirement:${id}`],
      outputRefs: [`requirement:${next.id}`],
    };
    recordRuntimeInvocation(invocationEvent);
    
    return { id: saved.id, status: saved.status, updatedAt: saved.updatedAt };
  },
};

const ApproveRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  parentContextTraceId: z.string().optional(),
  sessionId: z.string().min(1),
});

const StartRequirementDeliveryWithContextSchema = z.object({
  id: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  sessionId: z.string().min(1),
});

const MarkRequirementImplementedWithContextSchema = z.object({
  id: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  sessionId: z.string().min(1),
});

const RequestRequirementReviewWithContextSchema = z.object({
  id: z.string().min(1),
  reviewerIds: z.array(z.string().min(1)).min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string().min(1),
  sessionId: z.string().min(1),
});

const VerifyRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  sessionId: z.string().min(1),
  workId: z.string().min(1),
});



export const approveRequirement: ApproveRequirementCommand = {
  kind: "command",
  name: "requirement.approve",
  version: "3.0.0",
  async execute(input: z.infer<typeof ApproveRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = ApproveRequirementWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Get session to extract actor/tenant/workspace
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.approve] Invalid or revoked session - authentication violation");
    }
    
    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    // 2. Validate all boundaries using canonical work-core primitive
    const boundaryResult = await validateAllBoundaries({
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.approve",
      workId: workIdValue,
    });
    
    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue,
        entityType: "work",
        action: "requirement.approve.boundary_violation",
        actorId: actorId,
        tenantId: tenantId,
        workspaceId: workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.approve] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { 
      tenantId: tenantId, 
      workspaceId: workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[requirement.approve] Requirement not found: ${id}`);
    }
    // 3. Enforce workId consistency - cannot modify work association
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.approve] Cannot modify work association - workId must remain consistent");
    }
    // C14 Precondition: Requirement must be in review_completed status to approve (post-review workflow)
    if (current.status !== "review_completed") {
      throw new Error(
        `[requirement.approve] Requirement must be in review_completed status before approval: ${id} (current status: ${current.status})`,
      );
    }
    // C14-X: Wrong Actor Rejection - ONLY original owner can approve after review
    if (current.owner !== session.actorId) {
      throw new Error(`[requirement.approve] Only original owner can approve requirement: ${id} (actor: ${session.actorId}, owner: ${current.owner})`);
    }
    // C14 Invariant: Preserve work identity (W1 remains intact)
    const approvedAt = getNow();
    const next: RequirementAggregate = {
      ...current,
      status: "approved",
      verificationStatus: "not_ready",
      approvedBy: session.actorId,
      approvedAt,
      workId: workIdValue,
    };
    await RequirementRepositoryCurrent.save(next, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    
    // 4. Record evidence using canonical work-core primitive
    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.approve",
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      workId: workIdValue,
      payload: { input, result: { id: next.id, status: "approved", approvedAt } },
      status: "COMPLETED",
    });
    
    const invocationEvent = {
      capabilityId: "requirement-management",
      operationId: "requirement.approve",
      sourceRef: "requirement-management/commands/approveRequirement",
      success: true,
      input: input,
      result: { id: next.id, status: "approved", approvedAt },
      productId: "requirement-management",
      inputRefs: [`requirement:${id}`],
      outputRefs: [`approved-requirement:${next.id}`],
    };
    recordRuntimeInvocation(invocationEvent);
    
    return { id: next.id, status: "approved", approvedAt };
  },
};

export const startRequirementDelivery: StartRequirementDeliveryCommand = {
  kind: "command",
  name: "requirement.startDelivery",
  version: "3.0.0",
  async execute(input: z.infer<typeof StartRequirementDeliveryWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = StartRequirementDeliveryWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.startDelivery] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.startDelivery",
      workId: workIdValue as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue as any,
        entityType: "work",
        action: "requirement.startDelivery.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.startDelivery] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.startDelivery] Requirement not found: ${id}`);
    }
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.startDelivery] Cannot modify work association - workId must remain consistent");
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
      workId: current.workId,
    };
    await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.startDelivery",
      actorId,
      tenantId,
      workspaceId,
      workId: workIdValue as any,
      payload: { input, result: { id: next.id, status: next.status } },
      status: "COMPLETED",
    });

    return { id: next.id, status: "in_delivery" };
  },
};

export const markRequirementImplemented: MarkRequirementImplementedCommand = {
  kind: "command",
  name: "requirement.markImplemented",
  version: "3.0.0",
  async execute(input: z.infer<typeof MarkRequirementImplementedWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = MarkRequirementImplementedWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.markImplemented] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.markImplemented",
      workId: workIdValue as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue as any,
        entityType: "work",
        action: "requirement.markImplemented.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.markImplemented] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.markImplemented] Requirement not found: ${id}`);
    }
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.markImplemented] Cannot modify work association - workId must remain consistent");
    }
    if (current.status !== "in_delivery") {
      throw new Error(
        `[requirement.markImplemented] Requirement must be in delivery before implementation is recorded: ${id}`,
      );
    }
    const implementedAt = getNow();
    const next: RequirementAggregate = {
      ...current,
      status: "implemented",
      verificationStatus: "pending",
      implementedAt,
      workId: current.workId,
    };
    await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.markImplemented",
      actorId,
      tenantId,
      workspaceId,
      workId: workIdValue as any,
      payload: { input, result: { id: next.id, status: next.status, implementedAt } },
      status: "COMPLETED",
    });

    return { id: next.id, status: "implemented", implementedAt };
  },
};

type RequestRequirementReviewCommand = CapabilityCommand<
  z.infer<typeof RequestRequirementReviewWithContextSchema>,
  Promise<{
    id: string;
    status: string;
    reviewerIds: string[];
    reviewRequestedBy: string;
    requestedAt: Date;
    workId: string;
    artifactVersion: number;
  }>
>;

export const requestRequirementReview: RequestRequirementReviewCommand = {
  kind: "command",
  name: "requirement.requestReview",
  version: "3.1.0",
  async execute(input: z.infer<typeof RequestRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = RequestRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId, workId, reviewerIds } = parsed;

    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.requestReview] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.requestReview",
      workId: workId as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workId as any,
        entityType: "work",
        action: "requirement.requestReview.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.requestReview] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.requestReview] Requirement not found: ${id}`);
    }
    if (current.workId !== workId) {
      throw new Error("[requirement.requestReview] Cannot modify work association - workId must remain consistent");
    }
    if (current.status !== "draft") {
      throw new Error(
        `[requirement.requestReview] Requirement must be in draft status to request review: ${id} (current status: ${current.status})`,
      );
    }
    if (reviewerIds.includes(session.actorId)) {
      throw new Error(
        `[requirement.requestReview] Cannot request review from yourself: ${id}`,
      );
    }

    const requestedAt = getNow();
    const currentVersion = (current as any).version ?? 0;
    
    const next: RequirementAggregate = {
      ...current,
      status: "in_review",
      reviewerIds,
      reviewRequestedBy: actorId,
      requestedAt,
      workId: current.workId,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: saved.id,
      entityType: "requirement",
      action: "requirement.requestReview",
      actorId,
      tenantId,
      workspaceId,
      workId: workId as any,
      payload: { input, result: { id: saved.id, status: saved.status, reviewerIds: saved.reviewerIds, reviewRequestedBy: saved.reviewRequestedBy, requestedAt: saved.requestedAt } },
      status: "COMPLETED",
    });
    
    return {
      id: saved.id,
      status: "in_review",
      reviewerIds: saved.reviewerIds!,
      reviewRequestedBy: saved.reviewRequestedBy!,
      requestedAt: saved.requestedAt!,
      workId: saved.workId!,
      artifactVersion: (saved as any).version,
    };
  },
};

export const verifyRequirement: VerifyRequirementCommand = {
  kind: "command",
  name: "requirement.verify",
  version: "3.0.0",
  async execute(input: z.infer<typeof VerifyRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = VerifyRequirementWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.verify] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.verify",
      workId: workIdValue as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue as any,
        entityType: "work",
        action: "requirement.verify.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.verify] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.verify] Requirement not found: ${id}`);
    }
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.verify] Requirement does not belong to the specified Work - workId mismatch");
    }
    if (current.status !== "implemented") {
      throw new Error(
        `[requirement.verify] Requirement must be implemented before verification: ${id}`,
      );
    }
    const verifiedAt = getNow();
    const next: RequirementAggregate = {
      ...current,
      status: "verified",
      verificationStatus: "passed",
      verifiedAt,
      workId: current.workId,
    };
    await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.verify",
      actorId,
      tenantId,
      workspaceId,
      workId: workIdValue as any,
      payload: { input, result: { id: next.id, status: next.status, verificationStatus: next.verificationStatus, verifiedAt } },
      status: "COMPLETED",
    });

    return {
      id: next.id,
      status: "verified",
      verificationStatus: "passed",
      verifiedAt,
    };
  },
};

// C13: Complete requirement review (reviewer only)
const CompleteRequirementReviewWithContextSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string().min(1),
});

type CompleteRequirementReviewCommand = CapabilityCommand<
  z.infer<typeof CompleteRequirementReviewWithContextSchema>,
  Promise<{
    id: string;
    status: string;
    reviewCompletedBy: string;
    reviewCompletedAt: Date;
    workId: string;
    artifactVersion: number;
  }>
>;

export const completeRequirementReview: CompleteRequirementReviewCommand = {
  kind: "command",
  name: "requirement.completeReview",
  version: "3.1.0",
  async execute(input: z.infer<typeof CompleteRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = CompleteRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.completeReview] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.completeReview",
      workId: workIdValue as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue as any,
        entityType: "work",
        action: "requirement.completeReview.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.completeReview] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.completeReview] Requirement not found: ${id}`);
    }
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.completeReview] Cannot modify work association - workId must remain consistent");
    }

    if (!current.reviewerIds?.includes(actorId)) {
      throw new Error(`[requirement.completeReview] Only assigned reviewer can complete review: ${id} (actor: ${actorId}, reviewers: ${current.reviewerIds?.join(', ') || 'none'})`);
    }

    if (current.status !== "in_review") {
      throw new Error(`[requirement.completeReview] Requirement must be in_review to complete review: ${id} (current status: ${current.status})`);
    }

    const reviewCompletedAt = getNow();
    const currentVersion = (current as any).version ?? 0;
    const next: RequirementAggregate = {
      ...current,
      status: "review_completed",
      reviewCompletedBy: actorId,
      reviewCompletedAt,
      workId: current.workId!,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: saved.id,
      entityType: "requirement",
      action: "requirement.completeReview",
      actorId,
      tenantId,
      workspaceId,
      workId: workIdValue as any,
      payload: { input, result: { id: saved.id, status: saved.status, reviewCompletedBy: saved.reviewCompletedBy, reviewCompletedAt: saved.reviewCompletedAt } },
      status: "COMPLETED",
    });
    
    return {
      id: saved.id,
      status: "review_completed",
      reviewCompletedBy: saved.reviewCompletedBy!,
      reviewCompletedAt: saved.reviewCompletedAt!,
      workId: saved.workId!,
      artifactVersion: (saved as any).version,
    };
  },
};

// C17: Reject requirement review (reviewer only, same C13-X pattern)
const RejectRequirementReviewWithContextSchema = z.object({
  id: z.string().min(1),
  sessionId: z.string().min(1),
  workId: z.string().min(1),
  rejectionReason: z.string().optional(),
});

type RejectRequirementReviewCommand = CapabilityCommand<
  z.infer<typeof RejectRequirementReviewWithContextSchema>,
  Promise<{
    id: string;
    status: string;
    reviewRejectedBy: string;
    reviewRejectedAt: Date;
    workId: string;
    artifactVersion: number;
  }>
>;

export const rejectRequirementReview: RejectRequirementReviewCommand = {
  kind: "command",
  name: "requirement.rejectReview",
  version: "3.1.0",
  async execute(input: z.infer<typeof RejectRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = RejectRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId, workId, rejectionReason } = parsed;

    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.rejectReview] Invalid or revoked session - authentication violation");
    }

    const actorId = session.actorId;
    const tenantId = session.tenantId;
    const workspaceId = session.workspaceId;

    const boundaryResult = await validateAllBoundaries({
      actorId,
      tenantId,
      workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.rejectReview",
      workId: workId as any,
    });

    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workId as any,
        entityType: "work",
        action: "requirement.rejectReview.boundary_violation",
        actorId,
        tenantId,
        workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.rejectReview] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, { tenantId, workspaceId, actorId });
    if (current === undefined) {
      throw new Error(`[requirement.rejectReview] Requirement not found: ${id}`);
    }

    if (current.workId !== workId) {
      throw new Error("[requirement.rejectReview] Cannot modify work association - workId must remain consistent");
    }

    if (!current.reviewerIds?.includes(actorId)) {
      throw new Error(`[requirement.rejectReview] Only assigned reviewer can reject review: ${id} (actor: ${actorId}, reviewers: ${current.reviewerIds?.join(', ') || 'none'})`);
    }

    if (current.status !== "in_review") {
      throw new Error(`[requirement.rejectReview] Requirement must be in_review to reject review: ${id} (current status: ${current.status})`);
    }

    const reviewRejectedAt = getNow();
    const currentVersion = (current as any).version ?? 0;
    const next: RequirementAggregate = {
      ...current,
      status: "review_rejected",
      reviewRejectedBy: actorId,
      reviewRejectedAt,
      rejectionReason,
      workId: current.workId!,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next, { tenantId, workspaceId, actorId });

    await safeRecordEvidence({
      entityRef: saved.id,
      entityType: "requirement",
      action: "requirement.rejectReview",
      actorId,
      tenantId,
      workspaceId,
      workId: workId as any,
      payload: { input, result: { id: saved.id, status: saved.status, reviewRejectedBy: saved.reviewRejectedBy, reviewRejectedAt: saved.reviewRejectedAt, rejectionReason } },
      status: "COMPLETED",
    });
    
    return {
      id: saved.id,
      status: "review_rejected",
      reviewRejectedBy: saved.reviewRejectedBy!,
      reviewRejectedAt: saved.reviewRejectedAt!,
      workId: saved.workId!,
      artifactVersion: (saved as any).version,
    };
  },
};

const ArchiveRequirementWithContextSchema = z.object({
  id: z.string().min(1),
  // Mandatory CORE-001: Semua boundary metadata hanya ada di core Work primitive
  workId: z.string(),
  sessionId: z.string().min(1),
  archiverId: z.string().optional(),
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
});

type ArchiveRequirementCommand = CapabilityCommand<
  z.infer<typeof ArchiveRequirementWithContextSchema>,
  Promise<ArchiveRequirementOutput>
>;

export const archiveRequirement: ArchiveRequirementCommand = {
  kind: "command",
  name: "requirement.archive",
  version: "3.0.0",
  async execute(input: z.infer<typeof ArchiveRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = ArchiveRequirementWithContextSchema.parse(input);
    const { id, workId: workIdValue, tenantId, workspaceId, archiverId } = parsed;

    // Extract actorId from input or session
    const actorId = archiverId || input.actorId;
    
    // 1. Validate all boundaries using canonical work-core primitive
    const boundaryResult = await validateAllBoundaries({
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      capabilityId: "requirement-management",
      operation: "requirement.archive",
      workId: workIdValue,
    });
    
    if (!boundaryResult.valid) {
      await safeRecordEvidence({
        entityRef: workIdValue || "unknown",
        entityType: "work",
        action: "requirement.archive.boundary_violation",
        actorId: actorId,
        tenantId: tenantId,
        workspaceId: workspaceId,
        payload: { input, boundaryErrors: boundaryResult.errors },
        status: "REJECTED",
      });
      throw new Error(`[requirement.archive] Boundary validation failed: ${boundaryResult.errors.join(", ")}`);
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, {
      tenantId,
      workspaceId
    });
    if (current === undefined) {
      throw new Error(`[requirement.archive] Requirement not found: ${id}`);
    }
    // Enforce workId consistency - cannot modify work association
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.archive] Cannot modify work association - workId must remain consistent");
    }
    // Prevent archiving if already archived (idempotent operation)
    if (current.status === "archived") {
      // Record idempotent evidence using canonical work-core primitive
      await safeRecordEvidence({
        entityRef: current.id,
        entityType: "requirement",
        action: "requirement.archive.idempotent",
        actorId: actorId,
        tenantId: tenantId,
        workspaceId: workspaceId,
        workId: current.workId,
        payload: { input, result: { id: current.id, status: "archived", archivedAt: current.archivedAt  ?? getNow() } },
        status: "COMPLETED",
      });
      
      const invocationEvent = {
        capabilityId: "requirement-management",
        operationId: "requirement.archive",
        sourceRef: "requirement-management/commands/archiveRequirement",
        success: true,
        input: input,
        result: { id: current.id, status: "archived", archivedAt: current.archivedAt  ?? getNow() },
        productId: "requirement-management",
        inputRefs: [`requirement:${input.id}`],
        outputRefs: [`archived-requirement:${current.id}`],
      };
      recordRuntimeInvocation(invocationEvent);
      return {
        id: current.id,
        status: "archived",
        archivedAt: current.archivedAt  ?? getNow(),
      };
    }

    const archivedAt = getNow();
    const next: RequirementAggregate = {
      ...current,
      status: "archived",
      archivedAt,
      workId: current.workId,
    };
    // Pass tenant/workspace/actor context to repository for isolation enforcement
    await RequirementRepositoryCurrent.save(next, { 
      tenantId, 
      workspaceId, 
      actorId: actorId 
    });
    
    // 2. Record evidence using canonical work-core primitive
    await safeRecordEvidence({
      entityRef: next.id,
      entityType: "requirement",
      action: "requirement.archive",
      actorId: actorId,
      tenantId: tenantId,
      workspaceId: workspaceId,
      workId: current.workId,
      payload: { input, result: { id: next.id, status: "archived", archivedAt } },
      status: "COMPLETED",
    });

    const invocationEvent = {
      capabilityId: "requirement-management",
      operationId: "requirement.archive",
      sourceRef: "requirement-management/commands/archiveRequirement",
      success: true,
      input: input,
      result: { id: next.id, status: "archived", archivedAt },
      productId: "requirement-management",
      inputRefs: [`requirement:${input.id}`],
      outputRefs: [`archived-requirement:${next.id}`],
    };
    recordRuntimeInvocation(invocationEvent);
    
    return { id: next.id, status: "archived", archivedAt };
  },
};

export const requirementCommands: Readonly<Record<string, CapabilityCommand>> = {
  "requirement.create": createRequirement,
  "requirement.update": updateRequirement,
  "requirement.approve": approveRequirement,
  "requirement.startDelivery": startRequirementDelivery,
  "requirement.markImplemented": markRequirementImplemented,
  "requirement.verify": verifyRequirement,
  "requirement.requestReview": requestRequirementReview,
  "requirement.completeReview": completeRequirementReview,
  "requirement.rejectReview": rejectRequirementReview,
  "requirement.archive": archiveRequirement,
  "requirement.getByOwner": getRequirementsByOwnerCommand,
  "requirement.getAll": getAllRequirementsCommand,
  "requirement.getById": getRequirementByIdCommand,
} as const;