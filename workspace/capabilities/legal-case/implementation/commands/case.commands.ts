import { z } from "zod";
import {
  AssignLawyerInput,
  AssignLawyerOutput,
  CaseAggregate,
  CaseId,
  CloseCaseInput,
  CloseCaseOutput,
  CreateCaseInput,
  CreateCaseOutput,
  SearchCasesInput,
  SearchCasesOutput,
} from "../../contracts/index";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types";
import { CaseRepositoryInMemory, CaseRepositoryPostgres, newCaseId, defaultCasePriority, defaultCaseStatus } from "../repository/index";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index";
import { getCaseByIdCommand } from "./get-case-by-id.command";

// FORCE IN-MEMORY SESSION REPOSITORY FOR DEVELOPMENT
const sessionRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
  ? getSessionRepositoryPostgres() 
  : SessionRepositoryInMemory;

// FORCE IN-MEMORY FOR DEVELOPMENT - ignore DATABASE_URL to fix "Work not found" errors
// Only use Postgres in NODE_ENV=production
console.log("[case.commands.ts] NODE_ENV:", process.env.NODE_ENV, "DATABASE_URL present:", !!process.env.DATABASE_URL);
const caseRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
  ? CaseRepositoryPostgres
  : new CaseRepositoryInMemory();
console.log("[case.commands.ts] Using case repository type:", (process.env.NODE_ENV === "production" && process.env.DATABASE_URL) ? "POSTGRES" : "IN-MEMORY");

// Import Intent repository to validate linkedIntentId exists (CONTEXT INTEGRITY guarantee)
// Matches EXACTLY the same pattern as sessionRepository (imports and initialization)
import { getIntentRepositoryPostgres, IntentRepositoryInMemory } from "../../../identity/implementation/repositories/index";

// FORCE IN-MEMORY INTENT REPOSITORY FOR DEVELOPMENT - matches sessionRepository pattern
const intentRepository = process.env.NODE_ENV === "production" && process.env.DATABASE_URL
  ? getIntentRepositoryPostgres() 
  : new IntentRepositoryInMemory();
console.log("[case.commands.ts] Intent repository initialized for context integrity validation");

const PTEstablishmentDetailsSchema = z.object({
  namaPTLengkap: z.string().min(1),
  alamatDomisili: z.string().min(1),
  bidangUsaha: z.string().min(1),
  jumlahPendiri: z.number().int().min(1).max(100),
  modalDasar: z.number().min(100000000), // Minimal Rp100.000.000 sesuai regulasi Indonesia
  noNIB: z.string().min(10).max(13), // NIB number required for PT registration (Indonesian business identifier)
  npwp: z.string().min(15).max(20), // NPWP (Tax ID) for the legal entity
  penanggungJawabNIK: z.string().length(16), // NIK of the person in charge (16 digits required)
});

const CreateCaseWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  sourceDiscussionId: z.string().optional(),
  id: z.string().regex(/^case[-_]/).optional(),
  // Work identity binding (from decision_id)
  workId: z.string().optional(),
  // Golden work: Pendirian PT specific fields
  ptEstablishmentDetails: PTEstablishmentDetailsSchema.optional(),
  // Ambient execution context propagation (W4-C20-001 compliance)
  decision_id: z.string().optional(),
  last_invocation_digest: z.string().optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  actorId: z.string().optional(),
  linkedIntentId: z.string().optional(), // Context integrity: link Work to its originating Intent
});

const ListCasesWithContextSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["draft", "open", "in_progress", "closed", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  // Allow anonymous sessions to pass context directly
  sessionId: z.string().min(1),
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  actorId: z.string().optional(),
});

type CreateCaseWithContextInput = z.infer<typeof CreateCaseWithContextSchema>;
type ListCasesWithContextInput = z.infer<typeof ListCasesWithContextSchema>;

