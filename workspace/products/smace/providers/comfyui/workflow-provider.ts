// @ts-nocheck
// ComfyUI provider workflow - separated from business lifecycle per user's 3-layer requirement
// Provider-specific logic only: graph definitions, model parameters, and execution dependencies
import type { WorkflowStep } from "@repo/core-kernel";

// ComfyUI-specific execution workflow (execution layer)
export const SMACE_COMFYUI_EXECUTION_WORKFLOW: WorkflowStep[] = [
  {
    id: "comfyui-workflow-initialized",
    label: "ComfyUI Workflow Initialized",
    capability: "connector-ecosystem",
    command: "provider.initialize",
    description: "ComfyUI API connection established and immutable workflow package loaded",
    requiredRoles: ["system", "provider-agent"]
  },
  {
    id: "model-loading-completed",
    label: "AI Models Loaded",
    capability: "connector-ecosystem",
    command: "model.load",
    description: "All required models (SDXL, LoRA, controlnet) loaded into VRAM with version verification",
    requiredRoles: ["system", "provider-agent"]
  },
  {
    id: "generation-completed",
    label: "Asset Generation Completed",
    capability: "connector-ecosystem",
    command: "generation.execute",
    description: "All product photography assets generated with specified parameters (angles, background, resolution)",
    requiredRoles: ["system", "provider-agent"]
  },
  {
    id: "post-processing-completed",
    label: "Post-Processing Completed",
    capability: "connector-ecosystem",
    command: "processing.execute",
    description: "Resize, format conversion, and metadata embedding completed for all assets",
    requiredRoles: ["system", "provider-agent"]
  },
  {
    id: "provider-workflow-finalized",
    label: "ComfyUI Workflow Finalized",
    capability: "governance-evidence",
    command: "evidence.record",
    description: "All generation attempts, logs, and outputs recorded in EOS evidence registry",
    requiredRoles: ["system", "provider-agent"]
  }
];

// ComfyUI-specific provider workflow graph (provider layer - immutable per Comfy API 2026)
export const SMACE_COMFYUI_PROVIDER_GRAPH = {
  workflow_version: "1.0.0",
  immutable: true,
  models: ["sdxl-1.0", "lora-product-photography-v2", "controlnet-depth"],
  nodes: [
    { id: 1, type: "CheckpointLoaderSimple", parameters: { ckpt_name: "sdxl-base-1.0.safetensors" } },
    { id: 2, type: "LoraLoader", parameters: { lora_name: "product-photography-v2.safetensors", strength_model: 0.8 } },
    { id: 3, type: "ControlNetApply", parameters: { control_net_name: "control_depth.safetensors" } },
    { id: 4, type: "KSampler", parameters: { steps: 30, cfg: 7.5, sampler_name: "euler", scheduler: "normal" } },
    { id: 5, type: "SaveImage", parameters: { format: "png", quality: 100 } }
  ],
  dependencies: ["torch>=2.1", "transformers>=4.36", "diffusers>=0.24"]
};