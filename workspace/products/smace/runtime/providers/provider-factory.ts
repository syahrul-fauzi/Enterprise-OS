/**
 * Provider Layer Implementation (Third layer of 3-layer workflow separation)
 * Handles provider-specific workflow graph, model selection, node parameters, and dependencies
 * No business logic or EOS execution core logic here - only provider API integration
 */

import type { CreativeBrief, CreativeSpecification } from '../../contracts/creative-brief.contract.js';
import { ComfyUIProvider } from "../../providers/comfyui/comfyui-provider.js";
import { AdobeFireflyProvider } from "../../providers/adobe/adobe-provider.js";
import { normalizeProviderResults } from "./provider-results-normalizer.js";

// SMACE-008-W005: Definisi biaya provider untuk reconciliation
const PROVIDER_COSTS = {
  comfyui: 50000, // 50rb IDR per eksekusi
  adobefirefly: 75000 // 75rb IDR per eksekusi
};

// Provider factory untuk select dan inisialisasi provider yang sesuai
export function getProviderFactory() {
  const providers = [ComfyUIProvider, AdobeFireflyProvider];
  
  return {
    selectProvider: (providerType: string) => {
      const providerClass = providers.find(p => 
        p.name.toLowerCase().includes(providerType.toLowerCase())
      );
      
      if (!providerClass) {
        throw new Error(`No provider found for type ${providerType}`);
      }
      
      return new providerClass();
    }
  };
}

// Helper untuk membuat instance provider dari tipe yang dipilih
export function createProviderInstance(providerType: string) {
  const factory = getProviderFactory();
  return factory.selectProvider(providerType);
}

// ComfyUI 2026 API types (from blog.comfy.org 2026-09-30 announcement)
interface ComfyUIWorkflow {
  id: string;
  version: string;
  immutable: boolean;
  nodes: ComfyUINode[];
  models: string[];
  loras: string[];
  dependencies: string[];
  outputFormat: string;
}

