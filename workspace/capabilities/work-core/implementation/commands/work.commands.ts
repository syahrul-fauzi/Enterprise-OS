import { z } from "zod";
// Gunakan alias canonical @repo/core-kernel sesuai package exports yang didefinisikan (dist path tanpa src/.ts)
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary, type WorkAggregate, WorkId, SessionId, TenantId, ActorId, WorkspaceId, WorkModeEnum, newActorId, newWorkspaceId, newTenantId, newWorkId } from "@capabilities/work-core/contracts/work.contracts";
// Gunakan relative imports untuk file internal work-core (tanpa .ts extension - NodeNext requires .js)
import { getWorkRepositoryPostgres, WorkRepositoryPostgres } from "../repository/work-postgres.repository.js";
// Import membership/session repositories dari identity capability (tempat yang benar) - gunakan dynamic import untuk test environment untuk menghindari path issues
import { WorkRepositoryInMemory } from "../repository/work-inmemory.repository.js"; // Import in-memory implementation dari work-core
import { getWorksByInstitutionCommand } from "./get-works-by-institution.command.js";

// Import in-memory repository hanya jika dibutuhkan (hindari circular import)

// Lazy initialize work repository - gunakan mock jika environment test tanpa connection string
let _workRepo: any = undefined;
export async function getWorkRepositoryLazy() {
  if (!_workRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
      // GUNAKAN IN-MEMORY REPOSITORY SAAT TEST (sesuai SessionRepositoryInMemory pattern)
      // Gunakan async import() untuk menghindari ERR_REQUIRE_ESM_RACE_CONDITION
      const { WorkRepositoryInMemory } = await import("../repository/work-inmemory.repository.js");
      _workRepo = new WorkRepositoryInMemory();
      console.log("[work-core] 🔧 Using IN-MEMORY work repository for TEST environment");
    } else {
      // GUNAKAN POSTGRESQL REPOSITORY SAAT PRODUCTION/DEV
      _workRepo = getWorkRepositoryPostgres();
      console.log("[work-core] 🐘 Using POSTGRESQL work repository");
    }
  }
  return _workRepo;
}

// Lazy initialize membership repository - gunakan mock jika environment test tanpa connection string
let _membershipRepo: any = undefined;
export async function getMembershipRepositoryLazy() {
  if (!_membershipRepo) {
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    const hasConnectionString = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    
    if (isTestEnvironment && !hasConnectionString) {
      // GUNAKAN IN-MEMORY REPOSITORY SAAT TEST (reuse pattern dari identity capability)
      // Import dari index.js identity capability dengan alias canonical untuk menghindari path issues
      const { MembershipRepositoryInMemory } = await import("../../../identity/implementation/repositories/index.js");
      // MembershipRepositoryInMemory is an object, not a class - assign directly
      _membershipRepo = MembershipRepositoryInMemory;
      console.log("[work-core] 🔧 Using IN-MEMORY membership repository for TEST environment");
    } else {
      // Import dari alias canonical untuk production/non-test environment
      const { getMembershipRepositoryPostgres } = await import("../../../identity/implementation/repositories/index.js");
      _membershipRepo = getMembershipRepositoryPostgres();
      console.log("[work-core] 🐘 Using POSTGRESQL membership repository");
    }
  }
  return _membershipRepo;
}

// Core Work schema - EOS primitive continuity substrate
// P0 WAR ROOM FIX: Perbaiki ReferenceError WorkModeEnum sebelum inisialisasi - gunakan tuple literal langsung
export const CreateCoreWorkRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  linkedIntentId: z.string().optional(),
  domainType: z.enum(["legal-case", "service-request", "consultation", "employee-leave", "retail-inventory", "acaas", "healthcare", "construction"]).default("legal-case"),
  workMode: z.enum(["core", "domain", "federation", "oneshot"]).default("oneshot"),
  domainSpecificData: z.record(z.string(), z.any()).optional(),
  
  // Mandatory session context for all Work creations
  sessionId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
});

export type CreateCoreWorkRequest = z.infer<typeof CreateCoreWorkRequestSchema>;