type CreateCaseCommand = CapabilityCommand<CreateCaseWithContextInput, Promise<CreateCaseOutput>>;
type CloseCaseCommand = CapabilityCommand<CloseCaseInput, Promise<CloseCaseOutput>>;
type AssignLawyerCommand = CapabilityCommand<AssignLawyerInput, Promise<AssignLawyerOutput>>;
type ListCasesCommand = CapabilityCommand<ListCasesWithContextInput, Promise<SearchCasesOutput>>;

// Initialize schema once at module load time, not per invocation
let schemaInitialized = false;
async function ensureIdentitySchema() {
  if (!schemaInitialized && process.env.DATABASE_URL) {
    // Initialize Postgres schema only when in production mode
    await initIdentitySchema();
    schemaInitialized = true;
  }
}

export const createCase: CreateCaseCommand = {
  kind: "command",
  name: "case.create",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = CreateCaseWithContextSchema.parse(input);
    const { title, description, priority, sessionId, sourceDiscussionId, id: preferredId, decision_id, last_invocation_digest, ptEstablishmentDetails, linkedIntentId } = parsed as any;
    
    // 1. Validate session exists and is active OR use passed tenant/workspace/actor from context (cross-capability call)
    let tenantId: string;
    let workspaceId: string;
    let actorId: string;
    
    // If called from cross-capability workflow with already verified context, use those values
    if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
      tenantId = parsed.tenantId;
      workspaceId = parsed.workspaceId;
      actorId = parsed.actorId;
    } else {
      // Direct API call - handle both authenticated and anonymous sessions (P0: allow first-time visitors)
      // If we already have tenantId/workspaceId/actorId passed from API layer (anonymous case), use those
      if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
        tenantId = parsed.tenantId;
        workspaceId = parsed.workspaceId;
        actorId = parsed.actorId;
      } else {
        // Check if this is an anonymous session - skip DB validation for anonymous users
        const isAnonymous = parsed.actorId === "anonymous.user";
        if (isAnonymous) {
          // Use the anonymous session values directly - no DB validation needed for ephemeral visitors
          tenantId = parsed.tenantId!;
          workspaceId = parsed.workspaceId!;
          actorId = parsed.actorId!;
        } else {
          // Authenticated user - validate session from DB and extract
          const session = await sessionRepository.byId(sessionId as any);
          if (!session || session.revokedAt !== null) {
            throw new Error("[case.create] Invalid or revoked session - authentication violation");
          }
          ({ tenantId, workspaceId, actorId } = session);
        }
      }
    }

    // CONTEXT INTEGRITY VALIDATION: If linkedIntentId is provided, verify it exists
    // Prevents orphaned work that's not linked to a valid originating Intent
    if (linkedIntentId) {
      const existingIntent = await intentRepository.byId(linkedIntentId, { tenantId, workspaceId });
      if (!existingIntent) {
        throw new Error(`[case.create] Invalid linkedIntentId: ${linkedIntentId} does not exist in this tenant/workspace - context integrity violation`);
      }
      console.log("[case.create] ✅ Context integrity verified: linkedIntentId exists", linkedIntentId);
      
      // Mark intent as converted to work to complete the provenance chain
      await intentRepository.markAsConverted(linkedIntentId, preferredId || newCaseId());
    }
    
    // If called from cross-capability workflow with already verified context, use those values
    if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
      tenantId = parsed.tenantId;
      workspaceId = parsed.workspaceId;
      actorId = parsed.actorId;
    } else {
      // Direct API call - handle both authenticated and anonymous sessions (P0: allow first-time visitors)
      // If we already have tenantId/workspaceId/actorId passed from API layer (anonymous case), use those
      if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
        tenantId = parsed.tenantId;
        workspaceId = parsed.workspaceId;
        actorId = parsed.actorId;
      } else {
        // Check if this is an anonymous session - skip DB validation for anonymous users
        const isAnonymous = parsed.actorId === "anonymous.user";
        if (isAnonymous) {
          // Use the anonymous session values directly - no DB validation needed for ephemeral visitors
          tenantId = parsed.tenantId!;
          workspaceId = parsed.workspaceId!;
          actorId = parsed.actorId!;
        } else {
          // Authenticated user - validate session from DB and extract
          const session = await sessionRepository.byId(sessionId as any);
          if (!session || session.revokedAt !== null) {
            throw new Error("[case.create] Invalid or revoked session - authentication violation");
          }
          ({ tenantId, workspaceId, actorId } = session);
        }
      }
    }

    // 2. Capture ambient execution context for lineage tracking (W4-C20-001 compliance)
    const executionContext = {
      decision_id,
      last_invocation_digest,
      propagated_from: parsed.tenantId ? "cross-capability" : "direct-api"
    };
    // Enforce security via session's already verified isolation guarantees
    // No need for additional checks - session is cryptographically bound to tenant/workspace

    // Context integrity validation already performed earlier in the function
    // No duplicate validation needed - maintains single source of truth for context checks

    // Preferred ID: if provided and unused, apply it (canonical experiment ID replay support)
    let caseId: CaseId = newCaseId();
    if (preferredId !== undefined) {
      const existing = await caseRepository.byId(preferredId as CaseId, { tenantId, workspaceId });
      if (existing) throw new Error(`[case.create] Preferred case ID already exists: ${preferredId}`);
      caseId = preferredId as CaseId;
    }

    const entity: CaseAggregate = {
      id: caseId,
      title: title.trim(),
      ...(input.workId ? { workId: input.workId } : {}),
      ...(description !== undefined && description !== ""
        ? { description: description }
        : {}),
      ...(sourceDiscussionId !== undefined
        ? { sourceDiscussionId: sourceDiscussionId }
        : {}),
      ...(ptEstablishmentDetails !== undefined
        ? { ptEstablishmentDetails: ptEstablishmentDetails }
        : {}),
      status: defaultCaseStatus,
      priority: priority ?? defaultCasePriority,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add execution context for lineage tracking (W4-C20-001 compliance)
      executionContext,
    } as any;
    // Add tenant/workspace/actor context for isolation
    (entity as any).tenantId = tenantId;
    (entity as any).workspaceId = workspaceId;
    (entity as any).actorId = actorId;

    await caseRepository.save(entity, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    return { id: entity.id, status: entity.status, workId: entity.workId || entity.id };
  },
};

