// @ts-nocheck
import { z } from "zod";
import { executeBudgetOperation, getIsMultiInstance, acquireTenantLock, acquireRedisTenantLock, releaseTenantLock, releaseRedisTenantLock } from "../../../../packages/core/runtime/src/execution-observability.ts";
import type { CapabilityCommand } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
import { recordRuntimeInvocation } from "../../../../packages/core/runtime/src/index.js";
import { getSessionRepositoryPostgres, initIdentitySchema } from "../../../work-core/implementation/index.js";
import type { BudgetOperationResult } from "../contracts/index.ts";

// Import idempotency tracking dari execution-observability (reuse pattern recordWorkPayment)
const processedDeductionKeys = new Map<string, Set<string>>();
const IDEMPOTENCY_PREFIX = 'eos:tenant:idempotency:';
const LOCK_LEASE_TTL = 30000; // 30 detik lock lease sesuai execution-observability

// Lazy import capability registry untuk menghindari module cycle (SAMA PERSIS dengan evidence-registry)
async function getCapabilityRegistry() {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  return capabilityRegistry;
}

// Lazy initialize session repository - gunakan in-memory untuk test environment (sesuai pola identity capability)
let _sessionRepo: any = null;
async function getSessionRepositoryLazy() {
  if (!_sessionRepo) {
    const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../../../../capabilities/identity/implementation/repositories/index.js");
    const hasDbConnection = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
    const isTestEnvironment = process.env.NODE_ENV === 'test' || (globalThis as any)._forceMockPool === true;
    
    if (isTestEnvironment && !hasDbConnection) {
      console.log("[budget-engine] 🔧 Menggunakan IN-MEMORY session repository untuk TEST environment");
      _sessionRepo = SessionRepositoryInMemory;
    } else {
      console.log("[budget-engine] 🐘 Menggunakan POSTGRESQL session repository");
      _sessionRepo = getSessionRepositoryPostgres();
    }
  }
  return _sessionRepo;
}

// Schema validasi untuk budget reserve command (sesuai pola evidence-registry)
const BudgetReservationSchema = z.object({
  tenantId: z.string().min(1),
  amount: z.number().positive(),
  reservationId: z.string().min(1),
  maxMonthlyBudget: z.number().positive(),
  // Required context untuk tenant isolation (foundation rails EOS)
  sessionId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
});

// Schema validasi untuk budget deduct command
const BudgetDeductionSchema = z.object({
  tenantId: z.string().min(1),
  amount: z.number().positive(),
  reservationId: z.string().min(1),
  maxMonthlyBudget: z.number().positive(),
  // Required context
  sessionId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
  // Canonical Work ID adalah PRECONDITION untuk semua transaksi komersial (sesuai SMACE-007)
  canonicalWorkId: z.string().min(1),
  // Idempotency key opsional untuk menghindari double deduction (sesuai SMACE-007)
  idempotency_key: z.string().optional(),
});

// Schema validasi untuk budget rollback command
const BudgetRollbackSchema = z.object({
  tenantId: z.string().min(1),
  reservationId: z.string().min(1),
  // Required context
  sessionId: z.string().min(1),
  actorId: z.string().min(1),
  workspaceId: z.string().min(1),
});

type BudgetReservationInput = z.infer<typeof BudgetReservationSchema>;
type BudgetDeductionInput = z.infer<typeof BudgetDeductionSchema>;
type BudgetRollbackInput = z.infer<typeof BudgetRollbackSchema>;
type BudgetCommand<T> = CapabilityCommand<T, Promise<BudgetOperationResult>>;

