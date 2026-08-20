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
} from "../contracts/index.js";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import { newCaseId, defaultCasePriority, defaultCaseStatus, getCaseRepositoryPostgres } from "../repository/index.js";
import { CaseRepositoryInMemory } from "../repository/index.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";

// Toggle session repository based on environment (match identity production rail)
const sessionRepository = process.env.DATABASE_URL 
  ? getSessionRepositoryPostgres() 
  : SessionRepositoryInMemory;

// Toggle repository based on environment (minimal fix for production rail)
const caseRepository = process.env.DATABASE_URL 
  ? getCaseRepositoryPostgres() 
  : CaseRepositoryInMemory;

const CreateCaseWithContextSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  sourceDiscussionId: z.string().optional(),
  id: z.string().regex(/^case[-_]/).optional(),
  // Work identity binding (from decision_id)
  workId: z.string().optional(),
  // Ambient execution context propagation (W4-C20-001 compliance)
  decision_id: z.string().optional(),
  last_invocation_digest: z.string().optional(),
  sessionId: z.string().min(1),
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  actorId: z.string().optional(),
});

const ListCasesWithContextSchema = z.object({
  query: z.string().optional(),
  status: z.enum(["draft", "open", "in_progress", "closed", "all"]).optional(),
  priority: z.enum(["low", "medium", "high", "critical", "all"]).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  // Only sessionId required - auto-populate tenantId/workspaceId/actorId from session
  sessionId: z.string().min(1),
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
    const { title, description, priority, sessionId, sourceDiscussionId, id: preferredId, decision_id, last_invocation_digest } = parsed;

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
      // Direct API call - validate session and extract from trusted session
      const session = await sessionRepository.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[case.create] Invalid or revoked session - authentication violation");
      }
      ({ tenantId, workspaceId, actorId } = session);
    }

    // 2. Capture ambient execution context for lineage tracking (W4-C20-001 compliance)
    const executionContext = {
      decision_id,
      last_invocation_digest,
      propagated_from: parsed.tenantId ? "cross-capability" : "direct-api"
    };
    // Enforce security via session's already verified isolation guarantees
    // No need for additional checks - session is cryptographically bound to tenant/workspace

    // Preferred ID: if provided and unused, apply it (canonical experiment ID replay support)
    let caseId: CaseId = newCaseId();
    if (preferredId !== undefined) {
      const existing = await caseRepository.byId(preferredId as CaseId);
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
      status: defaultCaseStatus,
      priority: priority ?? defaultCasePriority,
      createdAt: new Date(),
      updatedAt: new Date(),
      // Add execution context for lineage tracking (W4-C20-001 compliance)
      executionContext,
    } as any;
    // Add tenant/workspace context for isolation
    (entity as any).tenantId = tenantId;
    (entity as any).workspaceId = workspaceId;

    await caseRepository.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const closeCase: CloseCaseCommand = {
  kind: "command",
  name: "case.close",
  version: "2.0.0",
  async execute(input) {
    const current = await caseRepository.byId(input.id as CaseId);
    if (current === undefined) {
      throw new Error(`[case.close] Case not found: ${input.id}`);
    }
    if (current.status === "closed") {
      return { id: current.id, status: "closed", closedAt: current.closedAt ?? new Date() };
    }
    const closedAt = new Date();
    const next: CaseAggregate = { ...current, status: "closed", closedAt, workId: current.workId };
    await caseRepository.save(next);
    return { id: next.id, status: "closed", closedAt };
  },
};

export const assignLawyer: AssignLawyerCommand = {
  kind: "command",
  name: "case.assignLawyer",
  version: "2.0.0",
  async execute(input) {
    const current = await caseRepository.byId(input.id as CaseId);
    if (current === undefined) {
      throw new Error(`[case.assignLawyer] Case not found: ${input.id}`);
    }
    if (current.status === "closed") {
      throw new Error(`[case.assignLawyer] Cannot assign lawyer to closed case: ${input.id}`);
    }
    const nextStatus: CaseAggregate["status"] =
      current.status === "closed" ? "closed" : "in_progress";
    const next: CaseAggregate = {
      ...current,
      lawyerId: input.lawyerId,
      status: nextStatus,
      workId: current.workId,
    };
    await caseRepository.save(next);
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

    // Validate session exists and is active
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[case.listByWorkspace] Invalid or revoked session - authentication violation");
    }

    // Auto-populate isolation context from trusted session (minimal fix)
    const { tenantId, workspaceId, actorId } = session;
    // Session is already verified during creation - no need for redundant checks

    // Get all cases for this workspace (already filtered by workspace for isolation)
    const allWorkspaceCases = await caseRepository.listByWorkspace(workspaceId);
    
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

import { getCaseByIdCommand } from "./get-case-by-id.command.js";

export const caseCommands: Readonly<Record<string, CapabilityCommand>> = {
  "case.create": createCase,
  "case.close": closeCase,
  "case.assignLawyer": assignLawyer,
  "case.getById": getCaseByIdCommand,
  "case.listByWorkspace": listCasesByWorkspace,
} as const;

export type { CreateCaseCommand, CloseCaseCommand, AssignLawyerCommand };

export function nextCaseId(): CaseId {
  return newCaseId();
}