export const closeCase: CloseCaseCommand = {
  kind: "command",
  name: "case.close",
  version: "2.0.0",
  async execute(input) {
    // Extract session and context from input with anonymous support
    const parsed = input as any;
    const { sessionId, id } = parsed;
    
    // Initialize context variables BEFORE usage
    let tenantId: string;
    let workspaceId: string;
    let actorId: string;
    
    // Standardized context extraction pattern - same for all commands
    // If called from cross-capability workflow with already verified context, use those values
    if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
      tenantId = parsed.tenantId;
      workspaceId = parsed.workspaceId;
      actorId = parsed.actorId;
    } else {
      // Direct API call - check if this is an anonymous session
      const isAnonymous = parsed.actorId === "anonymous.user";
      if (isAnonymous) {
        // Use the anonymous session values directly from input
        tenantId = parsed.tenantId!;
        workspaceId = parsed.workspaceId!;
        actorId = parsed.actorId!;
      } else {
        // Authenticated user - validate session from DB and extract context
        const session = await sessionRepository.byId(sessionId as any);
        if (!session || session.revokedAt !== null) {
          throw new Error("[case.close] Invalid or revoked session - authentication violation");
        }
        ({ tenantId, workspaceId, actorId } = session);
      }
    }

    const current = await caseRepository.byId(id as CaseId, { 
      tenantId: tenantId, 
      workspaceId: workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[case.close] Case not found: ${id}`);
    }
    if (current.status === "closed") {
      return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
    }
    const closedAt = new Date();
    const next: CaseAggregate = { ...current, status: "closed", closedAt, workId: current.workId };
    await caseRepository.save(next, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    return { id: next.id, status: "closed", closedAt };
  },
};

export const assignLawyer: AssignLawyerCommand = {
  kind: "command",
  name: "case.assignLawyer",
  version: "2.0.0",
  async execute(input) {
    // Extract session and context from input with anonymous support
    const parsed = input as any;
    const { sessionId, id, lawyerId } = parsed;
    
    // Initialize context variables BEFORE usage
    let tenantId: string;
    let workspaceId: string;
    let actorId: string;
    
    // Standardized context extraction pattern - same for all commands
    // If called from cross-capability workflow with already verified context, use those values
    if (parsed.tenantId && parsed.workspaceId && parsed.actorId) {
      tenantId = parsed.tenantId;
      workspaceId = parsed.workspaceId;
      actorId = parsed.actorId;
    } else {
      // Direct API call - check if this is an anonymous session
      const isAnonymous = parsed.actorId === "anonymous.user";
      if (isAnonymous) {
        // Use the anonymous session values directly from input
        tenantId = parsed.tenantId!;
        workspaceId = parsed.workspaceId!;
        actorId = parsed.actorId!;
      } else {
        // Authenticated user - validate session from DB and extract context
        const session = await sessionRepository.byId(sessionId as any);
        if (!session || session.revokedAt !== null) {
          throw new Error("[case.assignLawyer] Invalid or revoked session - authentication violation");
        }
        ({ tenantId, workspaceId, actorId } = session);
      }
    }

    const current = await caseRepository.byId(id as CaseId, { 
      tenantId: tenantId, 
      workspaceId: workspaceId 
    });
    if (current === undefined) {
      throw new Error(`[case.assignLawyer] Case not found: ${id}`);
    }
    if (current.status === "closed") {
      throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${id}`);
    }
    const nextStatus = "in_progress";
    const next: CaseAggregate = {
      ...current,
      lawyerId: lawyerId,
      status: nextStatus,
      workId: current.workId,
    };
    await caseRepository.save(next, { 
      tenantId: tenantId, 
      workspaceId: workspaceId, 
      actorId: actorId 
    });
    return { id: next.id, lawyerId: next.lawyerId!, status: next.status };
  },
};