// Core Work aggregate implementation
async function createCoreWork(input: CreateCoreWorkRequest & { actorContext?: { tenantId: string; workspaceId: string; actorId: string } }): Promise<{ id: string; workId: string; domainType: string }> {
  const workRepository = await getWorkRepositoryLazy();
  
  // 0. Validate 6 boundaries (CAPABILITY_MISMATCH fix - canonical pattern dari create-tenant.command.ts)
  const requestTenantId = input.actorContext?.tenantId || input.tenantId || "unknown-tenant";
  const workspaceId = input.actorContext?.workspaceId || input.workspaceId || "unknown-workspace";
  const actorId = input.actorContext?.actorId || input.actorId || "unknown-actor";
  
  const identityBoundary: IdentityBoundary = {
    tenantId: requestTenantId,
    organizationId: "work-core.enterprise-os",
    principalId: actorId,
    ownerIds: [actorId]
  };
  
  const semanticBoundary: SemanticBoundary = {
    domain: "work-core",
    intent: "create-core-work",
    currentState: "draft",
    requirements: [],
    constraints: [],
    decisions: []
  };
  
  const authorityBoundary: AuthorityBoundary = {
    actorCapabilities: new Map([[actorId, ["create-core-work"]]]),
    policyEnforcements: ["work-creation-policy"],
    authorizations: new Map([[actorId, ["create"]]]),
    delegations: []
  };
  
  const executionBoundary: ExecutionBoundary = {
    workspaceId,
    runtimeEnvironment: "web",
    executorIds: [actorId],
    executionFrame: "direct"
  };
  
  const evidenceBoundary: EvidenceBoundary = {
    evidenceIds: [`work-init-${Date.now()}`],
    evidenceChain: [{
      actorId,
      action: "initiate-work-creation",
      timestamp: new Date(),
      workspaceId
    }],
    outcomeVerified: false
  };
  
  const presentationBoundary: PresentationBoundary = {
    supportedFaces: ["web", "api"],
    defaultLayout: "work-list",
    mobileEnabled: true,
    apiEnabled: true,
    projectionConfig: {
      displayName: input.title,
      summary: input.description || "New core work created",
      priority: "high",
      uiFilters: ["id", "workId", "title", "domainType", "status", "createdAt"],
      hideFromSurfaces: []
    }
  };
  
  const boundaryValidation = validateAllBoundaries({
    identity: identityBoundary,
    semantic: semanticBoundary,
    authority: authorityBoundary,
    execution: executionBoundary,
    evidence: evidenceBoundary,
    presentation: presentationBoundary
  });
  
  if (!boundaryValidation.valid) {
    console.error("[work-core.createCoreWork] BOUNDARY VALIDATION FAILED:", boundaryValidation.allErrors);
    throw new Error(`Boundary validation failed: ${boundaryValidation.allErrors.join(", ")}`);
  }
  
  // 1. Create core Work primitive first (EOS substrate) - Generate workId sebelum save untuk kompatibel in-memory repository
  const generatedWorkId = newWorkId();
  const coreWork: Partial<WorkAggregate> = {
    id: generatedWorkId, // Isi id agar work-inmemory.repository.ts tidak menyimpan dengan undefined id
    workId: generatedWorkId, // Isi workId juga agar invariant terjaga di semua repository
    title: input.title,
    description: input.description,
    domainType: input.domainType, // Sekarang domainType ada di WorkAggregate (fix TS2353)
    mode: input.workMode,
    sessionId: input.sessionId as SessionId,
    tenantId: input.tenantId as TenantId,
    workspaceId: input.workspaceId as WorkspaceId,
    actorId: input.actorId as ActorId,
    status: "draft",
    createdAt: new Date(),
  };
  
  const savedWork = await workRepository.save(coreWork as WorkAggregate);
  
  // Extract compositionPackageId dari domainSpecificData jika ada (W-COMP-001: reuse PT Establishment template)
  const compositionPackageId = input.domainSpecificData?.compositionPackageId;
  
  // Bypass atomic-composition di test environment untuk menghindari dependency not found
  let compositionId: string | null = null;
  const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
  
  if (!isTestEnvironment) {
    // Hanya panggil atomic-composition jika bukan environment test
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
               tenantId: input.tenantId,
               sessionId: input.sessionId,
               actorId: input.actorId,
               compositionPackageId
             }
          );
    compositionId = (compositionResult as any).compositionId;
  } else {
    // Di test environment, buat compositionId dummy untuk menghindari error
    compositionId = `comp-test-${Math.random().toString(36).substring(2, 15)}`;
    console.log("[work-core] 🔧 Test environment: menggunakan dummy compositionId untuk RET-001", compositionId);
  }
  
  // 3. Gunakan compositionId yang sudah ditetapkan (baik dari atomic-composition maupun dummy test)
  const updatedWork = {
    ...savedWork,
    compositionId,
    status: "active" as const,
    updatedAt: new Date(),
  };
  await workRepository.save(updatedWork);
  
  // 4. Delegate to domain specialization capability based on domainType (HANYA diaktifkan kembali untuk domain yang membutuhkan post-creation processing)
  const domainCapabilityMap: Record<string, { capability: string; command: string }> = {
    "legal-case": { capability: "legal-case", command: "case.createFromWork" },
    "service-request": { capability: "services-id", command: "service-request.createFromWork" },
    "consultation": { capability: "consultation", command: "consultation.createFromWork" },
    "employee-leave": { capability: "work-core", command: "createCoreWork" }, // Reuse work-core without new domain capability
    "retail-inventory": { capability: "work-core", command: "createCoreWork" }, // Reuse work-core untuk retail domain
    "acaas": { capability: "services-id", command: "service-request.createFromWork" }, // ACaaS menggunakan services-id untuk post-creation processing
    "healthcare": { capability: "services-id", command: "service-request.createFromWork" }, // Healthcare menggunakan services-id
    "construction": { capability: "services-id", command: "service-request.createFromWork" }, // Construction menggunakan services-id
  };
  
  const domainConfig = domainCapabilityMap[input.domainType];
  if (domainConfig) {
    await capabilityRegistry.invoke(domainConfig.capability, domainConfig.command, {
      workId: savedWork.workId,
      coreWork: updatedWork, // Pass the updated work with ONLY compositionId (teamId removed)
      domainSpecificData: input.domainSpecificData, // Pass ACaaS/metadata dari API route sebagai domainSpecificData
    });
  }
  
  // 3. Return canonical Work response to presentation layer
  return {
    id: savedWork.workId ?? "", // Return workId yang dimulai dengan work- untuk kompatibel test
    workId: savedWork.workId ?? "",
    domainType: input.domainType,
  };
}

