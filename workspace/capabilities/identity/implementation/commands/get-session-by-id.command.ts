import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  SessionId,
  type SessionAggregate,
} from "../contracts/identity.contracts.js";
import { SessionRepositoryPostgres } from "../repositories/index.js";

export const GetSessionByIdInputSchema = z.object({
  sessionId: z.string().min(1),
});

export type GetSessionByIdInput = z.infer<typeof GetSessionByIdInputSchema>;

export type GetSessionByIdOutput = {
  readonly session: {
    readonly sessionId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly issuedAt: string;
  };
  readonly authenticated: boolean;
} | undefined;

export const getSessionByIdCommand: CapabilityCommand<
  GetSessionByIdInput,
  GetSessionByIdOutput
> = {
  kind: "command",
  name: "identity.getSessionById",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    const parsed = GetSessionByIdInputSchema.parse(input);
    const aggregate = await SessionRepositoryPostgres.byId(SessionId(parsed.sessionId));
    
    if (aggregate === undefined) {
      return undefined;
    }

    if (aggregate.revokedAt !== null) {
      return undefined;
    }

    const sessionIssuedAt = aggregate.issuedAt ?? new Date();
    const sessionExpiresAt = aggregate.expiresAt ?? new Date(Date.now() + 86400000);
    if (sessionExpiresAt.getTime() <= Date.now()) {
      return undefined;
    }

    return {
      session: {
        sessionId: aggregate.id,
        actorId: aggregate.userId,
        actorLabel: aggregate.actorLabel,
        tenantId: aggregate.tenantId,
        workspaceId: aggregate.workspaceId,
        productId: aggregate.productId,
        issuedAt: sessionIssuedAt.toISOString(),
      },
      authenticated: true,
    };
  },
};