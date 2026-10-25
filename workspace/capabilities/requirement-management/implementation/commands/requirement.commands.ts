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
// Import hanya type, inisialisasi dilakukan di dalam fungsi async untuk menghindari circular dependency
import type { SessionRepository } from "../../../work-core/index.js";
import { getSessionRepositoryPostgres, initIdentitySchema } from "../../../work-core/index.js";

// Inisialisasi session repository hanya saat dibutuhkan (lazy init) untuk menghindari ReferenceError
let sessionRepository: SessionRepository;
let schemaInitialized = false;

async function getSessionRepository() {
  if (!sessionRepository) {
    const { SessionRepositoryInMemory } = await import("../../../work-core/index.js");
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
  version: "2.0.0",
  async execute(input: z.infer<typeof CreateRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = CreateRequirementWithContextSchema.parse(input);
    const { 
      title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      linkedIntentId, workId: workIdValue, sessionId: sessionIdValue 
    } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.create] Invalid or revoked session - authentication violation");
    }

    const cleanTitle = title.trim();
    if (cleanTitle.length === 0) {
      throw new Error("[requirement.create] Requirement title cannot be empty");
    }
    const now = new Date();
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
  async execute(input: z.infer<typeof UpdateRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = UpdateRequirementWithContextSchema.parse(input);
    const { 
      id, title, summary, description, priority, owner, source, linkedCapabilityIds, acceptanceCriteria,
      linkedIntentId, workId: workIdValue, sessionId: sessionIdValue 
    } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.update] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.update] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
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
    const saved = await RequirementRepositoryCurrent.save(next);
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
  version: "2.0.0",
  async execute(input: z.infer<typeof ApproveRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = ApproveRequirementWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.approve] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.approve] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
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
    const approvedAt = new Date();
    const next: RequirementAggregate = {
      ...current,
      status: "approved",
      verificationStatus: "not_ready",
      approvedBy: session.actorId,
      approvedAt,
      workId,
    };
    await RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "approved", approvedAt };
  },
};

export const startRequirementDelivery: StartRequirementDeliveryCommand = {
  kind: "command",
  name: "requirement.startDelivery",
  version: "2.0.0",
  async execute(input: z.infer<typeof StartRequirementDeliveryWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = StartRequirementDeliveryWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.startDelivery] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.startDelivery] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
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
    await RequirementRepositoryCurrent.save(next);
    return { id: next.id, status: "in_delivery" };
  },
};