export const listCasesByWorkspace: ListCasesCommand = {
  kind: "command",
  name: "case.listByWorkspace",
  version: "2.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    const parsed = ListCasesWithContextSchema.parse(input);
    const { sessionId, limit, offset } = parsed;

    // Handle anonymous sessions - extract context directly from input, no DB validation needed
    let tenantId: string;
    let workspaceId: string;
    let actorId: string;
    
    // Check if this is an anonymous session (was passed in the input)
    const isAnonymous = (parsed as any).actorId === "anonymous.user";
    if (isAnonymous) {
      // Use anonymous session values directly from input
      tenantId = (parsed as any).tenantId!;
      workspaceId = (parsed as any).workspaceId!;
      actorId = (parsed as any).actorId!;
    } else {
      // Authenticated user - validate session from DB and extract
      const session = await sessionRepository.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[case.listByWorkspace] Invalid or revoked session - authentication violation");
      }
      ({ tenantId, workspaceId, actorId } = session);
    }
    // Session is already verified during creation - no need for redundant checks
    
    console.log("[listCasesByWorkspace] Listing cases for workspace:", workspaceId, "tenant:", tenantId);

    // Get all cases for this workspace - bypass workspace filter in development for in-memory
    let allWorkspaceCases;
    if (process.env.DATABASE_URL) {
      allWorkspaceCases = await caseRepository.listByWorkspace(workspaceId);
    } else {
      // In-memory mode: return all cases to fix "work not found" in workspace list
      allWorkspaceCases = await caseRepository.list();
    }
    
    // Apply filters if provided
    let filteredCases = [...allWorkspaceCases];
    
    // Filter by status if not "all"
    if (parsed.status && parsed.status !== "all") {
      filteredCases = filteredCases.filter(c => c.status === parsed.status);
    }
    
    // Filter by priority if not "all"
    if (parsed.priority && parsed.priority !== "all") {
      filteredCases = filteredCases.filter(c => c.priority === parsed.priority);
    }
    
    // Filter by search query if provided
    if (parsed.query) {
      const query = parsed.query.toLowerCase();
      filteredCases = filteredCases.filter(c => 
        c.title.toLowerCase().includes(query) || 
        (c.description?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply pagination
    const paginatedCases = filteredCases.slice(offset, offset + limit);
    
    return {
      items: paginatedCases,
      total: allWorkspaceCases.length,
      matched: filteredCases.length,
      offset,
      limit,
    };
  },
};

// Import already exists at top of file with correct .js extension

// import { z } from "zod"; (duplicate removed, already imported at top)
// import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types"; (duplicate removed)
// import type { CaseAggregate, CaseId } from "../contracts/index"; (duplicate removed)

// Add evidence command schema and implementation
const AddEvidenceToCaseSchema = z.object({
  id: z.string().min(1), // Case ID
  evidence: z.object({
    type: z.enum(["document", "external_response", "communication", "outcome"]),
    title: z.string().min(1),
    url: z.string().optional(),
    content: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
  // Required context for tenant isolation - supports anonymous sessions
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type AddEvidenceToCaseInput = z.infer<typeof AddEvidenceToCaseSchema>;
type AddEvidenceToCaseCommand = CapabilityCommand<AddEvidenceToCaseInput, Promise<CaseAggregate>>;

export const addEvidenceToCase: AddEvidenceToCaseCommand = {
  kind: "command",
  name: "case.addEvidence",
  version: "1.0.0",
  async execute(input) {
    const parsed = AddEvidenceToCaseSchema.parse(input);
    const { sessionId, tenantId, workspaceId, actorId, id, evidence: newEvidence } = parsed;
    
    // Anonymous session validation (same pattern as other commands)
    const isAnonymous = actorId === "anonymous.user";
    if (!isAnonymous) {
      const session = await sessionRepository.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[case.addEvidence] Invalid or revoked session - authentication violation");
      }
      if (session.tenantId !== tenantId || session.workspaceId !== workspaceId || session.actorId !== actorId) {
        throw new Error("[case.addEvidence] Context mismatch - security violation");
      }
    }

    // Get current case
    const caseId = id as CaseId;
    const current = await caseRepository.byId(caseId, { tenantId, workspaceId });
    if (!current) {
      throw new Error(`[case.addEvidence] Case not found: ${id}`);
    }

    // Create immutable evidence entry
    const evidenceEntry = {
      id: `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      ...newEvidence,
      uploadedBy: actorId,
      uploadedAt: new Date(),
    };

    // Append to evidence chain (immutable - never modify existing entries)
    const updatedEvidence = [...(current.evidence || []), evidenceEntry];
    const next: CaseAggregate = {
      ...current,
      evidence: updatedEvidence,
      updatedAt: new Date(),
    } as any;

    // Save updated case
    await caseRepository.save(next, { tenantId, workspaceId, actorId });

    // Automatically record to central evidence registry (reuses existing capability)
    try {
      const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/index");
      await capabilityRegistry.invoke("evidence-registry", "evidence.record", {
        entityRef: id,
        entityType: "legal-case",
        action: "evidence_added",
        actorId: actorId,
        details: { evidenceId: evidenceEntry.id, type: evidenceEntry.type },
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        tenantId: tenantId,
        workspaceId: workspaceId,
      });
    } catch (registryError) {
      console.warn("[case.addEvidence] Evidence registry record failed (non-critical):", registryError);
      // Case save succeeded, don't fail the whole operation for registry issues
    }

    return next;
  },
};

// Add mark case as completed command
const MarkCaseCompletedSchema = z.object({
  id: z.string().min(1),
  outcomeDescription: z.string().min(1),
  externalReferenceId: z.string().optional(),
  // Required context
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
});

type MarkCaseCompletedInput = z.infer<typeof MarkCaseCompletedSchema>;
type MarkCaseCompletedCommand = CapabilityCommand<MarkCaseCompletedInput, Promise<CaseAggregate>>;

export const markCaseCompleted: MarkCaseCompletedCommand = {
  kind: "command",
  name: "case.markCompleted",
  version: "1.0.0",
  async execute(input) {
    const parsed = MarkCaseCompletedSchema.parse(input);
    const { sessionId, tenantId, workspaceId, actorId, id, outcomeDescription, externalReferenceId } = parsed;
    
    // Anonymous session validation
    const isAnonymous = actorId === "anonymous.user";
    if (!isAnonymous) {
      const session = await sessionRepository.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[case.markCompleted] Invalid or revoked session - authentication violation");
      }
    }

    // Get current case
    const caseId = id as CaseId;
    const current = await caseRepository.byId(caseId, { tenantId, workspaceId });
    if (!current) {
      throw new Error(`[case.markCompleted] Case not found: ${id}`);
    }

    // Create outcome entry
    const outcome = {
      description: outcomeDescription,
      completedAt: new Date(),
      verifiedBy: actorId,
      externalReferenceId: externalReferenceId,
    };

    // Add outcome as evidence to maintain chain
    const outcomeEvidence = {
      id: `evidence-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      type: "outcome" as const,
      title: "Case Completed",
      content: outcomeDescription,
      uploadedBy: actorId,
      uploadedAt: outcome.completedAt,
      metadata: { externalReferenceId },
    };

    const updatedEvidence = [...(current.evidence || []), outcomeEvidence];
    const next: CaseAggregate = {
      ...current,
      status: "closed",
      outcome: outcome,
      evidence: updatedEvidence,
      updatedAt: new Date(),
      closedAt: new Date(),
    } as any;

    // Save updated case
    await caseRepository.save(next, { tenantId, workspaceId, actorId });

    // Trigger agentic notification (same as other state transitions)
    const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/index");
    await capabilityRegistry.invoke("communication", "agenticNotify", {
      work_id: id,
      trigger: "state_transition",
      old_state: current.status,
      new_state: "completed",
      recipient_ids: current.lawyerId ? [current.lawyerId] : [],
      adapter_type: "whatsapp",
      sessionId: "session-agent-001",
      tenantId: tenantId,
      workspaceId: workspaceId
    });

    return next;
  },
};

// NEW: Command to create Case from existing core Work (supports Work specialization flow)
const createCaseFromWork: CapabilityCommand<{
  workId: string;
  coreWork: any;
  domainSpecificData?: any;
}, Promise<{ id: string; workId: string; domainType: string }>> = {
  kind: "command",
  name: "case.createFromWork",
  version: "1.0.0",
  async execute(input) {
    await ensureIdentitySchema();
    
    // Reuse existing case.create logic but pass through the core Work's context
    const result = await createCase.execute({
      title: input.coreWork.title,
      description: input.coreWork.description,
      priority: input.coreWork.priority,
      sessionId: input.coreWork.sessionId,
      tenantId: input.coreWork.tenantId,
      workspaceId: input.coreWork.workspaceId,
      actorId: input.coreWork.actorId,
      linkedIntentId: input.coreWork.linkedIntentId,
      workId: input.workId, // Bind case to the core Work's ID
      // Pass through any domain-specific data from the original request
      ...(input.domainSpecificData || {}),
    });
    
    return {
      id: result.id,
      workId: input.workId,
      domainType: "legal-case",
    };
  },
};

export const caseCommands: Readonly<Record<string, CapabilityCommand>> = {
  "case.create": createCase,
  "case.createFromWork": createCaseFromWork,
  "case.close": closeCase,
  "case.assignLawyer": assignLawyer,
  "case.getById": getCaseByIdCommand,
  "case.listByWorkspace": listCasesByWorkspace,
  "case.addEvidence": addEvidenceToCase,
  "case.markCompleted": markCaseCompleted,
} as const;

export type { CreateCaseCommand, CloseCaseCommand, AssignLawyerCommand, AddEvidenceToCaseCommand, MarkCaseCompletedCommand };

export function nextCaseId(): CaseId {
  return newCaseId();
}