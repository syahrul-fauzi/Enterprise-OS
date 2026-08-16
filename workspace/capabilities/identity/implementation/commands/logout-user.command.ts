import type { CapabilityCommand } from "@repo/core-kernel";
import {
  SessionId,
  type SessionAggregate,
} from "../contracts/identity.contracts";
import { SessionRepositoryPostgres } from "../repositories/index";

type LogoutInput = {
  readonly sessionId?: string;
};

type LogoutOutput = {
  readonly ok: true;
  readonly revokedSessionId?: string;
  readonly revokedAt?: string;
};

type LogoutUserCommand = CapabilityCommand<LogoutInput, LogoutOutput>;

export const logoutUserCommand: LogoutUserCommand = {
  kind: "command",
  name: "identity.logoutUser",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    if (!input.sessionId) {
      return { ok: true as const };
    }
    const sid = SessionId(input.sessionId);
    const existing = await SessionRepositoryPostgres.byId(sid);
    if (existing === undefined) {
      return { ok: true as const };
    }
    // Session repository revoke method is async for Postgres
    const revoked: SessionAggregate = await SessionRepositoryPostgres.revoke(sid);
    return {
      ok: true as const,
      revokedSessionId: revoked.id,
      revokedAt: revoked.revokedAt?.toISOString(),
    };
  },
};

export { logoutUserCommand as revokeSessionCommand };