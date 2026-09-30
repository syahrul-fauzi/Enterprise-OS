// Root entry point for @capabilities/work-core - canonical single source of truth
// Re-export all contracts, commands, and repositories to maintain single semantic authority
export * from "./contracts/work.contracts.js";
// export * from "./implementation/commands/work.commands"; // File ini tidak ada/ belum diperlukan untuk substrate test
export * from "./implementation/repository/work-postgres.repository.js"; // File ini ada dan diperlukan untuk work-inspection dan substrate
// Re-export identity factories + repositories to enforce canonical import chain (identity→work-core→capabilities)
// Semua capability harus import dari sini, tidak langsung dari identity
export { 
  UserId, TenantId, WorkspaceId, MembershipId, SessionId, WorkId, ActorId, newWorkId
} from "../../capabilities/identity/implementation/contracts/identity.contracts.js";
// Re-export work-core specific types/factories
export { CompositionId } from "./contracts/work.contracts.js";
export { PostgresRepository, initIdentitySchema, getPool } from "../../capabilities/identity/implementation/repositories/base.repository.js";
export { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../capabilities/identity/implementation/repositories/index.js";