interface ComfyUINode {
  id: string;
  type: string;
  parameters: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

// Adobe Firefly API types (Adobe Creative Production Workflow API)
interface AdobeFireflyWorkflow {
  workflowId: string;
  batchId: string;
  concurrency: number;
  retryPolicy: { maxRetries: number; backoffMs: number };
  assets: AdobeFireflyAssetRequest[];
  progressTracking: boolean;
}

interface AdobeFireflyAssetRequest {
  assetId: string;
  prompt: string;
  style: string;
  dimensions: { width: number; height: number };
  format: string;
}

// Provider factory return type
export interface ProviderWorkflowInstance {
  providerType: "comfyui" | "adobe";
  workflow: ComfyUIWorkflow | AdobeFireflyWorkflow;
  execute: () => Promise<{ assetIds: string[]; completed: boolean; error?: string }>;
  getStatus: () => Promise<{ progress: number; status: "pending" | "running" | "completed" | "failed" }>;
}

/**
 * Create ComfyUI provider workflow - implements 2026 Comfy API immutable workflow pattern
 * All model/node/graph logic is isolated here per user's 3-layer separation requirement
 */
export function createComfyUIProviderWorkflow(providerConfig: ProviderConfiguration): ProviderWorkflowInstance {
  console.log(`[PROVIDER LAYER] Initializing ComfyUI 2026 workflow for provider: ${providerConfig.id}`);

  // Build immutable ComfyUI workflow graph (provider-specific node/parameter logic)
  const comfyWorkflow: ComfyUIWorkflow = {
    id: `comfyui-smace-product-photography-v1.0.0`,
    version: "1.0.0",
    immutable: true, // Per 2026 Comfy API requirement - build/release is immutable
    nodes: [
      {
        id: "ckpt-loader",
        type: "CheckpointLoaderSimple",
        parameters: { ckpt_name: "realisticVisionV60B1_v60B1VAE.safetensors" },
        inputs: [],
        outputs: ["model", "clip", "vae"]
      },
      {
        id: "lora-loader",
        type: "LoraLoader",
        parameters: { strength_model: 0.8, strength_clip: 0.8 },
        inputs: ["model", "clip"],
        outputs: ["model_lora", "clip_lora"]
      },
      {
        id: "positive-prompt",
        type: "CLIPTextEncode",
        parameters: {},
        inputs: ["clip_lora"],
        outputs: ["cond"]
      },
      {
        id: "negative-prompt",
        type: "CLIPTextEncode",
        parameters: { text: "blurry, low quality, watermark, text, logo" },
        inputs: ["clip_lora"],
        outputs: ["uncond"]
      },
      {
        id: "ksampler",
        type: "KSampler",
        parameters: { seed: Math.floor(Math.random() * 1000000), steps: 30, cfg: 7, sampler_name: "euler", scheduler: "normal" },
        inputs: ["model_lora", "cond", "uncond"],
        outputs: ["latent"]
      },
      {
        id: "vae-decode",
        type: "VAEDecode",
        parameters: {},
        inputs: ["latent", "vae"],
        outputs: ["image"]
      },
      {
        id: "save-image",
        type: "SaveImage",
        parameters: { output_format: "png", quality: 100 },
        inputs: ["image"],
        outputs: []
      }
    ],
    models: ["realisticVisionV60B1_v60B1VAE.safetensors"],
    loras: ["product-photography-enhancer.safetensors"],
    dependencies: ["comfy-core", "comfyui-impact-pack", "comfyui-advanced-controlnet"],
    outputFormat: "png"
  };

  // Execute method - ComfyUI API integration (UPDATED: SMACE-008-W004 normalized schema + SMACE-008-W005 usageReceipt)
  async function execute(brief: { canonicalWorkId: string }): Promise<{ 
    assetIds: string[]; 
    completed: boolean; 
    error?: string;
    // Unified production schema for cross-provider normalization
    normalizedResults: {
      providerExecutionId: string;
      runtimeJobId: string;
      completed: string[];
      failed: string[];
      retried: string[];
      partialSuccess: boolean;
      usageReceipt: any;
    }
  }> {
    console.log(`[PROVIDER LAYER] Executing ComfyUI workflow: ${comfyWorkflow.id}`);
    const runtimeJobId = `runtime:job:${Date.now()}`;
    const providerExecutionId = `comfy:exec:${comfyWorkflow.id}`;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Generate mock asset IDs with tracking
      const allAssetIds = [`comfy-asset-${Date.now()}-001`, `comfy-asset-${Date.now()}-002`, `comfy-asset-${Date.now()}-003`];
      console.log(`[PROVIDER LAYER] ComfyUI workflow completed: ${allAssetIds.length} assets generated`);
      
      // SMACE-008-W005: Tambahkan usageReceipt untuk economic reconciliation dengan SMACE-007
      const providerCost = PROVIDER_COSTS.comfyui;
      const usageReceipt = {
        id: `provider:receipt:comfyui:${brief.canonicalWorkId}`,
        provider: "comfyui",
        amount: providerCost,
        currency: "IDR",
        timestamp: new Date().toISOString(),
        canonicalWorkId: brief.canonicalWorkId,
        assetCount: allAssetIds.length
      };
      
      // Wrap raw provider results and pass through unified normalizer (SMACE-008-W004)
      const rawResults = {
        normalizedResults: {
          providerExecutionId,
          runtimeJobId,
          completed: allAssetIds,
          failed: [],
          retried: [],
          partialSuccess: false,
          usageReceipt // SMACE-008-W005: Sertakan usageReceipt untuk SMACE-007 reconciliation
        }
      };
      
      // Execute centralized normalization (prevents duplicate normalization logic)
      const finalNormalizedResults = normalizeProviderResults(brief.canonicalWorkId, "comfyui", rawResults);
      
      return { 
        assetIds: allAssetIds, 
        completed: true, 
        normalizedResults: finalNormalizedResults 
      };
    } catch (error) {
      console.error(`[PROVIDER LAYER] ComfyUI workflow failed: ${(error as Error).message}`);
      const normalizedResults = {
        providerExecutionId,
        runtimeJobId,
        completed: [],
        failed: [],
        retried: [],
        partialSuccess: false
      };
      return { assetIds: [], completed: false, error: (error as Error).message, normalizedResults };
    }
  }

  // Get status method - progress tracking per Comfy API
  async function getStatus() {
    // In production, fetch from Comfy API /progress/{workflowId} endpoint
    return { progress: 100, status: "completed" as const };
  }

  return {
    providerType: "comfyui",
    workflow: comfyWorkflow,
    execute,
    getStatus
  };
}

/**
 * Create Adobe Firefly provider workflow - implements Adobe Creative Production Workflow API
 * Isolated Adobe-specific batch workflow, retry policies, and progress tracking logic
 */
