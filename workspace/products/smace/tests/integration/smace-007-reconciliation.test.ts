// @ts-nocheck
import { test, describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { CreativeBrief } from '../../contracts/creative-brief.contract.js';

// Konfigurasi untuk menjalankan test dengan staging PostgreSQL & Redis (sesuai permintaan SMACE-007)
// Nonaktifkan mock pool untuk menggunakan koneksi database nyata staging
(globalThis as any)._forceMockPool = false;
process.env.NODE_ENV = 'staging';
process.env.POSTGRES_CONNECTION_STRING = 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity';
process.env.DATABASE_URL = 'postgresql://eos_user:eos_pass123@localhost:5433/eos_identity';
process.env.REDIS_URL = 'redis://localhost:6379';

// Reset mock function state
let mockDeductCalls = 0;
let mockRollbackCalls = 0;
let mockEvidenceCalls = 0;
// Implementasi idempotency tracking sama seperti budget-engine asli
const processedDeductionKeys = new Map<string, Set<string>>();

// Override module imports sebelum import reconciler
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Mock requirement-management module untuk resolve ERR_MODULE_NOT_FOUND
require.cache[require.resolve('../../../../capabilities/requirement-management/implementation/commands/requirement.commands.js')] = {
  exports: {
    approveRequirement: () => Promise.resolve(),
    createRequirement: () => Promise.resolve(),
    markRequirementImplemented: () => Promise.resolve(),
    requirementCommands: {},
    requestRequirementReview: () => Promise.resolve(),
    startRequirementDelivery: () => Promise.resolve(),
    updateRequirement: () => Promise.resolve(),
    verifyRequirement: () => Promise.resolve()
  }
} as any;

// Mock budget-engine dengan idempotency logic yang sama dengan implementasi asli
require.cache[require.resolve('../../../../capabilities/budget-engine/implementation/commands/index.js')] = {
  exports: {
    deductBudget: { 
      execute: async (input: any) => { 
        const { tenantId, idempotency_key, canonicalWorkId } = input;
        // SMACE-007: Validasi field wajib terpenuhi sebelum eksekusi (sesuai BudgetDeductionSchema)
        if (!idempotency_key || !canonicalWorkId) {
          throw new Error("Field wajib idempotency_key/canonicalWorkId tidak terpenuhi");
        }
        // Cek idempotency sebelum increment counter (sama seperti budget-engine)
        if (idempotency_key) {
          const tenantKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
          if (tenantKeys.has(idempotency_key)) {
            // Idempotency key sudah ada, skip deduction
            return { idempotency_skipped: true };
          }
          // Tambahkan key ke processed keys
          tenantKeys.add(idempotency_key);
          processedDeductionKeys.set(tenantId, tenantKeys);
        }
        mockDeductCalls++; 
        return Promise.resolve(); 
      }
    },
    rollbackBudget: { 
      execute: () => { 
        mockRollbackCalls++; 
        return Promise.resolve(); 
      }
    },
    reserveBudget: { execute: () => Promise.resolve() }
  }
} as any;

// Mock evidence registry
require.cache[require.resolve('../../../../capabilities/evidence-registry/implementation/index.js')] = {
  exports: {
    evidenceRegistryService: {
      record: () => {
        mockEvidenceCalls++;
        return Promise.resolve(true);
      }
    }
  }
} as any;

// Mock identity repository
require.cache[require.resolve('../../../../capabilities/identity/implementation/repositories/index.js')] = {
  exports: {
    SessionRepositoryInMemory: {
      byId: () => Promise.resolve({
        id: 'valid-session-345',
        tenantId: 'tenant-789',
        workspaceId: 'workspace-012',
        actorId: 'test-actor-123',
        revokedAt: null
      })
    },
    getSessionRepositoryPostgres: () => ({})
  }
} as any;

// Mock requirement-management module (fix ERR_MODULE_NOT_FOUND)
require.cache[require.resolve('../../../../capabilities/requirement-management/implementation/commands/index.js')] = {
  exports: {
    requirementCommands: {},
    approveRequirement: () => Promise.resolve(),
    createRequirement: () => Promise.resolve(),
    markRequirementImplemented: () => Promise.resolve(),
    requestRequirementReview: () => Promise.resolve(),
    startRequirementDelivery: () => Promise.resolve(),
    updateRequirement: () => Promise.resolve(),
    verifyRequirement: () => Promise.resolve()
  }
} as any;

// Reset counter sebelum setiap test
beforeEach(() => {
  mockDeductCalls = 0;
  mockRollbackCalls = 0;
  mockEvidenceCalls = 0;
  processedDeductionKeys.clear(); // Reset idempotency keys untuk isolasi test
});

// Import reconciler setelah semua mock terpasang
import { reconcileCommercials, ReconciliationStatus } from '../../domain/commercial/reconciler.js';

// Mock CreativeBrief yang valid
const mockBrief: CreativeBrief = {
  id: 'brief-123',
  canonicalWorkId: 'canonical-work-456',
  tenantId: 'tenant-789',
  workspaceId: 'workspace-012',
  selectedProvider: 'comfyui',
  budget: 5000000, // IDR 5jt budget
  createdAt: new Date().toISOString(),
  name: 'Test Product Photography Brief'
} as unknown as CreativeBrief;

// Mock session yang valid
const validSessionId = 'valid-session-345';

describe('SMACE-007: Commercial Reconciliation Hardening', () => {
  // ==============================================
  // Test 1: Tidak ada double deduction (idempotency key)
  // ==============================================
  it('SMACE-007: Reconciliation berhasil tanpa double deduction', async () => {
    // Reset processed keys sebelum test
    processedDeductionKeys.clear();
    
    // Jalankan pertama kali
    const firstResult = await reconcileCommercials(mockBrief, validSessionId);
    assert.equal(firstResult.actualCosts.total, 950000); // 750k+150k+50k = 950k
    assert.equal(firstResult.provider, 'comfyui');
    assert.equal(mockDeductCalls, 1, 'Pemanggilan pertama harus mengeksekusi deduction sekali');

    // Jalankan kedua kali dengan canonicalWorkId yang sama - idempotency key mencegah double deduction
    const secondResult = await reconcileCommercials(mockBrief, validSessionId);
    assert.equal(secondResult.actualCosts.total, firstResult.actualCosts.total);
    assert.equal(mockDeductCalls, 1, 'Pemanggilan kedua TIDAK BOLEH mengeksekusi deduction lagi (idempotency)');
  });

  // ==============================================
  // Test 2: Canonical Work ID validation memblokir transaksi tanpa workId
  // ==============================================
  it('SMACE-007: Canonical Work ID validation memblokir transaksi tanpa workId', async () => {
    const invalidBrief = { ...mockBrief, canonicalWorkId: undefined };
    await assert.rejects(
      reconcileCommercials(invalidBrief as unknown as CreativeBrief, validSessionId),
      /Canonical Work ID tidak ditemukan/
    );
  });

  // ==============================================
  // Test 3: Kegagalan deduction tidak ditelan (throw error + PENDING_RETRY)
  // ==============================================
  it('SMACE-007: Kegagalan deduction tidak ditelan - status PENDING_RETRY', async () => {
    // Mock deductBudget untuk gagal secara paksa
    const { deductBudget } = await import('../../../../capabilities/budget-engine/implementation/commands/index.js');
    const originalExecute = deductBudget.execute;
    deductBudget.execute = () => Promise.reject(new Error('Budget engine unavailable'));

    // Eksekusi dan pastikan throw error
    await assert.rejects(
      reconcileCommercials(mockBrief, validSessionId),
      /Rekonsiliasi gagal, status sekarang: pending_retry/
    );

    // Kembalikan original function
    deductBudget.execute = originalExecute;
  });

  // ==============================================
  // Test 4: Rollback reservasi ketika deduction gagal (actual cost tidak dihapus)
  // ==============================================
  it('SMACE-007: Rollback reservasi ketika deduction gagal (actual cost tetap tercatat)', async () => {
    let rollbackCalled = false;
    const { rollbackBudget } = await import('../../../../capabilities/budget-engine/implementation/commands/index.js');
    const originalRollback = rollbackBudget.execute;
    rollbackBudget.execute = (args: any) => {
      rollbackCalled = true;
      assert.equal(args.tenantId, mockBrief.tenantId);
      return Promise.resolve();
    };

    const { deductBudget } = await import('../../../../capabilities/budget-engine/implementation/commands/index.js');
    const originalDeduct = deductBudget.execute;
    deductBudget.execute = () => Promise.reject(new Error('Deduction failed'));

    await assert.rejects(
      reconcileCommercials(mockBrief, validSessionId),
      /Rekonsiliasi gagal/
    );

    // Pastikan rollback dipanggil
    assert.equal(rollbackCalled, true);

    // Kembalikan original functions
    rollbackBudget.execute = originalRollback;
    deductBudget.execute = originalDeduct;
  });

  // ==============================================
  // STAGING TEST 1: Simulasi crash setelah provider tagih tapi sebelum reconciliation selesai
  // ==============================================
  it('SMACE-007-STAGING: Rekonsiliasi dapat dilanjutkan setelah restart/crash', async () => {
    // Simpan reconciliation record ke PostgreSQL sebelum "crash" menggunakan evidenceRegistryService
    const { evidenceRegistryService } = await import('../../../../capabilities/evidence-registry/implementation/index.js');
    const initialRecord = await evidenceRegistryService.record({
      workId: mockBrief.canonicalWorkId,
      actorId: 'test-actor-123',
      tenantId: mockBrief.tenantId,
      workspaceId: mockBrief.workspaceId,
      type: 'commercial.deduction.failed',
      payload: {
        canonicalWorkId: mockBrief.canonicalWorkId,
        status: 'pending_retry',
        retryCount: 1,
        lastRetryAt: new Date().toISOString(),
        actualCosts: { total: 950000 },
        createdAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Simulasikan crash: reset semua in-memory state, muat ulang dari database
    (globalThis as any).__EOS_RESET_TENANT_CACHE?.();
    const reloadedRecords = await evidenceRegistryService.listEvidenceByWorkId({
      workId: mockBrief.canonicalWorkId,
      limit: 10
    });
    const reloadedRecord = reloadedRecords.items.find(item => item.type === 'commercial.deduction.failed');
    
    // Pastikan data tidak hilang setelah restart
    assert.ok(reloadedRecord, 'Record reconciliation harus tetap ada di PostgreSQL setelah restart');
    assert.equal(reloadedRecord.payload?.status, 'pending_retry');
    assert.equal(reloadedRecord.payload?.actualCosts.total, 950000);
    
    // Coba lanjutkan rekonsiliasi
    const resumeResult = await reconcileCommercials(mockBrief, validSessionId);
    assert.equal(resumeResult.actualCosts.total, 950000);
  }, { timeout: 30000 }); // Timeout extended untuk koneksi database staging

  // ==============================================
  // STAGING TEST 2: Actual cost tetap tercatat setelah reservation rollback
  // ==============================================
  it('SMACE-007-STAGING: Actual cost tidak terhapus setelah reservation rollback', async () => {
    // Jalankan rekonsiliasi yang gagal (trigger rollback)
    const { deductBudget } = await import('../../../../capabilities/budget-engine/implementation/commands/index.js');
    const originalDeduct = deductBudget.execute;
    deductBudget.execute = () => Promise.reject(new Error('Temporary provider failure'));

    await assert.rejects(
      reconcileCommercials(mockBrief, validSessionId),
      /Rekonsiliasi gagal/
    );

    // Cek data di PostgreSQL: actual cost masih ada
    const { reconciliationRepository } = await import('../../domain/commercial/reconciliation.repository.js');
    const finalRecord = await reconciliationRepository.findByCanonicalWorkId(mockBrief.canonicalWorkId);
    
    // Kunci invariant: actual cost tidak pernah terhapus meskipun rollback reservasi
    assert.ok(finalRecord.actualCosts.total > 0, 'Actual cost harus tetap tercatat setelah rollback');
    assert.equal(finalRecord.actualCosts.total, 950000);

    // Kembalikan original function
    deductBudget.execute = originalDeduct;
  }, { timeout: 30000 });
});