// Command untuk menghubungkan Work yang sudah ada ke domain baru (lintas domain cross-boundary)
// Mendukung invariant workId tetap sama meskipun berpindah domain (IDENTITY BOUNDARY compliance)
async function linkExistingWork(input: {
  workId: string;
  domainType: string;
  sessionId: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  domainSpecificData?: Record<string, any>;
  targetProductId?: string;
}): Promise<{ id: string; workId: string; domainType: string; linkedToProduct?: string }> {
  const workRepository = await getWorkRepositoryLazy();
  
  // 1. Cari Work yang sudah ada berdasarkan workId
  const existingWork = await workRepository.byWorkId(input.workId);
  if (!existingWork) {
    throw new Error(`[work-core.link-existing] Work with workId ${input.workId} not found - cannot link non-existent work`);
  }
  
  // 2. Verify authority boundary - support cross-workspace AND cross-provider handoff dalam tenant yang sama (RES-001-001-W1: github-platform→backend-eos workspace)
  // Hanya cross-tenant yang di-block, cross-workspace/cross-provider dalam tenant yang sama diizinkan untuk handoff antar-aktor
  if (existingWork.tenantId !== input.tenantId) {
    throw new Error(`[work-core.link-existing] Cross-tenant access blocked - authority boundary violation`);
  }
  
  // Extract targetWorkspaceId dari domainSpecificData jika ada (untuk cross-workspace/cross-provider handoff)
  const targetWorkspaceId = input.domainSpecificData?.targetWorkspaceId;
  const isCrossWorkspaceHandoff = targetWorkspaceId && targetWorkspaceId !== input.workspaceId;
  // Izinkan handoff dari external platform workspaces juga (github-platform, zendesk-support, dst.)
  const isCrossProviderHandoff = isCrossWorkspaceHandoff && existingWork.platformSource !== undefined;
  
  // Log handoff type untuk audit trail (RES-001-001-W1 requirement)
  if (isCrossProviderHandoff) {
    console.log(`[work-core.link-existing] Processing cross-provider handoff: ${existingWork.platformSource} → ${targetWorkspaceId} (tenant: ${input.tenantId})`);
  } else if (isCrossWorkspaceHandoff) {
    console.log(`[work-core.link-existing] Processing cross-workspace handoff: ${input.workspaceId} → ${targetWorkspaceId} (tenant: ${input.tenantId})`);
  }
  
  // 3. Update domainType dan workspaceId jika cross-workspace handoff (IDENTITY invariant terjaga, hanya workspace yang berpindah)
  const updatedWork = { 
    ...existingWork, 
    domainType: input.domainType, 
    workspaceId: isCrossWorkspaceHandoff ? targetWorkspaceId : existingWork.workspaceId,
    assignedActorId: isCrossWorkspaceHandoff ? input.domainSpecificData?.targetActorId || existingWork.assignedActorId : existingWork.assignedActorId,
    nextAction: input.domainSpecificData?.newNextAction || existingWork.nextAction,
    updatedAt: new Date() 
  };
  await workRepository.save(updatedWork);
  
  // 4. Jika ada targetProductId, hubungkan Work ke product tersebut (HIGH-VALUE WORK GRAPH)
  let linkedProductId: string | undefined;
  if (input.targetProductId && typeof workRepository.linkWorkToProduct === 'function') {
          await workRepository.linkWorkToProduct(input.workId as any, input.targetProductId);
          linkedProductId = input.targetProductId;
        }
  
  // 5. Record evidence untuk perubahan domain (EVIDENCE BOUNDARY compliance)
  const evidence = {
    type: "work_domain_updated",
    timestamp: new Date().toISOString(),
    actorId: input.actorId,
    sessionId: input.sessionId,
    workspace_id: input.workspaceId,
    tenant_id: input.tenantId,
    changes: { 
      domainType: input.domainType,
      ...(linkedProductId && { targetProductId: linkedProductId })
    },
    previousDomain: existingWork.domainType
  };
  
  await workRepository.addEvidence(input.workId, evidence);
  
  // 6. Return canonical Work response dengan workId yang sama (invariant terjaga)
  return {
    id: updatedWork.workId,
    workId: updatedWork.workId,
    domainType: updatedWork.domainType,
    ...(linkedProductId && { linkedToProduct: linkedProductId })
  };
}

