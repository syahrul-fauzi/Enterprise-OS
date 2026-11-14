// @ts-nocheck
// ComfyUI specific provider contract
// Extends base CreativeProvider with ComfyUI-specific capabilities
// ComfyUI operates as execution reference only, maintains Work identity in EOS
import type { CreativeProvider } from "./provider-base.contract.js";
import type { CreativeBrief } from "../../domain/creative-brief/types.js";

export interface ComfyUIProvider extends CreativeProvider {
  providerType: "comfyui";
  apiEndpoint: string;
  workflowId: string; // Immutable ComfyUI workflow ID from Comfy API
  supportedModels: string[]; // List of models this provider can access
  loraSupport: boolean;
  
  // ComfyUI-specific execution method with workflow graph parameters
  executeComfyWorkflow(
    brief: CreativeBrief,
    workflowOverrides?: Record<string, unknown>
  ): Promise<ProviderExecutionResult & {
    success: boolean;
    promptId: string; // ComfyUI prompt ID (execution reference only)
    assetUrls: string[];
    error?: string;
  }>;
}

// Normalized results for partial execution tracking
export interface NormalizedProductionResult {
  partialSuccess: boolean;
  completedAssets: number;
  totalAssets: number;
}

// Provider execution result interface
export interface ProviderExecutionResult {
  jobId: string;
  normalizedResults?: NormalizedProductionResult;
  record?: { timestamp: string; actorId: string };
}

// ComfyUI workflow manifest schema (follows Comfy API immutable build standard)
export interface ComfyUIWorkflowManifest {
  workflowId: string;
  version: string;
  buildTimestamp: string;
  nodes: string[];
  models: string[];
  loras: string[];
  isImmutable: boolean;
}