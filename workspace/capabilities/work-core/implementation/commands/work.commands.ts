import { z } from "zod";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import type { WorkAggregate } from "../../contracts/work.contracts";
import { SessionId, TenantId, ActorId } from "../../contracts/work.contracts";
import { WorkRepositoryPostgres } from "../repository/work-postgres.repository";
import { getMembershipRepositoryPostgres, type MembershipRepository } from "../../../identity/implementation/repositories/membership.repository";
import { getWorksByInstitutionCommand } from "./get-works-by-institution.command";

import { WorkModeEnum } from "../../contracts/work.contracts";

// Core Work schema - EOS primitive continuity substrate
export const CreateCoreWorkRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  linkedIntentId: z.string().optional(),
  domainType: z.enum(["legal-case", "service-request", "consultation", "generic"]).default("generic"),
  workMode: z.enum(WorkModeEnum).default("oneshot"),
  domainSpecificData: z.record(z.string(), z.any()).optional(),
  
  // Mandatory session context for all Work creations
  sessionId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
});

export type CreateCoreWorkRequest = z.infer<typeof CreateCoreWorkRequestSchema>;

// Core Work aggregate implementation
async function createCoreWork(input: CreateCoreWorkRequest): Promise<{ id: string; workId: string; domainType: string }> {
  const workRepository = new WorkRepositoryPostgres();
  
  // 1. Create core Work primitive first (EOS substrate)
  const coreWork: Partial<WorkAggregate> = {
    title: input.title,
    description: input.description,
    priority: input.priority || "medium",
    linkedIntentId: input.linkedIntentId,
    domainType: input.domainType,
    workMode: input.workMode,
    sessionId: input.sessionId as any,
    tenantId: input.tenantId as any,
    workspaceId: input.workspaceId,
    actorId: input.actorId as any,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
  
  const savedWork = await workRepository.save(coreWork);
  
  // Panggil atomic-composition untuk compose tim dari requirements
  const compositionResult = await capabilityRegistry.invokeAsync(
          "atomic-composition",
           "composeTeamFromRequirements",
           {
             workId: savedWork.workId,
             work: savedWork,
             requirements: [],
             availableActors: [],
             availableCapabilities: [],
             workspaceId: input.workspaceId,
             tenantId: input.tenantId, // Tambahkan tenantId untuk memenuhi authentication guard requirement
             sessionId: input.sessionId, // Tambahkan sessionId
             actorId: input.actorId // Tambahkan actorId
           }
        );
  
  // 3. Gunakan compositionId dari hasil atomic-composition (TEST ENVIRONMENT BYPASS DIHAPUS - dependency sudah terdaftar)
  const compositionId = (compositionResult as any).compositionId;
  const updatedWork = {
    ...savedWork,
    compositionId,
    status: "active" as const,
    updatedAt: new Date().toISOString(),
  };
  await workRepository.save(updatedWork);
  
  // 4. Delegate to domain specialization capability based on domainType
  const domainCapabilityMap: Record<string, { capability: string; command: string }> = {
    "legal-case": { capability: "legal-case", command: "case.createFromWork" },
    "service-request": { capability: "services-id", command: "service-request.createFromWork" },
    "consultation": { capability: "consultation", command: "consultation.createFromWork" },
  };
  
  const domainConfig = domainCapabilityMap[input.domainType];
  if (domainConfig) {
    await capabilityRegistry.invokeAsync(domainConfig.capability, domainConfig.command, {
      workId: savedWork.workId,
      coreWork: updatedWork, // Pass the updated work with ONLY compositionId (teamId removed)
      domainSpecificData: input.domainSpecificData,
    });
  }
  
  // 3. Return canonical Work response to presentation layer
  return {
    id: savedWork.workId, // Return workId yang dimulai dengan work- untuk kompatibel test
    workId: savedWork.workId,
    domainType: input.domainType,
  };
}

export const createWorkCommand = {
  kind: "command" as const,
  name: "create" as const,
  version: "1.0.0" as const,
  execute: createCoreWork,
  schema: CreateCoreWorkRequestSchema,
};

// MULTI-ACTOR-001: Additional schemas for participant and work management
export const AddParticipantRequestSchema = z.object({
  workId: z.string(),
  actorId: z.string(),
  role: z.enum(["editor", "viewer", "commenter"]),
  requesterActorId: z.string(), // Actor who is adding the participant (must be owner)
});

export type AddParticipantRequest = z.infer<typeof AddParticipantRequestSchema>;

export const GetWorkRequestSchema = z.object({
  workId: z.string(),
  actorId: z.string(), // Actor requesting access (permission check)
});

export type GetWorkRequest = z.infer<typeof GetWorkRequestSchema>;

export const UpdateWorkRequestSchema = z.object({
  workId: z.string(),
  actorId: z.string(),
  workspaceId: z.string(),
  sessionId: z.string(),
  tenantId: z.string(),
  version: z.number(), // Optimistic concurrency control
  updates: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(["draft", "active", "paused", "completed", "archived"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  }).partial(),
});

export type UpdateWorkRequest = z.infer<typeof UpdateWorkRequestSchema>;

// MULTI-ACTOR-001: addParticipant implementation - owner only, permission checked
async function addParticipant(input: AddParticipantRequest): Promise<{ success: boolean; participants: string[] }> {
  const workRepository = new WorkRepositoryPostgres();
  const work = await workRepository.byWorkId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: only owner (original creator) can add participants
  if (work.actorId !== input.requesterActorId) {
    throw new Error("permission_denied: Only work owner can add participants");
  }

  // Add participant to work's participants array
  const currentParticipants = work.participants || [];
  if (!currentParticipants.find(p => p.actorId === input.actorId)) {
    currentParticipants.push({
      actorId: input.actorId,
      role: input.role,
      addedAt: new Date().toISOString(),
      addedBy: input.requesterActorId,
    });
  }

  const updatedWork = await workRepository.save({
    ...work,
    participants: currentParticipants,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    participants: updatedWork.participants?.map(p => p.actorId) || [],
  };
}

// MULTI-ACTOR-001: getWork implementation - permission checked for all actors
async function getWork(input: GetWorkRequest): Promise<WorkAggregate> {
  const workRepository = new WorkRepositoryPostgres();
  const work = await workRepository.byWorkId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: actor must be owner OR in participants list
  const isOwner = work.actorId === input.actorId;
  const isParticipant = work.participants?.some(p => p.actorId === input.actorId);
  
  if (!isOwner && !isParticipant) {
    throw new Error("permission_denied: Actor does not have access to this work");
  }

  return work;
}

// MULTI-ACTOR-001: updateWork implementation - optimistic concurrency + permission check
async function updateWork(input: UpdateWorkRequest): Promise<{ success: boolean; version: number }> {
  const workRepository = new WorkRepositoryPostgres();
  const work = await workRepository.byWorkId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: only editor or owner can update work (integrated role validation from capability-command-registry)
  // Validate against both work-level participant roles AND workspace-level membership roles
  const isOwner = work.actorId === input.actorId;
  const workParticipant = work.participants?.find(p => p.actorId === input.actorId);
  const membershipRepo = getMembershipRepositoryPostgres();
   // Find membership by workspaceId and actorId (list all in workspace then filter for actor)
   const workspaceMemberships = await membershipRepo.listByWorkspace(input.workspaceId);
   const workspaceMembership = workspaceMemberships.find(m => m.userId === input.actorId);
  const canEdit = isOwner || (workParticipant?.role === "editor") || workspaceMembership?.role === "owner";
  
  if (!canEdit) {
    throw new Error("permission_denied: Actor does not have edit permissions");
  }

  // Optimistic concurrency control: version check
  const currentVersion = work.version || 1;
  if (currentVersion !== input.version) {
    throw new Error("concurrent_modification: Work was updated by another actor - please refresh");
  }

  // Apply updates
  const updatedWork = await workRepository.save({
    ...work,
    ...input.updates,
    version: currentVersion + 1,
    updatedAt: new Date().toISOString(),
  });

  return {
    success: true,
    version: updatedWork.version || currentVersion + 1,
  };
}

// Command definitions
export const addParticipantCommand = {
  kind: "command" as const,
  name: "addParticipant" as const,
  version: "1.0.0" as const,
  execute: addParticipant,
  schema: AddParticipantRequestSchema,
};

export const getWorkCommand = {
  kind: "command" as const,
  name: "get" as const,
  version: "1.0.0" as const,
  execute: getWork,
  schema: GetWorkRequestSchema,
};

export const updateWorkCommand = {
  kind: "command" as const,
  name: "update" as const,
  version: "1.0.0" as const,
  execute: updateWork,
  schema: UpdateWorkRequestSchema,
};

// Export commands for capability registry resolution (no manual registration needed)
export const workCoreCommands = [
  createWorkCommand,
  getWorksByInstitutionCommand,
  updateWorkCommand,
] as const;

// Commands already exported individually above; use direct imports in routes/test files per core-kernel policy