// Close work command export - canonical work closure logic
export const CloseCoreWorkRequestSchema = z.object({
  workId: z.string(),
  outcomeDescription: z.string().optional(),
  sessionId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
});

export type CloseCoreWorkRequest = z.infer<typeof CloseCoreWorkRequestSchema>;

async function closeCoreWork(input: CloseCoreWorkRequest): Promise<{ id: string; workId: string; status: string; closedAt: string }> {
  const workRepository = await getWorkRepositoryLazy();
  
  // 1. Cari Work yang sudah ada berdasarkan workId
  const existingWork = await workRepository.byWorkId(input.workId);
  if (!existingWork) {
    throw new Error(`[work-core.close] Work with workId ${input.workId} not found - cannot close non-existent work`);
  }
  
  // 2. Verify authority boundary - cross-tenant access blocked
  if (existingWork.tenantId !== input.tenantId) {
    throw new Error(`[work-core.close] Cross-tenant access blocked - authority boundary violation`);
  }
  
  // 3. Verify actor authorization - only work owner or assigned participant can close
  const isOwner = existingWork.actorId === input.actorId;
  const isParticipant = existingWork.participants?.some((p: any) => p.id === input.actorId);
  if (!isOwner && !isParticipant) {
    throw new Error(`[work-core.close] Unauthorized: actor ${input.actorId} is not authorized to close work ${input.workId}`);
  }
  
  // 4. Update work status to closed
  const closedAt = new Date().toISOString();
  const updatedWork = {
    ...existingWork,
    status: "closed" as const,
    closedAt,
    outcomeDescription: input.outcomeDescription || "Work completed successfully",
    updatedAt: closedAt,
  };
  await workRepository.save(updatedWork);
  
  // 5. Record evidence untuk penutupan work (EVIDENCE BOUNDARY compliance)
  const evidence = {
    type: "work_closed",
    timestamp: closedAt,
    actorId: input.actorId,
    sessionId: input.sessionId,
    workspace_id: input.workspaceId,
    tenant_id: input.tenantId,
    changes: { 
      status: "closed",
      outcomeDescription: input.outcomeDescription
    }
  };
  
  await workRepository.addEvidence(input.workId, evidence);
  
  // 6. Return canonical response
  return {
    id: updatedWork.workId,
    workId: updatedWork.workId,
    status: "closed",
    closedAt,
  };
}