// Implementasi command reserve (menahan budget sebelum eksekusi)
export const reserveBudget: BudgetCommand<BudgetReservationInput> = {
  kind: "command",
  name: "reserve",
  capability: "budget-engine",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    
    const parsed = BudgetReservationSchema.parse(input);
    const { sessionId, actorId, tenantId, workspaceId, amount, reservationId, maxMonthlyBudget } = parsed;

    // Validasi session sama seperti evidence-registry (enforce authentication EOS)
    const isAnonymous = actorId === "anonymous.user";
    
    if (!isAnonymous) {
      const sessionRepo = await getSessionRepositoryLazy();
      const session = await sessionRepo.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[budget-engine.reserve] Invalid or revoked session - authentication violation");
      }
      if (session.actorId !== actorId) {
        throw new Error("[budget-engine.reserve] Session actor mismatch - authentication violation");
      }
      if (session.tenantId !== tenantId) {
        throw new Error("[budget-engine.reserve] Cross-tenant access attempt blocked - security violation");
      }
      if (session.workspaceId !== workspaceId) {
        throw new Error("[budget-engine.reserve] Cross-workspace access attempt blocked - security violation");
      }
    }

    // Eksekusi operasi budget atomic
    const result = await executeBudgetOperation(
      tenantId,
      "reserve",
      amount,
      reservationId,
      maxMonthlyBudget
    );

    // Record runtime invocation untuk observability EOS
    recordRuntimeInvocation({
      capabilityId: "budget-engine",
      operationId: "reserve-budget",
      sourceRef: "BudgetEngineService.reserveBudget",
      success: result.success,
      input: { amount, reservationId },
      result: {
        reserved: result.success,
        current_spent: result.current_spent,
        total_reserved: result.total_reserved
      },
    });

    return {
      success: result.success,
      remainingBudget: maxMonthlyBudget - result.current_spent - result.total_reserved,
      currentUsage: result.current_spent,
      reservationId: result.reservation_id,
      error: result.reason
    } as BudgetOperationResult;
  },
};

