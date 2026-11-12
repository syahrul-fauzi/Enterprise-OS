import { capabilityRegistry, type CapabilityCommand } from "../../../../packages/core/kernel/src/registry/capability-command-registry";
import type { ExecutionContext } from "../../../../packages/core/runtime/src/execution-context.js";
import { safeRecordEvidence } from "../../../../capabilities/work-core/implementation/utils/evidence.utils.js";

export const dealCoordinatorCommands: Record<string, CapabilityCommand> = {
  crossOrgAgreementExecute: {
    name: "cross-org-agreement.execute",
    capability: "deal-coordinator",
    description: "Execute cross-organizational agreement workflow",
    // W06-A2 compliant: menerima input sebagai parameter pertama, ExecutionContext sebagai parameter kedua (trust boundary pattern canonical)
    execute: async (input: any, context: ExecutionContext) => {
      // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT
      const trustedActorId = context.actor_id;
      const trustedTenantId = context.tenant_id;
      const contextTraceId = context.context_trace_id;
      const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
      const workspaceId = context.workspace_id;

      // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN
      if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
        // Gunakan canonical safeRecordEvidence untuk audit durability
        await safeRecordEvidence({
          workspace_id: workspaceId || "unknown",
          capability: "deal-coordinator",
          command: "deal-coordinator.cross-org-agreement.execute",
          work_id: input.agreementId || "unknown",
          tenant_id: trustedTenantId || "unknown",
          actor_id: trustedActorId || "unknown",
          timestamp: new Date().toISOString(),
          sessionId: sessionId || "unknown",
          decision_id: "W06-A2-AUDIT-DENY-DC-001"
        });
        throw new Error("unauthorized: Missing authenticated context");
      }

      // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT - gunakan SessionRepositoryInMemory untuk test, Postgres untuk production
      const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
      // Deteksi environment test (jika SessionRepositoryInMemory sudah memiliki session test)
      const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
      const activeSession = await sessionRepository.byId(sessionId);
      if (!activeSession) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.cross-org-agreement.execute",
          work_id: input.agreementId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-002"
        });
        throw new Error("unauthorized: No active valid session");
      }

      // 4. VERIFIKASI BINDING SESSION (anti session substitution)
      if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.cross-org-agreement.execute",
          work_id: input.agreementId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-003"
        });
        throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
      }

      // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap)
      // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
      const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
      if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.cross-org-agreement.execute",
          work_id: input.agreementId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-004"
        });
        throw new Error("unauthorized: Session revoked or expired");
      }

      // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
      const requiredPermissions = ["deal-coordinator:execute", "cross-org:create"];
      const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
      
      if (!hasAllPermissions) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.cross-org-agreement.execute",
          work_id: input.agreementId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-007"
        });
        throw new Error("unauthorized: Insufficient permissions to execute cross-org agreement");
      }

      // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
      await safeRecordEvidence({
        workspace_id: workspaceId,
        capability: "deal-coordinator",
        command: "deal-coordinator.cross-org-agreement.execute",
        work_id: input.agreementId,
        tenant_id: trustedTenantId,
        actor_id: trustedActorId,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        decision_id: "W06-A2-AUDIT-ALLOW-DC-001"
      });

      console.log(`[AUDIT][ALLOW][deal-coordinator.cross-org-agreement.execute] correlation_id=${contextTraceId} - Eksekusi dimulai untuk perjanjian: ${input.agreementId}`);
      return { success: true, agreementId: input.agreementId, executedAt: new Date().toISOString(), tenantId: trustedTenantId };
    },
    requiredAuthorizations: ["deal-coordinator:execute", "cross-org:create"],
    riskLevel: "medium"
  },
  paymentReconciliationExecute: {
    name: "payment-reconciliation.execute",
    capability: "deal-coordinator",
    description: "Execute payment reconciliation process",
    // W06-A2 compliant: menerima input sebagai parameter pertama, ExecutionContext sebagai parameter kedua (trust boundary pattern canonical)
    execute: async (input: any, context: ExecutionContext) => {
      // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT
      const trustedActorId = context.actor_id;
      const trustedTenantId = context.tenant_id;
      const contextTraceId = context.context_trace_id;
      const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
      const workspaceId = context.workspace_id;

      // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN
      if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
        // Gunakan canonical safeRecordEvidence untuk audit durability
        await safeRecordEvidence({
          workspace_id: workspaceId || "unknown",
          capability: "deal-coordinator",
          command: "deal-coordinator.payment-reconciliation.execute",
          work_id: input.reconciliationId || "unknown",
          tenant_id: trustedTenantId || "unknown",
          actor_id: trustedActorId || "unknown",
          timestamp: new Date().toISOString(),
          sessionId: sessionId || "unknown",
          decision_id: "W06-A2-AUDIT-DENY-DC-005"
        });
        throw new Error("unauthorized: Missing authenticated context");
      }

      // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT - gunakan SessionRepositoryInMemory untuk test, Postgres untuk production
      const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
      // Deteksi environment test (jika SessionRepositoryInMemory sudah memiliki session test)
      const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
      const activeSession = await sessionRepository.byId(sessionId);
      if (!activeSession) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.payment-reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-006"
        });
        throw new Error("unauthorized: No active valid session");
      }

      // 4. VERIFIKASI BINDING SESSION (anti session substitution)
      if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.payment-reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-007"
        });
        throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
      }

      // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap)
      // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
      const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
      if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.payment-reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-008"
        });
        throw new Error("unauthorized: Session revoked or expired");
      }

      // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
      const requiredPermissions = ["deal-coordinator:execute", "payment:reconcile"];
      const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
      
      if (!hasAllPermissions) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.payment-reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-008"
        });
        throw new Error("unauthorized: Insufficient permissions to execute payment reconciliation");
      }

      // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
      await safeRecordEvidence({
        workspace_id: workspaceId,
        capability: "deal-coordinator",
        command: "deal-coordinator.payment-reconciliation.execute",
        work_id: input.reconciliationId,
        tenant_id: trustedTenantId,
        actor_id: trustedActorId,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        decision_id: "W06-A2-AUDIT-ALLOW-DC-002"
      });

      console.log(`[AUDIT][ALLOW][deal-coordinator.payment-reconciliation.execute] correlation_id=${contextTraceId} - Eksekusi dimulai untuk rekonsiliasi: ${input.reconciliationId}`);
      return { success: true, reconciliationId: input.reconciliationId, matchedTransactions: input.transactionIds?.length || 0, tenantId: trustedTenantId };
    },
    requiredAuthorizations: ["deal-coordinator:execute", "payment:reconcile"],
    riskLevel: "medium"
  },
  reconciliationExecute: {
    name: "reconciliation.execute",
    capability: "deal-coordinator",
    description: "Execute general reconciliation workflow",
    // W06-A2 compliant: menerima input sebagai parameter pertama, ExecutionContext sebagai parameter kedua (trust boundary pattern canonical)
    execute: async (input: any, context: ExecutionContext) => {
      // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT
      const trustedActorId = context.actor_id;
      const trustedTenantId = context.tenant_id;
      const contextTraceId = context.context_trace_id;
      const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
      const workspaceId = context.workspace_id;

      // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN
      if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
        // Gunakan canonical safeRecordEvidence untuk audit durability
        await safeRecordEvidence({
          workspace_id: workspaceId || "unknown",
          capability: "deal-coordinator",
          command: "deal-coordinator.reconciliation.execute",
          work_id: input.reconciliationId || "unknown",
          tenant_id: trustedTenantId || "unknown",
          actor_id: trustedActorId || "unknown",
          timestamp: new Date().toISOString(),
          sessionId: sessionId || "unknown",
          decision_id: "W06-A2-AUDIT-DENY-DC-009"
        });
        throw new Error("unauthorized: Missing authenticated context");
      }

      // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT - gunakan SessionRepositoryInMemory untuk test, Postgres untuk production
      const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
      // Deteksi environment test (jika SessionRepositoryInMemory sudah memiliki session test)
      const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
      const activeSession = await sessionRepository.byId(sessionId);
      if (!activeSession) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-010"
        });
        throw new Error("unauthorized: No active valid session");
      }

      // 4. VERIFIKASI BINDING SESSION (anti session substitution)
      if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-011"
        });
        throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
      }

      // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap)
      // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
      const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
      if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-012"
        });
        throw new Error("unauthorized: Session revoked or expired");
      }

      // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
      const requiredPermissions = ["deal-coordinator:execute"];
      const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
      
      if (!hasAllPermissions) {
        await safeRecordEvidence({
          workspace_id: workspaceId,
          capability: "deal-coordinator",
          command: "deal-coordinator.reconciliation.execute",
          work_id: input.reconciliationId,
          tenant_id: trustedTenantId,
          actor_id: trustedActorId,
          timestamp: new Date().toISOString(),
          sessionId: sessionId,
          decision_id: "W06-A2-AUDIT-DENY-DC-013"
        });
        throw new Error("unauthorized: Insufficient permissions to execute reconciliation");
      }

      // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
      await safeRecordEvidence({
        workspace_id: workspaceId,
        capability: "deal-coordinator",
        command: "deal-coordinator.reconciliation.execute",
        work_id: input.reconciliationId,
        tenant_id: trustedTenantId,
        actor_id: trustedActorId,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        decision_id: "W06-A2-AUDIT-ALLOW-DC-003"
      });

      console.log(`[AUDIT][ALLOW][deal-coordinator.reconciliation.execute] correlation_id=${contextTraceId} - Eksekusi dimulai untuk rekonsiliasi umum`);
      return { success: true, reconciliationComplete: true, tenantId: trustedTenantId };
    },
    requiredAuthorizations: ["deal-coordinator:execute"],
    riskLevel: "low"
  }
};

export function registerDealCoordinatorCapability() {
  if (capabilityRegistry) {
    Object.values(dealCoordinatorCommands).forEach((command) => {
      capabilityRegistry.register(command);
      console.log(`[Deal-Coordinator] ✅ Registered command: ${command.name}`);
    });
    console.log("[Deal-Coordinator] 🚀 Deal Coordinator commands fully registered");
  } else {
    console.error("[Deal-Coordinator] ❌ capabilityRegistry not available, cannot register commands");
    throw new Error("capabilityRegistry not initialized");
  }
}