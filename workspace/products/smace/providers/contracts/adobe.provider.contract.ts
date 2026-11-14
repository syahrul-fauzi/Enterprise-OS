// @ts-nocheck
// Adobe Firefly specific provider contract
// Extends base CreativeProvider with Adobe-specific capabilities
// Adobe operates as execution reference only, maintains Work identity in EOS
import type { CreativeProvider } from "./provider-base.contract.js";
import type { CreativeBrief } from "../../domain/creative-brief/types.js";

export interface AdobeFireflyProvider extends CreativeProvider {
  providerType: "adobe-firefly";
  apiEndpoint: string;
  orgId: string; // Adobe Org ID
  clientId: string; // Adobe API Client ID (never hardcode in source)
  supportedJobTypes: string[]; // Firefly job types supported: "image_gen", "text_effect", etc.
  
  // Adobe-specific batch execution method (follows Adobe Creative Production Workflow API)
  executeBatchProduction(
    briefs: CreativeBrief[]
  ): Promise<{
    success: boolean;
    batchId: string; // Adobe batch ID (execution reference only)
    assetUrls: string[];
    error?: string;
  }>;
}

// Adobe job status schema (follows Adobe Progress Tracking standard)
export interface AdobeJobStatus {
  jobId: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  estimatedCompletion: string;
  error?: string;
}