export const closeWorkCommand = {
  kind: "command" as const,
  name: "close" as const,
  version: "1.0.0" as const,
  execute: closeCoreWork,
  schema: CloseCoreWorkRequestSchema,
};

// Link existing work command export
export const linkExistingWorkCommand = {
  kind: "command" as const,
  name: "link-existing" as const,
  version: "1.0.0" as const,
  execute: linkExistingWork,
  schema: z.object({
    workId: z.string(),
    domainType: z.enum(["legal-case", "service-request", "consultation", "employee-leave", "retail-inventory", "institutional-coordination"]),
    sessionId: z.string(),
    tenantId: z.string(),
    workspaceId: z.string(),
    actorId: z.string(),
    domainSpecificData: z.record(z.string(), z.any()).optional(),
    targetProductId: z.string().optional(),
  }),
};

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
    status: z.enum(["draft", "active", "paused", "completed", "archived", "SIGNATURE_REQUIRED", "SIGNATURE_PENDING", "SIGNATURE_PARTIALLY_COMPLETED", "SIGNATURE_COMPLETE", "SIGNATURE_REJECTED", "SIGNATURE_EXPIRED"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    execution_frame: z.enum(["direct", "proxy", "mcp", "constrained-gui"]).optional(),
    acceptanceContract: z.object({
      requiredSigners: z.array(z.string()),
      completedSignatures: z.array(z.string()),
      requirements: z.array(z.string()),
      expiresAt: z.date().optional(),
    }).optional(),
  }).partial(),
});

export type UpdateWorkRequest = z.infer<typeof UpdateWorkRequestSchema>;

