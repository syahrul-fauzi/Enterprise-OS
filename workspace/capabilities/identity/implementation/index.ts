// @ts-nocheck
// @ts-nocheck
// Import langsung dari file spesifik untuk menghindari barrel index.js import yang menyebabkan Next.js module not found
// Hanya export yang dibutuhkan golden spine route (session, user, tenant, workspace, membership, intent)
export { getUserRepositoryPostgres } from "./repositories/user.repository.js";
export { getSessionRepositoryPostgres } from "./repositories/session.repository.js";
export { getMembershipRepositoryPostgres } from "./repositories/membership.repository.js";
export { getMembershipRepositoryInMemory, resetMembershipRepositoryInMemory, MembershipRepositoryInMemory } from "./repositories/membership.inmemory.js";
export { getTenantRepositoryPostgres } from "./repositories/tenant.repository.js";
export { getWorkspaceRepositoryPostgres } from "./repositories/workspace.repository.js";
export { getIntentRepositoryPostgres } from "./repositories/intent.repository.js";
export { initIdentitySchema, getPool, PostgresRepository } from "./repositories/base.repository.js";
// Pulihkan export yang diperlukan oleh route auth login/signup
export { newSessionId, resetSessionRepository, SessionRepositoryInMemory } from "./repositories/session.inmemory.js";
export { newUserId } from "./repositories/user.inmemory.js";
// Re-export semua type/value dari identity.contracts.ts agar bisa diimport dari @capabilities/identity
export * from "@repo/contracts-core";
// Original barrel exports - pastikan semua command terexport untuk import dari route auth
export * from "./commands/index.js";
import { passwordService } from "./services/password.service.js";
export * from "./services/password.service.js";
// Main capability implementation export (required for StaticRegistry registration)
// Follows EOS canonical export pattern: export service singleton as capability name
export const identity = passwordService;
// Ekspisit export untuk memastikan kompatibilitas dengan import yang ada
export { signupAndSessionCommand, SignupAndSessionInputSchema, ssoSignupFlowCommand, SsoSignupFlowInputSchema } from "./commands/index.js";