// Implementasi command deduct (mengurangi budget setelah eksekusi berhasil)
export const deductBudget: BudgetCommand<BudgetDeductionInput> = {
  kind: "command",
  name: "deduct",
  capability: "budget-engine",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    
    const parsed = BudgetDeductionSchema.parse(input);
    const { sessionId, actorId, tenantId, workspaceId, amount, reservationId, maxMonthlyBudget, idempotency_key, canonicalWorkId } = parsed;

    // --- AUDIT SMACE-007: Precondition validation canonicalWorkId (harus ada untuk semua transaksi komersial)
    if (!canonicalWorkId || typeof canonicalWorkId !== "string" || canonicalWorkId.trim() === "") {
      throw new Error("[budget-engine.deduct] Canonical Work ID is required for commercial transactions - missing or invalid canonicalWorkId");
    }

    // Pre-lock idempotency check (single-instance only) - sesuai pattern recordWorkPayment dari execution-observability
    if (idempotency_key) {
      const tenantProcessedKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
      if (tenantProcessedKeys.has(idempotency_key)) {
        // Idempotency key sudah diproses, kembalikan actual current values (bukan 0) untuk konsistensi
        // Eksekusi atomic get untuk mendapatkan state budget terkini (tidak perlu commit ulang)
        const currentState = await executeBudgetOperation(
          tenantId,
          "get-state",
          0,
          reservationId,
          maxMonthlyBudget
        );
        
        return {
          success: true,
          remainingBudget: maxMonthlyBudget - currentState.current_spent - currentState.total_reserved,
          currentUsage: currentState.current_spent,
          reservationId: reservationId,
          error: null,
          idempotency_skipped: true
        } as BudgetOperationResult;
      }
    }

    // Dual-mode lock acquisition (sesuai execution-observability.ts)
    const IS_MULTI_INSTANCE = getIsMultiInstance();
    let lockValue: string | false = false;

    try {
      // Akuisisi lock tergantung mode instance
      if (!IS_MULTI_INSTANCE) {
        await acquireTenantLock(tenantId);
      } else {
        lockValue = await acquireRedisTenantLock(tenantId, LOCK_LEASE_TTL);
        if (!lockValue) {
          throw new Error("[budget-engine.deduct] Failed to acquire Redis tenant lock - fail-closed");
        }
      }

      // Post-lock atomic idempotency verification
      if (idempotency_key) {
        if (!IS_MULTI_INSTANCE) {
          // Single-instance: cek ulang in-memory set
          const tenantProcessedKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
          if (tenantProcessedKeys.has(idempotency_key)) {
            // Dapatkan state aktual bukan 0
            const currentState = await executeBudgetOperation(
              tenantId,
              "get-state",
              0,
              reservationId,
              maxMonthlyBudget
            );
            return {
              success: true,
              remainingBudget: maxMonthlyBudget - currentState.current_spent - currentState.total_reserved,
              currentUsage: currentState.current_spent,
              reservationId: reservationId,
              error: null,
              idempotency_skipped: true
            } as BudgetOperationResult;
          }
        } else {
          // Multi-instance: Redis SISMEMBER check (full implementasi sesuai recordWorkPayment)
          // Gunakan redis client dari execution-observability dengan prefix yang konsisten
          const { redis, IDEMPOTENCY_PREFIX } = await import("../../../../packages/core/runtime/src/execution-observability.ts");
          const idempotencyRedisKey = `${IDEMPOTENCY_PREFIX}${tenantId}:deductions`;
          const exists = await redis.sismember(idempotencyRedisKey, idempotency_key);
          if (exists === 1) {
            const currentState = await executeBudgetOperation(
              tenantId,
              "get-state",
              0,
              reservationId,
              maxMonthlyBudget
            );
            return {
              success: true,
              remainingBudget: maxMonthlyBudget - currentState.current_spent - currentState.total_reserved,
              currentUsage: currentState.current_spent,
              reservationId: reservationId,
              error: null,
              idempotency_skipped: true
            } as BudgetOperationResult;
          }
        }
      }

      // Validasi session yang sama (setelah lock acquisition untuk keamanan)
      const isAnonymous = actorId === "anonymous.user";
      
      if (!isAnonymous) {
        const sessionRepo = await getSessionRepositoryLazy();
        const session = await sessionRepo.byId(sessionId as any);
        if (!session || session.revokedAt !== null) {
          throw new Error("[budget-engine.deduct] Invalid or revoked session - authentication violation");
        }
        if (session.actorId !== actorId) {
          throw new Error("[budget-engine.deduct] Session actor mismatch - authentication violation");
        }
        if (session.tenantId !== tenantId) {
          throw new Error("[budget-engine.deduct] Cross-tenant access attempt blocked - security violation");
        }
        if (session.workspaceId !== workspaceId) {
          throw new Error("[budget-engine.deduct] Cross-workspace access attempt blocked - security violation");
        }
      }

      // Eksekusi operasi commit (deduct)
      const result = await executeBudgetOperation(
        tenantId,
        "commit",
        amount,
        reservationId,
        maxMonthlyBudget
      );

      // Simpan idempotency key setelah berhasil eksekusi
      if (idempotency_key && result.success) {
        if (!IS_MULTI_INSTANCE) {
          // Single-instance: update in-memory set
          const tenantProcessedKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
          tenantProcessedKeys.add(idempotency_key);
          processedDeductionKeys.set(tenantId, tenantProcessedKeys);
        } else {
          // Multi-instance: Redis SADD dengan TTL 30 hari (sesuai recordWorkPayment)
          const { redis, IDEMPOTENCY_PREFIX } = await import("../../../../packages/core/runtime/src/execution-observability.ts");
          const idempotencyRedisKey = `${IDEMPOTENCY_PREFIX}${tenantId}:deductions`;
          await redis.sadd(idempotencyRedisKey, idempotency_key);
          // Set expiry 30 hari untuk membersihkan idempotency keys lama
          await redis.expire(idempotencyRedisKey, 60 * 60 * 24 * 30);
          
          // Tetap simpan di in-memory untuk akses cepat single-instance
          const tenantProcessedKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
          tenantProcessedKeys.add(idempotency_key);
          processedDeductionKeys.set(tenantId, tenantProcessedKeys);
        }
      }

      // Record runtime invocation
      recordRuntimeInvocation({
        capabilityId: "budget-engine",
        operationId: "deduct-budget",
        sourceRef: "BudgetEngineService.deductBudget",
        success: result.success,
        input: { amount, reservationId, idempotency_key },
        result: {
          deducted: result.success,
          current_spent: result.current_spent,
          total_reserved: result.total_reserved
        },
      });

      return {
        success: result.success,
        remainingBudget: maxMonthlyBudget - result.current_spent - result.total_reserved,
        currentUsage: result.current_spent,
        reservationId: result.reservation_id,
        error: result.reason
      } as BudgetOperationResult;
    } finally {
      // Release lock dalam blok finally untuk menjamin selalu dilepas
      if (!IS_MULTI_INSTANCE) {
        releaseTenantLock(tenantId);
      } else if (lockValue) {
        await releaseRedisTenantLock(tenantId, lockValue);
      }
    }
  },
};