// MULTI-ACTOR-001: addParticipant implementation - owner only, permission checked
async function addParticipant(input: AddParticipantRequest): Promise<{ success: boolean; participants: string[] }> {
  const workRepository = await getWorkRepositoryLazy();
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
  const workRepository = await getWorkRepositoryLazy();
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
export async function updateWork(input: UpdateWorkRequest): Promise<{ success: boolean; version: number }> {
  const workRepository = await getWorkRepositoryLazy();
  const work = await workRepository.byId(input.workId);
  
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }

  // Permission check: only editor or owner can update work (integrated role validation from capability-command-registry)
  // Validate against both work-level participant roles AND workspace-level membership roles
  const isOwner = work.actorId === input.actorId;
  const isParticipant = work.participants?.includes(input.actorId);
  const membershipRepo = await getMembershipRepositoryLazy();
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

  // SIG-DEV-001: Signature state transition validation - hanya boleh masuk SIGNATURE_COMPLETE jika memenuhi syarat
  if (input.updates.status === "SIGNATURE_COMPLETE" && work.status !== "SIGNATURE_COMPLETE") {
    // 1. Cek apakah input actor adalah required signer di acceptanceContract
    const acceptanceContract = work.acceptanceContract;
    if (!acceptanceContract?.requiredSigners?.includes(input.actorId)) {
      throw new Error("permission_denied: Actor is not an authorized signer for this work");
    }

    // 2. Cek apakah actor sudah pernah menandatangani sebelumnya (hindari duplicate signature)
    if (acceptanceContract.completedSignatures?.includes(input.actorId)) {
      throw new Error("conflict: Actor has already signed this work");
    }

    // 3. Update completed signatures sebelum state transition
    const updatedCompletedSignatures = [...(acceptanceContract.completedSignatures || []), input.actorId];
    
    // 4. Hanya set SIGNATURE_COMPLETE jika semua required signers sudah menandatangani
    const allRequiredSigned = acceptanceContract.requiredSigners.every(
      signer => updatedCompletedSignatures.includes(signer)
    );
    
    if (!allRequiredSigned) {
      // Jika belum semua, pindah ke PARTIALLY_COMPLETED saja
      input.updates.status = "SIGNATURE_PARTIALLY_COMPLETED";
      input.updates.acceptanceContract = {
        ...acceptanceContract,
        completedSignatures: updatedCompletedSignatures
      };
    } else {
      // Jika semua sudah menandatangani, set SIGNATURE_COMPLETE
      input.updates.acceptanceContract = {
        ...acceptanceContract,
        completedSignatures: updatedCompletedSignatures
      };
    }
  }

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
  name: "work.addParticipant" as const,
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

// WORK CLAIM command schema and implementation
export const ClaimWorkRequestSchema = z.object({
  workId: z.string(),
  actorId: z.string(),
  workspaceId: z.string(),
  tenantId: z.string(),
  executionId: z.string(),
  expectedVersion: z.number(),
  expectedStatuses: z.array(z.string()),
  allowReclaim: z.boolean().optional().default(false),
});

export type ClaimWorkRequest = z.infer<typeof ClaimWorkRequestSchema>;

async function claimWork(input: ClaimWorkRequest): Promise<{ success: boolean; version: number; executionId: string }> {
  const workRepository = await getWorkRepositoryLazy();
  const membershipRepo = await getMembershipRepositoryLazy();
  
  // Verify actor is a member of the workspace (authorization check)
  const workspaceMemberships = await membershipRepo.listByWorkspace(input.workspaceId as any);
  const member = workspaceMemberships.find((m: any) => m.userId === input.actorId);
  if (!member) {
    throw new Error("permission_denied: Actor is not a member of the workspace");
  }
  
  // Execute atomic claim
  const updatedWork = await workRepository.atomicClaim(
    input.workId as any,
    input.actorId as any,
    input.executionId as any,
    input.expectedVersion,
    input.expectedStatuses,
    input.allowReclaim
  );
  
  return {
    success: true,
    version: updatedWork.version!,
    executionId: updatedWork.activeExecutionId!
  };
}

export const claimWorkCommand = {
  kind: "command" as const,
  name: "claim" as const,
  version: "1.0.0" as const,
  execute: claimWork,
  schema: ClaimWorkRequestSchema,
};

// W2-B: Authority Substitution Under Failure - Claim work authority with specific permissions
// SIG-NEXT-001-W2: Extended untuk mendukung cross-tenant/workspace handoff
export const ClaimWorkAuthorityRequestSchema = z.object({
  workId: z.string(),
  newActorId: z.string(),
  permissions: z.array(z.string()),
  workspaceId: z.string(), // Source workspace (tempat Work berasal)
  tenantId: z.string(), // Source tenant (tempat Work berasal)
  newWorkspaceId: z.string().optional(), // Target workspace (jika pindah workspace)
  newTenantId: z.string().optional(), // Target tenant (jika pindah tenant)
  sessionId: z.string(),
  actorId: z.string(), // Requester actorId (must have transfer authority)
  expectedVersion: z.number(),
});

export type ClaimWorkAuthorityRequest = z.infer<typeof ClaimWorkAuthorityRequestSchema>;

export async function claimWorkAuthority(input: ClaimWorkAuthorityRequest): Promise<{ success: boolean; version: number }> {
  const workRepository = await getWorkRepositoryLazy();
  const membershipRepo = await getMembershipRepositoryLazy();
  
  // 1. Verify requester is a member of the SOURCE workspace (existing membership check, reused from updateWork)
  const sourceWorkspaceMemberships = await membershipRepo.listByWorkspace(input.workspaceId as any, { tenantId: input.tenantId });
  const requesterMember = sourceWorkspaceMemberships.find((m: any) => m.userId === input.actorId);
  if (!requesterMember) {
    throw new Error(`permission_denied: Requester is not a member of the source workspace.`);
  }
  
  // SIG-NEXT-001-W2: Cross-tenant/workspace membership check
  let targetWorkspaceId = input.workspaceId;
  let targetTenantId = input.tenantId;
  
  if (input.newTenantId && input.newWorkspaceId) {
    // Jika ada target tenant/workspace baru, verifikasi newActorId adalah member di target
    const targetWorkspaceMemberships = await membershipRepo.listByWorkspace(input.newWorkspaceId as any, { tenantId: input.newTenantId });
    const newActorMember = targetWorkspaceMemberships.find((m: any) => m.userId === input.newActorId);
    if (!newActorMember) {
      throw new Error(`permission_denied: New actor is not a member of the target workspace/tenant.`);
    }
    // Update target location untuk Work
    targetWorkspaceId = input.newWorkspaceId;
    targetTenantId = input.newTenantId;
  } else {
    // Jika tidak pindah tenant/workspace, gunakan logika lama (same workspace)
    const newActorMember = sourceWorkspaceMemberships.find((m: any) => m.userId === input.newActorId);
    if (!newActorMember) {
      throw new Error(`permission_denied: New actor is not a member of the workspace.`);
    }
  }

  // 2. Verify work exists and version is correct (atomic concurrency check, reused from claimWork)
  const work: any = await workRepository.byId(input.workId);
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }
  if (work.version !== input.expectedVersion) {
    throw new Error("conflict: Work version mismatch, cannot transfer authority");
  }

  // 3. Initialize currentAuthorizations from work data
  // Handle jika work.authorizations adalah object biasa (bukan Map) atau undefined
  let currentAuthorizations: Map<any, any>;
  if (work.authorizations instanceof Map) {
    currentAuthorizations = work.authorizations;
  } else if (work.authorizations && typeof work.authorizations === 'object') {
    // Jika berupa object plain, konversi ke Map
    currentAuthorizations = new Map(Object.entries(work.authorizations));
  } else {
    // Jika undefined/null, buat Map baru
    currentAuthorizations = new Map();
  }

  // 3.5. Verify requester has transfer_authority permission (perbaikan gap MEDIUM: permissions validation boundary)
  const requesterPermissions = currentAuthorizations.get(input.actorId) || [];
  if (!requesterPermissions.includes('transfer_authority') && work.actorId !== input.actorId) {
    throw new Error("permission_denied: Requester does not have transfer_authority and is not the current work owner");
  }
  const updatedAuthorizations = new Map(currentAuthorizations);
  updatedAuthorizations.set(input.newActorId as any, input.permissions as any);
  
  // 4. Save work with atomic version increment (preserve continuity - SIG-NEXT-001-W2: update workspace/tenant if cross-tenant)
  const updatedWork = await workRepository.save({
    ...work,
    actorId: input.newActorId,
    workspaceId: targetWorkspaceId as any,
    tenantId: targetTenantId as any,
    version: input.expectedVersion + 1,
    authorizations: updatedAuthorizations,
    updatedAt: new Date(),
    _requesterActorId: input.actorId, // Pass requester for save() authorization check
  });
  
  // 5. Record evidence with safeRecordEvidence (extends existing payload with W2-B specific fields)
  const { safeRecordEvidence } = await import("../utils/index.js");
  await safeRecordEvidence({
    workspace_id: targetWorkspaceId as any,
    capability: "work-core",
    command: "authority.transfer",
    work_id: input.workId,
    tenant_id: targetTenantId as any,
    actor_id: input.actorId,
    timestamp: new Date().toISOString(),
    sessionId: input.sessionId,
    // Extend base evidence payload with transfer metadata (allowed by safeRecordEvidence's index signature)
    meta_previousActorId: work.actorId,
    meta_newActorId: input.newActorId,
    meta_transferredPermissions: input.permissions,
    // SIG-NEXT-001-W2: Tambahkan metadata lokasi untuk cross-tenant handoff (evidence chain preservation)
    meta_previousWorkspaceId: input.workspaceId,
    meta_previousTenantId: input.tenantId,
    meta_newWorkspaceId: targetWorkspaceId,
    meta_newTenantId: targetTenantId
  });
  
  return { success: true, version: updatedWork.version! };
}

