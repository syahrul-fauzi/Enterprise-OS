// @ts-nocheck
import type { CreativeSpecification, CreativeBrief } from "../../domain/creative-brief/types.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import { ComfyUIProvider } from "./comfyui-provider.js";

// Provider Workflow: Logic spesifik ComfyUI (graph, model, node, parameter) (SMACE-ARCH-003)
// Memisahkan logic provider dari business lifecycle dan execution orkestrasi

// ComfyUI workflow graph definition - spesifik untuk product photography
const COMFYUI_PRODUCT_PHOTOGRAPHY_WORKFLOW = {
  "3": {
    "class_type": "KSampler",
    "inputs": {
      "seed": 12345,
      "steps": 20,
      "cfg": 7,
      "sampler_name": "euler",
      "scheduler": "normal",
      "denoise": 1,
      "model": ["4", 0],
      "positive": ["6", 0],
      "negative": ["7", 0],
      "latent_image": ["5", 0]
    }
  },
  "4": {
    "class_type": "CheckpointLoaderSimple",
    "inputs": {
      "ckpt_name": "realisticVisionV51_v51VAE.safetensors"
    }
  },
  "5": {
    "class_type": "EmptyLatentImage",
    "inputs": {
      "width": 1024,
      "height": 1024,
      "batch_size": 1
    }
  },
  "6": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "product photography, white background, professional lighting",
      "clip": ["4", 1]
    }
  },
  "7": {
    "class_type": "CLIPTextEncode",
    "inputs": {
      "text": "blurry, low quality, distorted",
      "clip": ["4", 1]
    }
  },
  "8": {
    "class_type": "VAEDecode",
    "inputs": {
      "samples": ["3", 0],
      "vae": ["4", 2]
    }
  },
  "9": {
    "class_type": "SaveImage",
    "inputs": {
      "images": ["8", 0]
    }
  }
};

// Generate dynamic ComfyUI workflow based on creative specification
function buildComfyUIWorkflow(specification: CreativeSpecification): any {
  // Guard clause untuk semua properti requirements (SMACE-001 compliance)
  const safeRequirements = specification?.requirements || {};
  const safeResolutions = safeRequirements.resolutions || ['4096x4096'];
  const safeStyles = safeRequirements.styles || ['professional'];
  const safeBackgrounds = safeRequirements.backgrounds || ['white'];
  const safeVariations = safeRequirements.variations || ['front'];
  
  // Clone base workflow
  const workflow = JSON.parse(JSON.stringify(COMFYUI_PRODUCT_PHOTOGRAPHY_WORKFLOW));
  
  // Update dimensions based on specification
  if (safeResolutions.length > 0) {
    const [width, height] = safeResolutions[0].split('x').map(Number);
    workflow["5"].inputs.width = width;
    workflow["5"].inputs.height = height;
  }
  
  // Update prompt based on styles
  const stylePrompt = safeStyles.join(', ');
  workflow["6"].inputs.text = `product photography, ${stylePrompt}, ${safeBackgrounds.join(', ')} background, professional lighting`;
  
  // Set batch size based on number of variations
  workflow["5"].inputs.batch_size = safeVariations.length;
  
  return workflow;
}

// Execute production via ComfyUI API
export async function executeComfyUIProduction(
  specification: CreativeSpecification,
  brief: CreativeBrief, // Menerima full CreativeBrief untuk pass ke executeWorkflow
  actorId: string,
  tenantId: string,
  workspaceId: string
): Promise<{ success: boolean; assets: string[] }> {
  const workId = `smace-product-photography-${brief.id}`;
  const comfyUIProvider = new ComfyUIProvider();
  
  // Panggil executeWorkflow dari comfyui-provider.ts (V4.2 compliant) dengan semua parameter yang dibutuhkan
  const executionResult = await comfyUIProvider.executeWorkflow(
    workId, // canonicalWorkId
    tenantId,
    workspaceId,
    specification, // creativeSpec
    brief // creativeBrief (untuk akses assetCount)
  );
  
  // Build dynamic workflow (untuk kompatibilitas sementara)
  const comfyWorkflow = buildComfyUIWorkflow(specification);
  
  // Record provider execution start (gunakan assetCount dari CreativeBrief sesuai V4.2)
  await recordRuntimeInvocation({
    capabilityId: "smace-provider-comfyui",
    operationId: "provider.execution.start",
    sourceRef: `smace/providers/comfyui/${brief.id}`,
    success: true,
    input: { specificationId: `${brief.id}-spec`, assetCount: brief.assetCount },
    result: { workflowSubmitted: true, executionRef: executionResult.executionRef },
    productId: "smace",
    tenant_id: tenantId,
    actor_id: actorId,
    work_id: workId,
    inputRefs: [`specification:${brief.id}-spec`],
    outputRefs: [`provider:comfyui:${brief.id}:submitted`]
  });

  try {
    // Dalam production: ini akan memanggil ComfyAPI /prompt endpoint
    // const comfyApiResponse = await fetch('https://comfyui-api.example.com/prompt', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ prompt: comfyWorkflow })
    // });
    // const executionResult = await comfyApiResponse.json();
    
    // Simulasi hasil untuk development dengan guard clause SMACE-001
    const safeVariations = specification?.requirements?.variations || [];
    const safeFormats = specification?.requirements?.formats || ['png'];
    const generatedAssets = safeVariations.map((variation, index) => 
      `smace-assets/${brief.id}/asset-${index}-${variation}.${safeFormats[0].toLowerCase()}`
    );

    // Record provider execution success
    await recordRuntimeInvocation({
      capabilityId: "smace-provider-comfyui",
      operationId: "provider.execution.completed",
      sourceRef: `smace/providers/comfyui/${brief.id}`,
      success: true,
      input: { specificationId: `${brief.id}-spec` },
      result: { assetsGenerated: generatedAssets.length },
      productId: "smace",
      tenant_id: tenantId,
      actor_id: actorId,
      work_id: workId,
      inputRefs: [`provider:comfyui:${brief.id}:submitted`],
      outputRefs: [`provider:comfyui:${brief.id}:completed`]
    });

    return {
      success: true,
      assets: generatedAssets
    };

  } catch (error) {
    // Record provider execution failure
    await recordRuntimeInvocation({
      capabilityId: "smace-provider-comfyui",
      operationId: "provider.execution.failed",
      sourceRef: `smace/providers/comfyui/${brief.id}`,
      success: false,
      input: { specificationId: `${brief.id}-spec` },
      result: { error: error.message },
      productId: "smace",
      tenant_id: tenantId,
      actor_id: actorId,
      work_id: workId,
      inputRefs: [`provider:comfyui:${brief.id}:submitted`],
      outputRefs: [`provider:comfyui:${brief.id}:failed`]
    });

    throw error;
  }
}

// Update provider factory untuk meng-export ComfyUI provider
export const ComfyUIProvider = {
  name: "comfyui",
  supportedProductTypes: ["product-photography", "ecommerce-images"],
  executeProduction: executeComfyUIProduction
};