export const markRequirementImplemented: MarkRequirementImplementedCommand = {
  kind: "command",
  name: "requirement.markImplemented",
  version: "2.0.0",
  async execute(input: z.infer<typeof MarkRequirementImplementedWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = MarkRequirementImplementedWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.markImplemented] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.markImplemented] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
      throw new Error("[requirement.markImplemented] Cannot modify work association - workId must remain consistent");
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
      workId: current.workId,
    };
    await RequirementRepositoryCurrent.save(next);
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
  version: "3.0.0", // CORE-001 compliant version
  async execute(input: z.infer<typeof RequestRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = RequestRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId, workId, reviewerIds } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.requestReview] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.requestReview] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
      throw new Error("[requirement.requestReview] Cannot modify work association - workId must remain consistent");
    }
    // C12 Precondition: Requirement must be in draft status to request review
    if (current.status !== "draft") {
      throw new Error(
        `[requirement.requestReview] Requirement must be in draft status to request review: ${id} (current status: ${current.status})`,
      );
    }
    // Prevent requesting review to self (C18: check all reviewers against session actor)
    if (reviewerIds.includes(session.actorId)) {
      throw new Error(
        `[requirement.requestReview] Cannot request review from yourself: ${id}`,
      );
    }

    const requestedAt = new Date();
    // Initialize version if not exists (repository will increment automatically)
    const currentVersion = (current as any).version ?? 0;
    
    const next: RequirementAggregate = {
      ...current,
      status: "in_review",
      reviewerIds,
      reviewRequestedBy: session.actorId,
      requestedAt,
      workId: current.workId,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next);
    
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
  version: "2.0.0",
  async execute(input: z.infer<typeof VerifyRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = VerifyRequirementWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.verify] Invalid or revoked session - authentication violation");
    }

    // CORE-001: Ambil semua boundary metadata dari core Work primitive (single source of truth)
    const { getWorkRepositoryPostgres } = await import("../../../work-core/index.js");
    const workRepository = getWorkRepositoryPostgres();
    const coreWork = await workRepository.byWorkId(workIdValue as any);
    if (!coreWork) {
      throw new Error("[requirement.verify] Core Work not found - cannot bind verification to non-existent Work primitive");
    }

    // CORE-001: Verifikasi akses session actor ke core Work (authorization boundary enforcement)
    if (session.tenantId !== coreWork.tenantId) {
      throw new Error("[requirement.verify] Cross-tenant access attempt blocked - security violation");
    }
    if (session.workspaceId !== coreWork.workspaceId) {
      throw new Error("[requirement.verify] Cross-workspace access attempt blocked - security violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.verify] Requirement not found: ${id}`);
    }
    // 5. Enforce requirement belongs to the same Work (CORE-001 consistency check)
    if (current.workId !== workId) {
      throw new Error("[requirement.verify] Requirement does not belong to the specified Work - workId mismatch");
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
      workId: current.workId,
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
  version: "3.0.0", // CORE-001 compliant version
  async execute(input: z.infer<typeof CompleteRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = CompleteRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.completeReview] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.completeReview] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
      throw new Error("[requirement.completeReview] Cannot modify work association - workId must remain consistent");
    }

    // C13-X/C18: Core Wrong Actor Rejection - ONLY assigned reviewers can complete review
    if (!current.reviewerIds?.includes(session.actorId)) {
      throw new Error(`[requirement.completeReview] Only assigned reviewer can complete review: ${id} (actor: ${session.actorId}, reviewers: ${current.reviewerIds?.join(', ') || 'none'})`);
    }

    // 6. Enforce state transition: only in_review can become review_completed
    if (current.status !== "in_review") {
      throw new Error(`[requirement.completeReview] Requirement must be in_review to complete review: ${id} (current status: ${current.status})`);
    }

    const reviewCompletedAt = new Date();
    const currentVersion = (current as any).version ?? 0;
    const next: RequirementAggregate = {
      ...current,
      status: "review_completed",
      reviewCompletedBy: session.actorId,
      reviewCompletedAt,
      workId: current.workId!,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next);
    
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
  version: "3.0.0", // CORE-001 compliant version
  async execute(input: z.infer<typeof RejectRequirementReviewWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = RejectRequirementReviewWithContextSchema.parse(input);
    const { id, sessionId, workId, rejectionReason } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.rejectReview] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any);
    if (current === undefined) {
      throw new Error(`[requirement.rejectReview] Requirement not found: ${id}`);
    }

    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workId) {
      throw new Error("[requirement.rejectReview] Cannot modify work association - workId must remain consistent");
    }

    // C17-X/C18: Extend C13-X - ONLY assigned reviewers can reject review
    if (!current.reviewerIds?.includes(session.actorId)) {
      throw new Error(`[requirement.rejectReview] Only assigned reviewer can reject review: ${id} (actor: ${session.actorId}, reviewers: ${current.reviewerIds?.join(', ') || 'none'})`);
    }

    // 6. Enforce state transition: only in_review can become review_rejected
    if (current.status !== "in_review") {
      throw new Error(`[requirement.rejectReview] Requirement must be in_review to reject review: ${id} (current status: ${current.status})`);
    }

    const reviewRejectedAt = new Date();
    const currentVersion = (current as any).version ?? 0;
    const next: RequirementAggregate = {
      ...current,
      status: "review_rejected",
      reviewRejectedBy: session.actorId,
      reviewRejectedAt,
      rejectionReason,
      workId: current.workId!,
      version: currentVersion,
    };
    const saved = await RequirementRepositoryCurrent.save(next);
    
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
  version: "2.0.0",
  async execute(input: z.infer<typeof ArchiveRequirementWithContextSchema>) {
    await ensureIdentitySchema();
    
    const parsed = ArchiveRequirementWithContextSchema.parse(input);
    const { id, sessionId: sessionIdValue, workId: workIdValue, tenantId, workspaceId, archiverId } = parsed;

    // 1. Validate session exists and is active (enforce authentication)
    const session = await sessionRepository.byId(sessionIdValue as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[requirement.archive] Invalid or revoked session - authentication violation");
    }

    const current = await RequirementRepositoryCurrent.byId(id as any, {
      tenantId,
      workspaceId
    });
    if (current === undefined) {
      throw new Error(`[requirement.archive] Requirement not found: ${id}`);
    }
    // 2. Enforce workId consistency - cannot modify work association
    if (current.workId !== workIdValue) {
      throw new Error("[requirement.archive] Cannot modify work association - workId must remain consistent");
    }
    // 3. Prevent archiving if already archived (idempotent operation)
    if (current.status === "archived") {
      const invocationEvent = {
        capabilityId: "requirement-management",
        operationId: "requirement.archive",
        sourceRef: "requirement-management/commands/archiveRequirement",
        success: true,
        input: input,
        result: { id: current.id, status: "archived", archivedAt: current.archivedAt ?? new Date() },
        productId: "requirement-management",
        inputRefs: [`requirement:${input.id}`],
        outputRefs: [`archived-requirement:${current.id}`],
      };
      recordRuntimeInvocation(invocationEvent);
      return {
        id: current.id,
        status: "archived",
        archivedAt: current.archivedAt ?? new Date(),
      };
    }

    const archivedAt = new Date();
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
      actorId: archiverId || session.actorId 
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