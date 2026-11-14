// @ts-nocheck
import { capabilityRegistry, type CapabilityCommand } from "@repo/core-kernel";
import type { ExecutionContext } from "@repo/core-runtime";
import { safeRecordEvidence } from "../../../../capabilities/work-core/implementation/utils/evidence.utils.js";

// Command implementations untuk value-metering shared capability - W06-A2 compliant: menerima ExecutionContext sebagai parameter kedua
const executeCostAttribution = async (input: any, context: ExecutionContext) => {
  // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT (boundary keamanan canonical W06-A2)
  const trustedActorId = context.actor_id;
  const trustedTenantId = context.tenant_id;
  const contextTraceId = context.context_trace_id;
  const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
  const workspaceId = context.workspace_id;

  // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN (sesuai temuan audit W06-A2)
  if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
    // Gunakan canonical safeRecordEvidence untuk audit durability (fix temuan audit)
    await safeRecordEvidence({
      workspace_id: workspaceId || "unknown",
      capability: "value-metering",
      command: "value-metering.cost-attribution.execute",
      work_id: input.workId || "unknown",
      tenant_id: trustedTenantId || "unknown",
      actor_id: trustedActorId || "unknown",
      timestamp: new Date().toISOString(),
      sessionId: sessionId || "unknown",
      decision_id: "W06-A2-AUDIT-DENY-001"
    });
    throw new Error("unauthorized: Missing authenticated context");
  }

  // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT (reuse existing identity capability - Rule of Two compliance)
  const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
  const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
  const activeSession = await sessionRepository.byId(sessionId);
  if (!activeSession) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.cost-attribution.execute",
      work_id: input.workId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-002"
    });
    throw new Error("unauthorized: No active valid session");
  }

  // 4. VERIFIKASI BINDING SESSION (session yang dipakai milik actor & tenant yang terpercaya - anti session substitution)
  if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.cost-attribution.execute",
      work_id: input.workId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-003"
    });
    throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
  }

  // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap - check session status tepat sebelum eksekusi)
  // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
  const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
  if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.cost-attribution.execute",
      work_id: input.workId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-004"
    });
    throw new Error("unauthorized: Session revoked or expired");
  }

  // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
  const requiredPermissions = ["value-metering:execute", "cost:attribute"];
  const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
  
  if (!hasAllPermissions) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.cost-attribution.execute",
      work_id: input.workId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-VM-006"
    });
    throw new Error("unauthorized: Insufficient permissions to execute cost attribution");
  }

  // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
  await safeRecordEvidence({
    workspace_id: workspaceId,
    capability: "value-metering",
    command: "value-metering.cost-attribution.execute",
    work_id: input.workId,
    tenant_id: trustedTenantId,
    actor_id: trustedActorId,
    timestamp: new Date().toISOString(),
    sessionId: sessionId,
    decision_id: "W06-A2-AUDIT-ALLOW-VM-001"
  });

  console.log(`[AUDIT][ALLOW][value-metering.cost-attribution.execute] correlation_id=${contextTraceId} - Atribusi biaya berhasil untuk work: ${input.workId}`);
  return { success: true, workId: input.workId, amount: input.amount, attributed: true, tenantId: trustedTenantId };
};

