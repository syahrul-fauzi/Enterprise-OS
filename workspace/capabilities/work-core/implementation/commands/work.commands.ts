import { z } from "zod";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import type { WorkAggregate } from "../../contracts/work.contracts";
import { SessionId, TenantId, ActorId } from "../../contracts/work.contracts";
import { WorkRepositoryPostgres } from "../repository/work-postgres.repository";

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
  
  // 2. Invoke Atomic Work Composition engine to assemble team from requirements
  // This is the EOS core Work→Composition→Team flow - all domain work uses atomic-composition
  const compositionResult = await capabilityRegistry.invokeAsync("atomic-composition", "composeTeamFromRequirements", {
    work: savedWork,
    requirements: savedWork.requiredCapabilities || [], // Pass required capabilities from Work
    availableActors: [], // Will be populated from actor registry by composition engine
    availableCapabilities: [], // Will be populated from capability registry by composition engine
  });
  
  // 3. Update Work with ONLY compositionId (canonical link - A4 CONSTITUTIONAL DECISION IMPLEMENTED)
  // teamId was REMOVED from Work model - team is always derived from composition, never cached
  // This eliminates accidental first-class relation that could become persisted
  const updatedWork = {
    ...savedWork,
    compositionId: (compositionResult.output as any).compositionId,
    status: "active" as const, // Work becomes active once team is composed
    updatedAt: new Date().toISOString(),
  };
  await workRepository.save(updatedWork);
  
  // 4. Delegate to domain specialization capability based on domainType
  const domainCapabilityMap: Record<string, { capability: string; command: string }> = {
    "legal-case": { capability: "legal-case", command: "case.createFromWork" },
    "service-request": { capability: "services-id", command: "service-request.createFromWork" },
    "consultation": { capability: "consultation.tmp", command: "consultation.createFromWork" },
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
    id: savedWork.id,
    workId: savedWork.workId,
    domainType: input.domainType,
  };
}

export const createWorkCommand = {
  kind: "command" as const,
  name: "work.create" as const,
  version: "1.0.0" as const,
  execute: createCoreWork,
  schema: CreateCoreWorkRequestSchema,
};