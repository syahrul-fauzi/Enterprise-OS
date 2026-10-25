// Re-export SEMUA types dari contracts yang dibutuhkan websocket-adapter dan capabilities lain
export type { 
  WorkId, WorkStatus, WorkAggregate, TenantId, ActorId, SessionId, CompositionId,
  DeviceId, DeviceHardwareAbstraction
} from "../contracts/work.contracts.js";

// Re-export SEMUA factory functions dari contracts yang dibutuhkan untuk identity
export { 
  createWorkId, newWorkId, createSessionId, newSessionId, 
  createActorId, newActorId, createDeviceId, newDeviceId,
  createTenantId, newTenantId, createWorkspaceId, newWorkspaceId
} from "../contracts/work.contracts.js";

// Re-export semua repository implementations
export { getWorkRepositoryLazy as getWORK_REPO } from "./commands/work.commands.js";
export { WorkRepositoryInMemory, getWorkRepositoryInMemory, resetWorkRepositoryInMemory } from "./repository/work-inmemory.repository.js";
export { getWorkRepositoryPostgres } from "./repository/work-postgres.repository.js";

// Re-export semua utility functions
export { safeRecordEvidence } from "./utils/evidence.utils.js";
// Canonical boundary check implementation (moved from consultation per Gate A requirement)
export { checkAutonomyBoundary } from "./utils/boundary-checks.utils.js";
export type { AutonomyBoundaryCheck, AutonomyBoundaryResult } from "./utils/boundary-checks.types.js";

// Re-export base repository classes dari identity
export { PostgresRepository, initIdentitySchema, getPool } from "../../identity/implementation/repositories/base.repository.js";
// Re-export identity repositories untuk kompatibilitas import dari work-core (hanya untuk primitif yang belum diekspor via kontrak)
export { getSessionRepositoryPostgres, SessionRepositoryPostgres } from "../../identity/implementation/repositories/session.repository.js";
export { SessionRepositoryInMemory } from "../../identity/implementation/index.js";