const executeUsageMetering = async (input: any, context: ExecutionContext) => {
  // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT (boundary keamanan canonical W06-A2)
  const trustedActorId = context.actor_id;
  const trustedTenantId = context.tenant_id;
  const contextTraceId = context.context_trace_id;
  const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
  const workspaceId = context.workspace_id;

  // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN (sesuai temuan audit W06-A2)
  if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
    // Gunakan canonical safeRecordEvidence untuk audit durability (fix temuan audit)
    await safeRecordEvidence({
      workspace_id: workspaceId || "unknown",
      capability: "value-metering",
      command: "value-metering.usage-metering.execute",
      work_id: input.resourceId || "unknown",
      tenant_id: trustedTenantId || "unknown",
      actor_id: trustedActorId || "unknown",
      timestamp: new Date().toISOString(),
      sessionId: sessionId || "unknown",
      decision_id: "W06-A2-AUDIT-DENY-005"
    });
    throw new Error("unauthorized: Missing authenticated context");
  }

  // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT (reuse existing identity capability - Rule of Two compliance)
  const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
  const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
  const activeSession = await sessionRepository.byId(sessionId);
  if (!activeSession) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.usage-metering.execute",
      work_id: input.resourceId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-006"
    });
    throw new Error("unauthorized: No active valid session");
  }

  // 4. VERIFIKASI BINDING SESSION (session yang dipakai milik actor & tenant yang terpercaya - anti session substitution)
  if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.usage-metering.execute",
      work_id: input.resourceId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-007"
    });
    throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
  }

  // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap - check session status tepat sebelum eksekusi)
  // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
  const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
  if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.usage-metering.execute",
      work_id: input.resourceId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-008"
    });
    throw new Error("unauthorized: Session revoked or expired");
  }

  // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
  const requiredPermissions = ["value-metering:execute", "usage:meter"];
  const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
  
  if (!hasAllPermissions) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.usage-metering.execute",
      work_id: input.resourceId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-VM-007"
    });
    throw new Error("unauthorized: Insufficient permissions to execute usage metering");
  }

  // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
  await safeRecordEvidence({
    workspace_id: workspaceId,
    capability: "value-metering",
    command: "value-metering.usage-metering.execute",
    work_id: input.resourceId,
    tenant_id: trustedTenantId,
    actor_id: trustedActorId,
    timestamp: new Date().toISOString(),
    sessionId: sessionId,
    decision_id: "W06-A2-AUDIT-ALLOW-VM-002"
  });

  console.log(`[AUDIT][ALLOW][value-metering.usage-metering.execute] correlation_id=${contextTraceId} - Penggunaan resource tercatat: ${input.resourceId}`);
  return { success: true, resourceId: input.resourceId, usage: input.usage, metered: true, tenantId: trustedTenantId };
};

const executeLegalServiceMetering = async (input: any, context: ExecutionContext) => {
  // 1. EKSTRAKSI IDENTITAS TERPERCAYA DARI EXECUTIONCONTEXT (boundary keamanan canonical W06-A2)
  const trustedActorId = context.actor_id;
  const trustedTenantId = context.tenant_id;
  const contextTraceId = context.context_trace_id;
  const sessionId = context.session_id; // Ekstrak sessionId dari trusted context, bukan input!
  const workspaceId = context.workspace_id;

  // 2. VALIDASI AWAL SEMUA PRASYARAT OTORISASI - SEBELUM MENGAKSES DATA APAPUN (sesuai temuan audit W06-A2)
  if (!trustedActorId || !trustedTenantId || !sessionId || !workspaceId) {
    // Gunakan canonical safeRecordEvidence untuk audit durability (fix temuan audit)
    await safeRecordEvidence({
      workspace_id: workspaceId || "unknown",
      capability: "value-metering",
      command: "value-metering.legal-service-metering.execute",
      work_id: input.caseId || "unknown",
      tenant_id: trustedTenantId || "unknown",
      actor_id: trustedActorId || "unknown",
      timestamp: new Date().toISOString(),
      sessionId: sessionId || "unknown",
      decision_id: "W06-A2-AUDIT-DENY-012"
    });
    throw new Error("unauthorized: Missing authenticated context");
  }

  // 3. VERIFIKASI SESSION AKTIF & TIDAK DICABUT (reuse existing identity capability - Rule of Two compliance)
  const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
  const sessionRepository = process.env.NODE_ENV === 'test' ? SessionRepositoryInMemory : await getSessionRepositoryPostgres();
  const activeSession = await sessionRepository.byId(sessionId);
  if (!activeSession) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.legal-service-metering.execute",
      work_id: input.caseId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-013"
    });
    throw new Error("unauthorized: No active valid session");
  }

  // 4. VERIFIKASI BINDING SESSION (session yang dipakai milik actor & tenant yang terpercaya - anti session substitution)
  if (activeSession.actorId !== trustedActorId || activeSession.tenantId !== trustedTenantId) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.legal-service-metering.execute",
      work_id: input.caseId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-014"
    });
    throw new Error("unauthorized: Session binding mismatch - possible session substitution attack");
  }

  // 5. VERIFIKASI REVOCATION & EXPIRY (anti TOCTOU gap - check session status tepat sebelum eksekusi)
  // Pastikan expiresAt adalah Date object untuk menangani cloning yang merusak tipe (fix activeSession.expiresAt.getTime is not a function)
  const expiresAt = activeSession.expiresAt instanceof Date ? activeSession.expiresAt : new Date(activeSession.expiresAt);
  if (activeSession.revokedAt !== null || (activeSession.expiresAt !== null && expiresAt.getTime() < Date.now())) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.legal-service-metering.execute",
      work_id: input.caseId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-015"
    });
    throw new Error("unauthorized: Session revoked or expired");
  }

  // 6. VERIFIKASI PERMISSION TAMBAHAN (requiredAuthorizations) - hanya allow jika session memiliki permission yang diperlukan
  const requiredPermissions = ["value-metering:execute", "legal:service-meter"];
  const hasAllPermissions = requiredPermissions.every(perm => context.permissions?.includes(perm));
  
  if (!hasAllPermissions) {
    await safeRecordEvidence({
      workspace_id: workspaceId,
      capability: "value-metering",
      command: "value-metering.legal-service-metering.execute",
      work_id: input.caseId,
      tenant_id: trustedTenantId,
      actor_id: trustedActorId,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      decision_id: "W06-A2-AUDIT-DENY-VM-008"
    });
    throw new Error("unauthorized: Insufficient permissions to execute legal service metering");
  }

  // 7. CATAT EVIDENCE ALLOW (audit durability compliant)
  await safeRecordEvidence({
    workspace_id: workspaceId,
    capability: "value-metering",
    command: "value-metering.legal-service-metering.execute",
    work_id: input.caseId,
    tenant_id: trustedTenantId,
    actor_id: trustedActorId,
    timestamp: new Date().toISOString(),
    sessionId: sessionId,
    decision_id: "W06-A2-AUDIT-ALLOW-004"
  });

  console.log(`[AUDIT][ALLOW][value-metering.legal-service-metering.execute] correlation_id=${contextTraceId} - Eksekusi dimulai untuk kasus hukum: ${input.caseId}`);
  // Implementasi minimal sesuai binding.yaml: mengukur biaya layanan hukum
  return {
    success: true,
    caseId: input.caseId,
    serviceCosts: input.amount,
    tenantId: trustedTenantId, // Gunakan trustedTenantId dari context, bukan input
    timestamp: new Date().toISOString(),
    evidenceId: `vm-legal-${Date.now()}`
  };
};

