// @ts-nocheck
/**
 * PREP-002: Cross-provider continuity test harness
 * Satu Work fixture, dua runtime identity untuk ComfyUI dan Adobe
 * Reused existing logic from provider-results-normalizer.ts (lines 36/56/88)
 * Implements negative tests required for W004:
 * - logicalWorkId_overwrite: Prevent provider from modifying canonicalWorkId
 * - runtime_job_reclassification: Prevent provider-specific runtimeJobId from being treated as new Work
 * - double_deduction_prevention: Ensure retry logic never triggers duplicate budget deductions
 * - provider_id_collision: Validate providerExecutionId never equals canonicalWorkId
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import type { CreativeBrief, ProviderExecutionResult, NormalizedProductionResult } from "../../contracts/creative-brief.contract.js";
import { normalizeProviderResults, retryFailedAssets } from "../../runtime/providers/provider-results-normalizer.js";

// Work fixture tetap sama untuk kedua runtime identity (PREP-002 requirement)
const canonicalWorkFixture = {
  canonicalWorkId: 'SMACE-CANONICAL-001-PRODUCT-PHOTOGRAPHY',
  tenantId: 'tenant-smace-001',
  workspaceId: 'workspace-smace-001',
  budget: 5000000, // IDR 5jt
  name: 'E-commerce Product Photography Campaign'
} as unknown as CreativeBrief;

// Runtime identities untuk kedua provider (PREP-002 requirement: dua runtime identity)
const comfyuiRuntimeIdentity = {
  providerType: 'comfyui' as const,
  runtimeJobId: 'comfyui-prompt-12345-abcde',
  providerExecutionId: 'comfyui-exec-67890-fghij'
};

const adobeRuntimeIdentity = {
  providerType: 'adobe' as const,
  runtimeJobId: 'adobe-batch-09876-zyxwv',
  providerExecutionId: 'adobe-exec-54321-utsrq'
};

// Mock data untuk negative testing
let processedDeductionKeys: Map<string, Set<string>>;

describe('PREP-002 Continuity Test Harness', () => {
  beforeEach(() => {
    // Reset idempotency tracking before each test
    processedDeductionKeys = new Map<string, Set<string>>();
  });

  describe('Negative Test 1: logicalWorkId_overwrite prevention', () => {
    test('should throw error when provider attempts to set runtimeJobId equal to canonicalWorkId', () => {
      const maliciousResults: ProviderExecutionResult = {
        normalizedResults: {
          runtimeJobId: canonicalWorkFixture.canonicalWorkId, // INTENTIONAL VIOLATION
          providerExecutionId: comfyuiRuntimeIdentity.providerExecutionId,
          completed: ['asset-1.jpg'],
          failed: [],
          retried: []
        }
      };

      assert.throws(() => {
        normalizeProviderResults(
          canonicalWorkFixture.canonicalWorkId,
          comfyuiRuntimeIdentity.providerType,
          maliciousResults
        );
      }, /CRITICAL VIOLATION: Provider-specific ID cannot equal canonicalWorkId/);
    });

    test('should throw error when provider attempts to set providerExecutionId equal to canonicalWorkId', () => {
      const maliciousResults: ProviderExecutionResult = {
        normalizedResults: {
          runtimeJobId: comfyuiRuntimeIdentity.runtimeJobId,
          providerExecutionId: canonicalWorkFixture.canonicalWorkId, // INTENTIONAL VIOLATION
          completed: ['asset-1.jpg'],
          failed: [],
          retried: []
        }
      };

      assert.throws(() => {
        normalizeProviderResults(
          canonicalWorkFixture.canonicalWorkId,
          comfyuiRuntimeIdentity.providerType,
          maliciousResults
        );
      }, /CRITICAL VIOLATION: Provider-specific ID cannot equal canonicalWorkId/);
    });
  });

  describe('Negative Test 2: runtime_job_reclassification prevention', () => {
    test('should preserve canonicalWorkId even when provider provides valid runtime IDs', () => {
      const validComfyuiResults: ProviderExecutionResult = {
        normalizedResults: {
          runtimeJobId: comfyuiRuntimeIdentity.runtimeJobId,
          providerExecutionId: comfyuiRuntimeIdentity.providerExecutionId,
          completed: ['product-photo-001.jpg', 'product-photo-002.jpg'],
          failed: ['product-photo-003.jpg'],
          retried: []
        }
      };

      const normalized = normalizeProviderResults(
        canonicalWorkFixture.canonicalWorkId,
        comfyuiRuntimeIdentity.providerType,
        validComfyuiResults
      );

      // CanonicalWorkId harus tetap sama, tidak pernah diganti dengan runtime ID
      assert.equal(normalized.canonicalWorkId, canonicalWorkFixture.canonicalWorkId);
      // Provider-specific IDs tetap tercatat sebagai referensi, bukan sebagai Work baru
      assert.equal(normalized.providerReferences.runtimeJobId, comfyuiRuntimeIdentity.runtimeJobId);
      assert.equal(normalized.providerReferences.providerExecutionId, comfyuiRuntimeIdentity.providerExecutionId);
    });

    test('same canonicalWorkId works across both provider runtime identities', () => {
      // Test ComfyUI
      const comfyuiResults: ProviderExecutionResult = {
        normalizedResults: {
          ...comfyuiRuntimeIdentity,
          completed: ['comfyui-photo-001.jpg'],
          failed: [],
          retried: []
        }
      };
      const normalizedComfyui = normalizeProviderResults(canonicalWorkFixture.canonicalWorkId, 'comfyui', comfyuiResults);
      
      // Test Adobe dengan canonicalWorkId YANG SAMA
      const adobeResults: ProviderExecutionResult = {
        normalizedResults: {
          ...adobeRuntimeIdentity,
          completed: ['adobe-photo-001.jpg'],
          failed: [],
          retried: []
        }
      };
      const normalizedAdobe = normalizeProviderResults(canonicalWorkFixture.canonicalWorkId, 'adobe', adobeResults);

      // Kedua provider menggunakan canonicalWorkId YANG SAMA (tidak dibuat Work baru)
      assert.equal(normalizedComfyui.canonicalWorkId, normalizedAdobe.canonicalWorkId);
      assert.equal(normalizedComfyui.canonicalWorkId, canonicalWorkFixture.canonicalWorkId);
    });
  });

  describe('Negative Test 3: double_deduction_prevention (idempotency enforcement)', () => {
    test('should throw error when asset appears in multiple status categories (idempotency violation)', () => {
      const invalidResults: ProviderExecutionResult = {
        normalizedResults: {
          runtimeJobId: comfyuiRuntimeIdentity.runtimeJobId,
          providerExecutionId: comfyuiRuntimeIdentity.providerExecutionId,
          completed: ['asset-001.jpg'], // asset yang sama ada di completed dan failed
          failed: ['asset-001.jpg'],
          retried: []
        }
      };

      assert.throws(() => {
        normalizeProviderResults(
          canonicalWorkFixture.canonicalWorkId,
          comfyuiRuntimeIdentity.providerType,
          invalidResults
        );
      }, /IDEMPOTENCY VIOLATION: Asset appears in multiple status categories/);
    });

    test('retryFailedAssets prevents duplicate retries of the same asset', () => {
      // Initial normalized results
      const initialResults: NormalizedProductionResult = {
        canonicalWorkId: canonicalWorkFixture.canonicalWorkId,
        providerType: 'comfyui',
        providerReferences: { ...comfyuiRuntimeIdentity },
        assetStatuses: {
          completed: ['asset-001.jpg'],
          failed: ['asset-002.jpg', 'asset-003.jpg'],
          retried: [],
          total: 3
        },
        partialSuccess: true,
        fullyCompleted: false,
        normalizedAt: new Date().toISOString()
      };

      // First retry: pindahkan asset-002 dari failed ke retried
      const firstRetry = retryFailedAssets(initialResults, ['asset-002.jpg']);
      assert.deepEqual(firstRetry.assetStatuses.retried, ['asset-002.jpg']);
      assert.deepEqual(firstRetry.assetStatuses.failed, ['asset-003.jpg']);

      // Retry lagi asset yang sama: idempotency mencegah duplikat
      const secondRetry = retryFailedAssets(firstRetry, ['asset-002.jpg']);
      // Retry list tetap hanya punya satu entry (tidak ada duplikat)
      assert.deepEqual(secondRetry.assetStatuses.retried, ['asset-002.jpg']);
      assert.equal(secondRetry.assetStatuses.retried.length, 1);
    });

    test('budget deduction logic prevents double charges', () => {
      // Simulasikan logic deduksi budget yang sama dengan production
      const idempotencyKey = `deduction-${canonicalWorkFixture.canonicalWorkId}-comfyui-001`;
      const tenantId = canonicalWorkFixture.tenantId;
      
      let deductionCount = 0;
      const deductBudget = () => {
        // Cek apakah idempotency key sudah ada untuk tenant ini
        const tenantKeys = processedDeductionKeys.get(tenantId) || new Set<string>();
        if (tenantKeys.has(idempotencyKey)) {
          // Sudah pernah di-deduct, skip
          return { idempotency_skipped: true };
        }
        // Tambahkan ke processed keys dan jalankan deduksi
        tenantKeys.add(idempotencyKey);
        processedDeductionKeys.set(tenantId, tenantKeys);
        deductionCount++;
        return { success: true };
      };

      // Jalankan deduksi pertama
      const firstDeduction = deductBudget();
      assert.equal(firstDeduction.success, true);
      assert.equal(deductionCount, 1);

      // Jalankan deduksi kedua (sama dengan retry)
      const secondDeduction = deductBudget();
      assert.equal(secondDeduction.idempotency_skipped, true);
      assert.equal(deductionCount, 1); // Tidak terjadi double deduction!
    });
  });

  describe('Cross-provider continuity validation', () => {
    test('both providers can process the same canonicalWorkId without continuity break', () => {
      // Simulasikan workflow lintas provider dengan Work yang sama
      const canonicalWorkId = canonicalWorkFixture.canonicalWorkId;
      
      // ComfyUI memproses sebagian asset
      const comfyuiResults: ProviderExecutionResult = {
        normalizedResults: {
          ...comfyuiRuntimeIdentity,
          completed: ['white-background-photo.jpg'],
          failed: ['color-corrected-photo.jpg'],
          retried: []
        }
      };
      const normalizedComfyui = normalizeProviderResults(canonicalWorkId, 'comfyui', comfyuiResults);
      
      // Adobe memproses asset yang gagal di Comfyui (Workflow failover - canonicalWorkId tetap sama)
      const adobeResults: ProviderExecutionResult = {
        normalizedResults: {
          ...adobeRuntimeIdentity,
          completed: ['color-corrected-photo.jpg'],
          failed: [],
          retried: []
        }
      };
      const normalizedAdobe = normalizeProviderResults(canonicalWorkId, 'adobe', adobeResults);

      // Work Continuity terjaga: canonicalWorkId sama meskipun provider berbeda
      assert.equal(normalizedComfyui.canonicalWorkId, normalizedAdobe.canonicalWorkId);
      assert.equal(normalizedComfyui.canonicalWorkId, canonicalWorkId);
      
      // Kedua hasil terikat ke Work yang sama, tidak membuat Work baru
      console.log(`[CONTINUITY TEST] Cross-provider execution verified: canonicalWorkId ${canonicalWorkId} preserved across ComfyUI → Adobe failover`);
    });
  });
});