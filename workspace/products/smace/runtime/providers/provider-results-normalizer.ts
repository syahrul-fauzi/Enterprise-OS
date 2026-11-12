/**
 * Unified batch/partial-failure result normalizer (SMACE-008-W004)
 * Normalizes provider-specific results into SMACE production semantics
 * Preserves all provider-specific references as subordinate to canonicalWorkId
 * Ensures idempotent retry logic that never creates new canonical Work
 * Reused by both ComfyUI and Adobe providers to avoid duplicate normalization logic
 */

import type { 
  NormalizedProductionResult,
  ProviderExecutionResult
} from "../../providers/contracts/comfyui.provider.contract.js";
// ProviderResult akan dihapus dari interface karena tidak digunakan di implementasi

/**
 * Normalize any provider's raw execution results into SMACE-standard normalized format
 * Preserves all provider-specific IDs while ensuring canonicalWorkId is never replaced
 * Implements idempotent retry tracking and partial failure representation
 */
export function normalizeProviderResults(
  canonicalWorkId: string,
  providerType: 'comfyui' | 'adobe',
  rawProviderResults: ProviderExecutionResult
): NormalizedProductionResult {
  // Validate canonicalWorkId invariant (critical per SMACE-008 requirements)
  if (rawProviderResults.normalizedResults?.runtimeJobId === canonicalWorkId || 
      rawProviderResults.normalizedResults?.providerExecutionId === canonicalWorkId) {
    throw new Error(`CRITICAL VIOLATION: Provider-specific ID cannot equal canonicalWorkId (${canonicalWorkId})`);
  }

  // Extract raw asset statuses from provider output
  const completedAssets = rawProviderResults.normalizedResults?.completed || [];
  const failedAssets = rawProviderResults.normalizedResults?.failed || [];
  const retriedAssets = rawProviderResults.normalizedResults?.retried || [];

  // Calculate partial success status (true if any assets completed but not all)
  const partialSuccess = completedAssets.length > 0 && failedAssets.length > 0;
  
  // Track retry idempotency: prevent duplicate retries of the same asset
  const uniqueRetriedAssets = [...new Set(retriedAssets)];
  
  // Validate idempotency: no asset can be in more than one status category
  const assetIds = new Set([...completedAssets, ...failedAssets, ...uniqueRetriedAssets]);
  if (assetIds.size !== completedAssets.length + failedAssets.length + uniqueRetriedAssets.length) {
    throw new Error(`IDEMPOTENCY VIOLATION: Asset appears in multiple status categories for canonicalWorkId ${canonicalWorkId}`);
  }

  // Build normalized SMACE-standard result
  const normalized: NormalizedProductionResult = {
    canonicalWorkId,
    providerType,
    providerReferences: {
      providerExecutionId: rawProviderResults.normalizedResults?.providerExecutionId,
      runtimeJobId: rawProviderResults.normalizedResults?.runtimeJobId
    },
    assetStatuses: {
      completed: completedAssets,
      failed: failedAssets,
      retried: uniqueRetriedAssets,
      total: assetIds.size
    },
    partialSuccess,
    fullyCompleted: completedAssets.length === assetIds.size && assetIds.size > 0,
    usageReceipt: rawProviderResults.normalizedResults?.usageReceipt,
    normalizedAt: new Date().toISOString()
  };

  // Log normalization for evidence chain
  console.log(`[PROVIDER NORMALIZER] CanonicalWorkId ${canonicalWorkId}: ${completedAssets.length}/${assetIds.size} assets completed, partialSuccess=${partialSuccess}`);

  return normalized;
}

/**
 * Retry failed assets for a workflow - idempotent implementation
 * Does not create new canonicalWorkId, only adds to retried assets list
 */
export function retryFailedAssets(
  existingNormalizedResults: NormalizedProductionResult,
  assetsToRetry: string[]
): NormalizedProductionResult {
  // Validate all assets to retry are in the failed list
  const invalidAssets = assetsToRetry.filter(
    assetId => !existingNormalizedResults.assetStatuses.failed.includes(assetId)
  );

  if (invalidAssets.length > 0) {
    throw new Error(`RETRY VALIDATION FAILED: Cannot retry assets that are not marked as failed: ${invalidAssets.join(', ')}`);
  }

  // Move assets from failed to retried list (idempotent: no duplicates)
  const newFailed = existingNormalizedResults.assetStatuses.failed.filter(
    assetId => !assetsToRetry.includes(assetId)
  );
  
  const newRetried = [
    ...existingNormalizedResults.assetStatuses.retried,
    ...assetsToRetry
  ];

  // Return updated normalized results (preserves all other properties)
  return {
    ...existingNormalizedResults,
    assetStatuses: {
      ...existingNormalizedResults.assetStatuses,
      failed: newFailed,
      retried: [...new Set(newRetried)]
    },
    retriedAt: new Date().toISOString()
  };
}