// Implementasi command rollback (membatalkan reservasi jika eksekusi gagal)
export const rollbackBudget: BudgetCommand<BudgetRollbackInput> = {
  kind: "command",
  name: "rollback",
  capability: "budget-engine",
  version: "1.0.0",
  async execute(input) {
    await initIdentitySchema();
    
    const parsed = BudgetRollbackSchema.parse(input);
    const { sessionId, actorId, tenantId, workspaceId, reservationId } = parsed;

    // Validasi session yang sama
    const isAnonymous = actorId === "anonymous.user";
    
    if (!isAnonymous) {
      const sessionRepo = await getSessionRepositoryLazy();
      const session = await sessionRepo.byId(sessionId as any);
      if (!session || session.revokedAt !== null) {
        throw new Error("[budget-engine.rollback] Invalid or revoked session - authentication violation");
      }
      if (session.actorId !== actorId) {
        throw new Error("[budget-engine.rollback] Session actor mismatch - authentication violation");
      }
      if (session.tenantId !== tenantId) {
        throw new Error("[budget-engine.rollback] Cross-tenant access attempt blocked - security violation");
      }
      if (session.workspaceId !== workspaceId) {
        throw new Error("[budget-engine.rollback] Cross-workspace access attempt blocked - security violation");
      }
    }

    // Eksekusi operasi rollback (amount dan maxMonthlyBudget tidak relevan untuk rollback)
    const result = await executeBudgetOperation(
      tenantId,
      "rollback",
      0,
      reservationId,
      0
    );

    // Record runtime invocation
    recordRuntimeInvocation({
      capabilityId: "budget-engine",
      operationId: "rollback-budget",
      sourceRef: "BudgetEngineService.rollbackBudget",
      success: result.success,
      input: { reservationId },
      result: {
        rolledback: result.success,
        current_spent: result.current_spent,
        total_reserved: result.total_reserved
      },
    });

    return {
      success: result.success,
      remainingBudget: 0,
      currentUsage: result.current_spent,
      error: result.reason
    } as BudgetOperationResult;
  },
};

// Export commands object untuk registrasi ke capability registry (format sama persis seperti evidence-registry)
export const budgetEngineCommands = {
  "reserve": reserveBudget,
  "deduct": deductBudget,
  "rollback": rollbackBudget,
};

// Definisikan budgetCommands untuk kompatibilitas dengan registerBudgetCoreCapability
export const budgetCommands: Readonly<Record<string, CapabilityCommand<any, any>>> = {
  "budget-engine.reserve": reserveBudget,
  "budget-engine.deduct": deductBudget,
  "budget-engine.rollback": rollbackBudget,
} as const;

// Register budget-engine core commands dengan capability registry (ASYNC untuk menghindari module cycle)
export async function registerBudgetCoreCapability() {
  console.log("[Budget-Core] AUDIT-BUDGET-001: Budget Engine capability registration dimulai");
  console.log("[Budget-Core] budgetCommands keys saat registrasi:", Object.keys(budgetCommands));
  
  const capabilityRegistry = await getCapabilityRegistry();
  Object.values(budgetCommands).forEach((command) => {
    console.log("[Budget-Core] Mendaftarkan command:", command.name);
    capabilityRegistry.register(command);
  });
  
  const registeredCommands = await capabilityRegistry.listCommandKeys();
  console.log("[Budget-Core] Command yang terdaftar setelah registrasi:", registeredCommands);
  console.log("[Budget-Core] AUDIT-BUDGET-001: Budget Engine capability registered successfully");
}

// Panggil registrasi segera setelah modul diimpor, hanya jika bukan di test environment
if (typeof process.env.VITEST === 'undefined') {
  registerBudgetCoreCapability();
}

// Registrasi commands saat capability diinisialisasi (gunakan getCapabilityRegistry yang sudah ada untuk menghindari duplikasi)
if (process.env.NODE_ENV !== 'test' && process.env.EOS_STANDALONE !== 'true') {
  getCapabilityRegistry().then(async (registry) => {
    // Daftarkan semua command dari budgetEngineCommands (format registry.register(command) sesuai capability modern)
            for (const command of Object.values(budgetEngineCommands)) {
              await registry.register(command);
            }
    console.log("[budget-engine] All budget commands registered successfully");
  }).catch(err => {
    console.error("[budget-engine] Failed to register budget commands:", err);
  });
}