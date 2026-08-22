import { z } from "zod";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/types.js";
import { CaseRepositoryInMemory, getCaseRepositoryPostgres } from "../repository/index.js";
import { DocumentRepositoryInMemory, getDocumentRepositoryPostgres } from "../../../legal-document/implementation/repository/index.js";
import type { CaseId, CaseAggregate } from "../contracts/index.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";

// Toggle all repositories based on environment (match identity production rail)
const caseRepository = process.env.DATABASE_URL 
  ? getCaseRepositoryPostgres() 
  : CaseRepositoryInMemory;
const documentRepository = process.env.DATABASE_URL 
  ? getDocumentRepositoryPostgres() 
  : DocumentRepositoryInMemory;
const sessionRepository = process.env.DATABASE_URL 
  ? getSessionRepositoryPostgres() 
  : SessionRepositoryInMemory;

export const GetCaseByIdInputSchema = z.object({
  caseId: z.string().min(1).startsWith("case-"),
  // Only sessionId required - auto-populate isolation context from session
  sessionId: z.string().min(1),
});

export type GetCaseByIdInput = z.infer<typeof GetCaseByIdInputSchema>;

export type GetCaseByIdOutput = {
  readonly type: "lawyershub.case";
  readonly id: string;
  readonly displayTitle: string;
  readonly displaySubtitle: string;
  readonly rawStatus: string;
  readonly owner: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly evidenceCount: number;
  readonly priority: string;
} | undefined;

export const getCaseByIdCommand: CapabilityCommand<GetCaseByIdInput, Promise<GetCaseByIdOutput>> = {
  kind: "command",
  name: "case.getById",
  version: "2.0.0",
  async execute(input: unknown) {
    // Initialize Postgres schema only when in production mode
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    
    const parsed = GetCaseByIdInputSchema.parse(input);
    const { caseId, sessionId } = parsed;

    // Validate session exists and is active
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[case.getById] Invalid or revoked session - authentication violation");
    }

    // Auto-populate isolation context from trusted session (minimal fix)
    const { tenantId, workspaceId, actorId } = session;
    // Session is already verified during creation - no need for redundant checks

    const c = await caseRepository.byId(caseId as unknown as CaseId);
    if (c === undefined) {
      return undefined;
    }

    // Additional case-level tenant isolation check
    if ((c as any).tenantId !== tenantId || (c as any).workspaceId !== workspaceId) {
      throw new Error("[case.getById] Case does not belong to the current tenant/workspace - access denied");
    }

    const evidenceCount = (await documentRepository.listByMatter(caseId)).length;

    return {
      type: "lawyershub.case",
      id: caseId,
      displayTitle: c.title,
      displaySubtitle: c.description ?? "Legal Matter",
      rawStatus: c.status,
      owner: c.lawyerId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      evidenceCount,
      priority: c.priority,
    };
  },
};