export function createAdobeFireflyProviderWorkflow(providerConfig: ProviderConfiguration): ProviderWorkflowInstance {
  console.log(`[PROVIDER LAYER] Initializing Adobe Firefly workflow for provider: ${providerConfig.id}`);

  // Build Adobe Firefly batch workflow (per Adobe Creative Production API specification)
  const adobeWorkflow: AdobeFireflyWorkflow = {
    workflowId: `adobe-smace-product-photography-v1.0.0`,
    batchId: `batch-${Date.now()}`,
    concurrency: 3, // Controlled concurrency per Adobe API
    retryPolicy: { maxRetries: 2, backoffMs: 5000 }, // Retry-aware execution
    assets: [], // Populated at execution time from creative specification
    progressTracking: true // Enable Adobe's built-in progress tracking
  };

  // Execute method - Adobe Firefly API integration (UPDATED: SMACE-008-W004 normalized schema + SMACE-008-W005 usageReceipt)
  async function execute(brief: { canonicalWorkId: string }): Promise<{ 
    assetIds: string[]; 
    completed: boolean; 
    error?: string;
    // Unified production schema for cross-provider normalization
    normalizedResults: {
      providerExecutionId: string;
      runtimeJobId: string;
      completed: string[];
      failed: string[];
      retried: string[];
      partialSuccess: boolean;
      usageReceipt: any;
    }
  }> {
    console.log(`[PROVIDER LAYER] Executing Adobe Firefly workflow: ${adobeWorkflow.workflowId}`);
    const runtimeJobId = `runtime:job:${Date.now()}`;
    const providerExecutionId = `adobe:exec:${adobeWorkflow.batchId}`;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Generate mock asset IDs with partial success simulation (SMACE-008-W004 partial failure requirement)
      const allAssetIds = [`adobe-asset-${Date.now()}-001`, `adobe-asset-${Date.now()}-002`, `adobe-asset-${Date.now()}-003`];
      // Simulate 1 asset failure to demonstrate partial success handling
      const completedAssets = allAssetIds.slice(0, 2); // 2 assets completed
      const failedAssets = [allAssetIds[2]]; // 1 asset failed
      
      console.log(`[PROVIDER LAYER] Adobe Firefly workflow completed: ${completedAssets.length}/${allAssetIds.length} assets generated, ${failedAssets.length} failed`);
      
      // SMACE-008-W005: Tambahkan usageReceipt untuk economic reconciliation dengan SMACE-007
      const providerCost = PROVIDER_COSTS.adobe;
      const usageReceipt = {
        id: `provider:receipt:adobe:${brief.canonicalWorkId}`,
        provider: "adobe",
        amount: providerCost,
        currency: "IDR",
        timestamp: new Date().toISOString(),
        canonicalWorkId: brief.canonicalWorkId,
        assetCount: completedAssets.length
      };
      
      // Wrap raw provider results and pass through unified normalizer (SMACE-008-W004)
      const rawResults = {
        normalizedResults: {
          providerExecutionId,
          runtimeJobId,
          completed: completedAssets,
          failed: failedAssets,
          retried: [],
          partialSuccess: failedAssets.length > 0, // True jika ada asset yang gagal
          usageReceipt // SMACE-008-W005: Sertakan usageReceipt untuk SMACE-007 reconciliation
        }
      };
      
      // Execute centralized normalization (prevents duplicate normalization logic)
      const finalNormalizedResults = normalizeProviderResults(brief.canonicalWorkId, "adobe", rawResults);
      
      return { 
        assetIds: completedAssets, 
        completed: failedAssets.length === 0, 
        normalizedResults: finalNormalizedResults 
      };
    } catch (error) {
      console.error(`[PROVIDER LAYER] Adobe Firefly workflow failed: ${(error as Error).message}`);
      const normalizedResults = {
        providerExecutionId,
        runtimeJobId,
        completed: [],
        failed: [],
        retried: [],
        partialSuccess: false,
        usageReceipt: null
      };
      return { assetIds: [], completed: false, error: (error as Error).message, normalizedResults };
    }
  }

  // Get status method - Adobe's progress tracking API
  async function getStatus() {
    // In production, fetch from Adobe API /v2/workflow/{workflowId}/status
    return { progress: 100, status: "completed" as const };
  }

  return {
    providerType: "adobe",
    workflow: adobeWorkflow,
    execute,
    getStatus
  };
}

/**
 * Universal provider factory - selects correct provider implementation based on config
 * Maintains replaceable provider pattern per user's architecture decision: "ComfyUI as replaceable provider"
 */
export async function createProviderWorkflow(providerConfig: ProviderConfiguration): Promise<ProviderWorkflowInstance> {
  switch (providerConfig.providerType) {
    case "adobe":
      return createAdobeFireflyProviderWorkflow(providerConfig);
    case "comfyui":
    default:
      return createComfyUIProviderWorkflow(providerConfig);
  }
}