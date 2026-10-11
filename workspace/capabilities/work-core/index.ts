// Root entry point for @capabilities/work-core - canonical single source of truth
// Re-export all contracts, commands, and repositories to maintain single semantic authority
export * from "./contracts/work.contracts";
// export * from "./implementation/commands/work.commands"; // File ini tidak ada/ belum diperlukan untuk substrate test
export * from "./implementation/repository/work-postgres.repository"; // File ini ada dan diperlukan untuk work-inspection dan substrate
// Explicitly re-export only non-duplicate utilities from evidence.utils (avoids TS2308 conflict)
export { safeRecordEvidence, buildWorkFaceProjection } from "./implementation/utils/index";
// Re-export identity factories + repositories to enforce canonical import chain (identity→work-core→capabilities)
// Semua capability harus import dari sini, tidak langsung dari identity - canonical source: @repo/contracts-core
// Pisahkan type dan value export untuk menghindari error: WorkId adalah type, createWorkId adalah value constructor
export type { 
  UserId, TenantId, WorkspaceId, MembershipId, SessionId, WorkId, ActorId
} from "@repo/contracts-core";
// Re-export SEMUA canonical value constructors dari work-core (sudah mencakup createXxx/newXxx untuk semua jenis ID)
// Ini mempertahankan pola createXxx/newXxx yang konsisten di seluruh codebase tanpa duplicate exports
// Re-export Session ID factories yang didefinisikan di file ini untuk kebutuhan observability dan evidence recording
// Re-export work-core specific types/factories - semua sudah tercover oleh export pertama work.contracts
export { PostgresRepository, initIdentitySchema, getPool } from "../../capabilities/identity/implementation/repositories/base.repository";
export { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../capabilities/identity/implementation/repositories/index";