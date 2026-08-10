import type { CapabilityCommand } from "@repo/core-kernel";
import {
  SessionId,
  type SessionAggregate,
} from "../contracts/identity.contracts";
import { SessionRepositoryInMemory } from "../repositories";

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
  version: "1.0.0",

  execute(input) {
    if (!input.sessionId) {
      return { ok: true as const };
    }
    const sid = SessionId(input.sessionId);
    const existing = SessionRepositoryInMemory.byId(sid);
    if (existing === undefined) {
      return { ok: true as const };
    }
    const revoked: SessionAggregate = SessionRepositoryInMemory.revoke(sid);
    return {
      ok: true as const,
      revokedSessionId: revoked.id,
      revokedAt: revoked.revokedAt?.toISOString(),
    };
  },
};

export { logoutUserCommand as revokeSessionCommand };