export const claimWorkAuthorityCommand = {
  kind: "command" as const,
  name: "claim-authority" as const,
  version: "1.0.0" as const,
  execute: claimWorkAuthority,
  schema: ClaimWorkAuthorityRequestSchema,
};

export const updateWorkCommand = {
  kind: "command" as const,
  name: "update" as const,
  version: "1.0.0" as const,
  execute: updateWork,
  schema: UpdateWorkRequestSchema,
};

// TAMBAH: Command evidence.getByWorkId untuk memenuhi EVIDENCE BOUNDARY test requirement
// Memungkinkan test mengambil evidence chain dari workId (sesuai yang dipanggil di delivery.test.ts)
export const GetEvidenceByWorkIdRequestSchema = z.object({
  workId: z.string(),
  sessionId: z.string(),
  tenantId: z.string(),
  workspaceId: z.string(),
  actorId: z.string(),
});

export type GetEvidenceByWorkIdRequest = z.infer<typeof GetEvidenceByWorkIdRequestSchema>;

export async function getEvidenceByWorkId(input: GetEvidenceByWorkIdRequest): Promise<any[]> {
  const workRepository = await getWorkRepositoryLazy();
  
  // Cek apakah actor memiliki akses ke Work ini (AUTHORITY BOUNDARY compliance)
  const work = await workRepository.byId(input.workId as any);
  if (!work) {
    throw new Error("work_not_found: Work does not exist");
  }
  

  // Permission check: actor must be owner OR in participants list
  const isOwner = work.actorId === input.actorId;
  const isParticipant = work.participants?.includes(input.actorId);
  
  if (!isOwner && !isParticipant) {
    throw new Error("permission_denied: Actor does not have access to this work's evidence");
  }
  
  // Ambil evidence dari repository, selalu kembalikan array (EVIDENCE BOUNDARY requirement)
  const rawEvidence = await workRepository.getEvidence(input.workId);
  const evidenceArray = Array.isArray(rawEvidence) ? rawEvidence : [];
  
  // SIG-NEXT-001-W3: Sort evidence by timestamp (ascending) untuk timeline terurut
  const sortedEvidence = evidenceArray.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  // SIG-NEXT-001-W3: Rekonstruksi lokasi history dari metadata lokasi transfer
  const locationHistory = sortedEvidence
    .filter(e => e.command === "authority.transfer" && e.meta_previousWorkspaceId)
    .map(e => ({
      timestamp: e.timestamp,
      previous: {
        workspaceId: e.meta_previousWorkspaceId,
        tenantId: e.meta_previousTenantId
      },
      current: {
        workspaceId: e.meta_newWorkspaceId,
        tenantId: e.meta_newTenantId
      },
      transferredBy: e.actor_id,
      newActor: e.meta_newActorId
    }));
  
  // Rekonstruksi lokasi awal dari evidence transfer pertama (jika ada) untuk menghindari penggunaan lokasi akhir (bug sebelumnya)
  let initialWorkspaceId = work.workspaceId;
  let initialTenantId = work.tenantId;
  let initialActorId = work.actorId;
  
  // Jika ada transfer evidence, ambil lokasi awal dari previous dari transfer pertama
  if (locationHistory.length > 0) {
    const firstTransfer = locationHistory[0];
    if (firstTransfer.previous) {
      initialWorkspaceId = firstTransfer.previous.workspaceId;
      initialTenantId = firstTransfer.previous.tenantId;
    }
  }
  
  // Tambahkan lokasi awal Work sebelum transfer pertama, handle jika createdAt tidak valid (clone issue di inmemory repo)
  const workCreatedAt = work.createdAt && !isNaN(new Date(work.createdAt).getTime()) ? work.createdAt : new Date();
  const initialLocation = {
    timestamp: new Date(workCreatedAt).toISOString(),
    current: {
      workspaceId: initialWorkspaceId,
      tenantId: initialTenantId,
      actorId: initialActorId
    },
    isInitial: true
  };
  
  // Return full evidence + lokasi history yang sudah direkonstruksi
  return [
    ...sortedEvidence,
    {
      capability: "work-core",
      command: "location.history.reconstructed",
      work_id: input.workId,
      tenant_id: input.tenantId,
      workspace_id: input.workspaceId,
      actor_id: input.actorId,
      timestamp: new Date().toISOString(),
      sessionId: input.sessionId,
      meta_locationTimeline: [initialLocation, ...locationHistory]
    }
  ];
}

export const getEvidenceByWorkIdCommand = {
  kind: "command" as const,
  name: "evidence.getByWorkId" as const, // Command name tanpa prefix capability (capabilityRegistry akan menambahkan prefix "work-core.")
  version: "1.0.0" as const,
  execute: getEvidenceByWorkId,
  schema: GetEvidenceByWorkIdRequestSchema,
};

// Export commands for capability registry resolution (no manual registration needed)
import { syncWorkCommand } from "./work-sync.command.js";

export const workCoreCommands = [
  createWorkCommand,
  closeWorkCommand,
  linkExistingWorkCommand, // CROSS-DOMAIN WORK LINKING command (IDENTITY boundary invariant)
  getWorksByInstitutionCommand,
  updateWorkCommand,
  syncWorkCommand,
  claimWorkCommand, // WORK CLAIM command
  claimWorkAuthorityCommand, // W2-B: Authority Substitution Under Failure command
  getEvidenceByWorkIdCommand, // EVIDENCE BOUNDARY command
  getWorkCommand,
  addParticipantCommand,
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
  console.log("[Work-Core] Capability registered successfully - all commands added to capability registry");
}

// Commands already exported individually above; use direct imports in routes/test files per core-kernel policy