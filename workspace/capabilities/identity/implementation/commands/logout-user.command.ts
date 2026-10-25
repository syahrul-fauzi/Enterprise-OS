import type { CapabilityCommand } from "@repo/core-kernel";
import {
  SessionId,
  type SessionAggregate,
} from "@repo/contracts-core";
import {
  getSessionRepositoryPostgres,
  SessionRepositoryInMemory,
} from "../repositories/index.js";
// Import kontrak kanonis dari work-core untuk validasi boundary
import { validateBoundaryAccess } from "../../../work-core/contracts/work.contracts.js";

// Lazy loading repository untuk menghindari module cycle dan mendukung Edge Runtime
let sessionRepository: ReturnType<typeof getSessionRepositoryPostgres> | null = null;

async function getSessionRepository() {
  if (!sessionRepository) {
    sessionRepository = (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
      ? getSessionRepositoryPostgres()
      : SessionRepositoryInMemory;
  }
  return sessionRepository;
}

type ActorContext = {
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
};

type LogoutInput = {
  readonly sessionId?: string;
  readonly actorContext?: ActorContext;
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
  version: "4.0.0",

  async execute(input: LogoutInput) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[logout-user] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    if (!input.sessionId) {
      return { ok: true as const };
    }
    
    const repo = await getSessionRepository();
    const sid = SessionId(input.sessionId);
    const existing = await repo.byId(sid);
    if (existing === undefined) {
      return { ok: true as const };
    }
    const revoked: SessionAggregate = await repo.revoke(sid);
    
    // Log audit untuk tracing actorContext jika disediakan
    if (input.actorContext) {
      console.log(`[logout-user] Session revoked by actor ${input.actorContext.actorId} in workspace ${input.actorContext.workspaceId}`);
    }
    
    return {
      ok: true as const,
      revokedSessionId: revoked.id,
      revokedAt: revoked.revokedAt?.toISOString(),
    };
  },
};

export { logoutUserCommand as revokeSessionCommand };