// Daftar semua command value-metering
export const valueMeteringCommands: Record<string, CapabilityCommand> = {
  costAttributionExecute: {
    name: "cost-attribution.execute",
    capability: "value-metering",
    description: "Execute cost attribution untuk mengalokasikan biaya ke Work dan organisasi yang bertanggung jawab",
    execute: executeCostAttribution,
    requiredAuthorizations: ["value-metering:execute", "tenant:value-metering_enabled"],
    riskLevel: "low",
    inputSchema: {
      workId: "string",
      amount: "number",
      tenantId: "string",
      workspaceId: "string",
      actorId: "string"
    }
  },
  usageMeteringExecute: {
    name: "usage-metering.execute",
    capability: "value-metering",
    description: "Execute usage metering untuk mengukur konsumsi resource layanan",
    execute: executeUsageMetering,
    requiredAuthorizations: ["value-metering:execute", "tenant:value-metering_enabled"],
    riskLevel: "low",
    inputSchema: {
      resourceId: "string",
      usage: "number",
      tenantId: "string",
      workspaceId: "string",
      actorId: "string"
    }
  },
  legalServiceMeteringExecute: {
    name: "legal-service-metering.execute",
    capability: "value-metering",
    description: "Execute legal service metering untuk mengukur dan mengatribusikan biaya layanan hukum",
    execute: executeLegalServiceMetering,
    requiredAuthorizations: ["value-metering:execute", "tenant:value-metering_enabled"],
    riskLevel: "low",
    inputSchema: {
      caseId: "string",
      amount: "number",
      tenantId: "string",
      workspaceId: "string",
      actorId: "string"
    }
  }
};

// Fungsi registrasi canonical sesuai pola semua kapabilitas EOS
export function registerValueMeteringCapability() {
  if (capabilityRegistry) {
    Object.values(valueMeteringCommands).forEach((command) => {
      capabilityRegistry.register(command);
      console.log(`[Value-Metering] ✅ Registered command: ${command.name}`);
    });
    console.log("[Value-Metering] 🚀 Value Metering commands fully registered");
  } else {
    console.error("[Value-Metering] ❌ capabilityRegistry not available, cannot register commands");
    throw new Error("capabilityRegistry not initialized");
  }
}