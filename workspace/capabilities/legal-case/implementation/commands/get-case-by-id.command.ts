import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { CaseRepositoryPostgres } from "../repository/case-postgres.repository";
import { DocumentRepositoryInMemory } from "../../../legal-document/implementation/repository";
import type { CaseId, CaseAggregate } from "../contracts";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository";
import { SessionRepositoryPostgres } from "../../../identity/implementation/repositories/session.repository";

export const GetCaseByIdInputSchema = z.object({
  caseId: z.string().min(1).startsWith("case-"),
  // Required context for tenant isolation and authentication
  sessionId: z.string().min(1),
  tenantId: z.string().min(1),
  workspaceId: z.string().min(1),
  actorId: z.string().min(1),
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
    await initIdentitySchema();
    
    const parsed = GetCaseByIdInputSchema.parse(input);
    const { caseId, sessionId, tenantId, workspaceId, actorId } = parsed;

    // Validate session exists and is active
    const session = await SessionRepositoryPostgres.byId(sessionId as any);
    if (!session) {
      throw new Error("[case.getById] Invalid or expired session");
    }

    // Validate tenant and workspace isolation
            if (session.tenantId !== tenantId) {
              throw new Error("[case.getById] Session tenant mismatch - tenant isolation violation");
            }
            if (session.workspaceId !== workspaceId) {
              throw new Error("[case.getById] Session workspace mismatch - tenant isolation violation");
            }
            if (session.actorId !== actorId) {
              throw new Error("[case.getById] Session actor mismatch - authentication violation");
            }

    const c = await CaseRepositoryPostgres.byId(caseId as unknown as CaseId);
    if (c === undefined) {
      return undefined;
    }

    // Additional case-level tenant isolation check
    if ((c as any).tenantId !== tenantId || (c as any).workspaceId !== workspaceId) {
      throw new Error("[case.getById] Case does not belong to the current tenant/workspace - access denied");
    }

    const evidenceCount = DocumentRepositoryInMemory.list().filter((d: { readonly matterId?: unknown }) => d.matterId === caseId).length;

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