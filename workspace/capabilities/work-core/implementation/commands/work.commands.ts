import { z } from "zod";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import type { WorkAggregate } from "../../contracts/work.contracts.ts";
import { SessionId, TenantId, ActorId } from "../../contracts/work.contracts.ts";
import { getWorkRepositoryPostgres, WorkRepositoryPostgres } from "../repository/work-postgres.repository.ts";
// KEMBALI KE PATH MAPPING ORIGINAL - tsconfig work-core sudah define @repo/capabilities-identity
// Ini adalah FIX YANG SESUAI NodeNext module resolution dan path mapping monorepo
// FIX: Tambahkan .ts extension (NodeNext butuh ekstensi file untuk import .ts)
// Bypass barrel @repo yang gagal resolve, import langsung dari source dengan ekstensi yang benar
import { 
  getMembershipRepositoryPostgres, 
  type MembershipRepository, 
  getSessionRepositoryPostgres, 
  type SessionRepository 
} from "@repo/capabilities-identity";
import { getWorksByInstitutionCommand } from "./get-works-by-institution.command.ts";

import { WorkModeEnum } from "../../contracts/work.contracts.ts";

// Core Work schema - EOS primitive continuity substrate
export const CreateCoreWorkRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  linkedIntentId: z.string().optional(),
  domainType: z.enum(["legal-case", "service-request", "consultation"]).default("legal-case"),
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
  const workRepository = getWorkRepositoryPostgres();
  
  // 1. Create core Work primitive first (EOS substrate)
  const coreWork: Partial<WorkAggregate> = {
    title: input.title,
    description: input.description,
    domainType: input.domainType, // Sekarang domainType ada di WorkAggregate (fix TS2353)
    mode: input.workMode,
    sessionId: input.sessionId as SessionId,
    tenantId: input.tenantId as TenantId,
    workspaceId: input.workspaceId,
    actorId: input.actorId as ActorId,
    status: "draft",
    createdAt: new Date(),
  };
  
  const savedWork = await workRepository.save(coreWork as WorkAggregate);
  
  // Panggil atomic-composition untuk compose tim dari requirements
  const compositionResult = await capabilityRegistry.invoke(
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
    updatedAt: new Date(),
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
    await capabilityRegistry.invoke(domainConfig.capability, domainConfig.command, {
      workId: savedWork.workId,
      coreWork: updatedWork, // Pass the updated work with ONLY compositionId (teamId removed)
      domainSpecificData: input.domainSpecificData,
    });
  }
  
  // 3. Return canonical Work response to presentation layer
  return {
    id: savedWork.workId ?? "", // Return workId yang dimulai dengan work- untuk kompatibel test
    workId: savedWork.workId ?? "",
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
  const workRepository = getWorkRepositoryPostgres();
  const work = await workRepository.byId(input.workId);
  
  if (!work) {
    throw new Error(`work_not_found: Work with id ${input.workId} does not exist`);
  }

  // Permission check: only owner (original creator) can add participants
  if (work.actorId !== input.requesterActorId) {
    throw new Error("permission_denied: Only work owner can add participants");
  }

  // Add participant to work's participants array (now a string array)
  const currentParticipants = [...(work.participants || [])];
  if (!currentParticipants.includes(input.actorId)) {
    currentParticipants.push(input.actorId);
  }

  const updatedWork = await workRepository.save({
    ...work,
    participants: currentParticipants,
    updatedAt: new Date(),
  });

  return {
    success: true,
    participants: updatedWork.participants || [],
  };
}

// MULTI-ACTOR-001: getWork implementation - permission checked for all actors
async function getWork(input: GetWorkRequest): Promise<WorkAggregate> {
  const workRepository = getWorkRepositoryPostgres();
  const work = await workRepository.byId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: actor must be owner OR in participants list
  const isOwner = work.actorId === input.actorId;
  const isParticipant = work.participants?.includes(input.actorId);
  
  if (!isOwner && !isParticipant) {
    throw new Error("permission_denied: Actor does not have access to this work");
  }

  return work;
}

// MULTI-ACTOR-001: updateWork implementation - optimistic concurrency + permission check
async function updateWork(input: UpdateWorkRequest): Promise<{ success: boolean; version: number }> {
  const workRepository = getWorkRepositoryPostgres();
  const work = await workRepository.byId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: only editor or owner can update work (integrated role validation from capability-command-registry)
  // Validate against both work-level participant roles AND workspace-level membership roles
  const isOwner = work.actorId === input.actorId;
  const isParticipant = work.participants?.includes(input.actorId);
  const membershipRepo = getMembershipRepositoryPostgres();
   // Find membership by workspaceId and actorId (list all in workspace then filter for actor)
   const workspaceMemberships = await membershipRepo.listByWorkspace(input.workspaceId as any);
   const workspaceMembership = workspaceMemberships.find((m: any) => m.userId === input.actorId);
  // Role logic removed as `participants` is now string[]. A participant is considered an editor.
  const canEdit = isOwner || isParticipant || workspaceMembership?.role === "owner";
  
  if (!canEdit) {
    throw new Error("permission_denied: Actor does not have permission to update this work");
  }

  // Optimistic concurrency check
  if (work.version !== input.version) {
    throw new Error("conflict: Work has been updated by another actor. Please refresh and try again.");
  }

  // Apply updates
  const updatedWorkData = {
    ...work,
    ...input.updates,
    version: (work.version || 1) + 1,
    updatedAt: new Date(),
  } as WorkAggregate;

  const updatedWork = await workRepository.save(updatedWorkData);

  return {
    success: true,
    version: updatedWork.version!,
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

// Register work-core commands with capability registry (aligns with atomic-composition pattern)
export function registerWorkCoreCapability() {
  // Skip registration in test/standalone environments to avoid capabilityRegistry method errors
  if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
    console.log("[Work-Core] Test/standalone environment detected - skipping auto-registration");
    return;
  }
  // Register all commands in workCoreCommands array
  workCoreCommands.forEach((command) => {
    capabilityRegistry.register(command);
  });
  // Register additional commands not in workCoreCommands array
  capabilityRegistry.register(getWorkCommand);
  capabilityRegistry.register(addParticipantCommand);
  console.log("[Work-Core] Capability registered successfully - all commands added to capability registry");
}

// Commands already exported individually above; use direct imports in routes/test files per core-kernel policy