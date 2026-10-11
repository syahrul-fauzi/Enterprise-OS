import { WorkTemplateSchema } from "../work-template-core/workspace";

// HV008-REPEAT-001: Cross-Boundary Economic Dispute Resolution Template
// Extracted from HV-008 $2.4M cross-org supply chain dispute implementation
// Compliant with RESOLUTION ERA guardrails: NEW WORK PATTERN allowed after vertical evidence
export const crossBoundaryDisputeTemplate: WorkTemplateSchema = {
  template_id: "cross-boundary-dispute-resolution",
  template_version: "1.0.0",
  extends: ["work-template-core", "workspace-standard", "cmbcd-boundary-base"],
  base_identity: "economic-dispute",
  initial_state: "dispute_created",
  intended_state: "settled",
  allowed_transitions: ["dispute_created", "understand", "resolve", "execute", "verify", "settled"],
  patterns: ["multi-actor-authority-transition", "evidence-chain-immutable", "cross-boundary-context-preservation", "economic-finality-verification"],
  capabilities: ["work-core", "evidence-registry", "execute-transition", "validate-boundaries", "cmbcd-execution-controller"],
  surfaces: ["dispute-dashboard", "actor-transition-portal", "settlement-verification-ui"],
  default_execution_frame: "constrained-gui",
  allowed_execution_frames: ["constrained-gui", "web", "api", "mcp", "direct"],
  actor_execution_frame_map: {
    "buyer": "constrained-gui",
    "supplier": "constrained-gui",
    "logistics": "api",
    "customs": "api",
    "insurer": "constrained-gui",
    "arbitrator": "direct"
  },
  frame_access_policies: {
    "constrained-gui": ["buyer", "supplier", "insurer", "arbitrator"],
    "api": ["logistics", "customs"],
    "mcp": ["tenant-admin", "system-operator"],
    "web": ["all-actors"]
  },
  pre_creation_hook: "init-dispute-evidence-chain",
  post_creation_hook: "assign-dispute-actors-sequence,cmbcd-frame-initializer"
};