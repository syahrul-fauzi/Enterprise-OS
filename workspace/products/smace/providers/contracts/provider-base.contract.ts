export interface BaseProvider {
  id: string;
  providerType: 'comfyui' | 'adobe' | 'adobe-firefly' | 'image' | 'video' | 'audio';
  name: string;
  ratePerAsset: number;
  isAvailable: boolean;
}

export interface ProviderExecutionRequest {
  specificationId: string;
  tenantId: string;
  actorId: string;
  inputs: any;
}

export interface UsageReceipt {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  timestamp: string;
  canonicalWorkId: string;
  assetCount: number;
}

export interface ProviderExecutionResult {
  success: boolean;
  assetUrls?: string[];
  error?: string;
  executionTimeMs: number;
  usageReceipt?: UsageReceipt;
}

export interface ProviderFactory {
  getProvider(id: string): BaseProvider | undefined;
  listAvailableProviders(): BaseProvider[];
  selectOptimalProvider(specification: any): BaseProvider | undefined;
  selectProvider(requiredType: string, productType: string): BaseProvider | undefined;
}