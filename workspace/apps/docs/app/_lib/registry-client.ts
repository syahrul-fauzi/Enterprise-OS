import { readFileSync } from 'fs';
import path from 'path';

const REGISTRY_PATH = process.env.REGISTRY_PATH || path.join(process.cwd(), '../../foundation/evidence/registry');
const EVIDENCE_PATH = process.env.EVIDENCE_PATH || path.join(process.cwd(), '../../.eos-state/evidence');
const VERIFICATION_PATH = process.env.VERIFICATION_PATH || path.join(process.cwd(), '../../foundation/evidence/verification');

export type DataSource = 'registry_runtime' | 'fallback_static';

export interface DataSourceInfo {
  source: DataSource;
  verified: boolean;
  generatedAt?: string;
  registryPath?: string;
  fallbackSource?: string;
}

export interface CapabilityRegistryReport {
  summary: {
    total_capabilities: number;
    with_owner: number;
    owner_missing: number;
    invalid_capabilities: number;
    duplicate_candidates: number;
    lifecycle_counts: {
      reusable: number;
      experimental: number;
      core: number;
    };
    declared_products: number;
  };
  capabilities: Array<{
    id: string;
    name: string;
    manifest_version: string;
    version: string;
    owner: string;
    status: string;
    stability: string;
    lifecycle_stage: string;
    governance_status: string;
    owner_requirement_status: string;
    introduced: string | null;
    deprecated: string | null;
    manifest_ref: string;
    runtime_ref: string;
    planner_ref: string | null;
    composer_ref: string | null;
    verification_ref: string;
    declared_exports: string[];
    declared_dependencies: string[];
    dependency_policy: {
      allowed_dependencies: string[];
      forbidden_dependencies: string[];
    };
    consumers: string[];
    declared_consumers: string[];
    provided_contract_versions: string[];
    required_contract_ranges: string[];
    empirically_verified_products: string[];
    product_reach_ratio: number;
    reachable_from_products: string[];
    reachability_status: string;
    implementation_files: number;
    test_files: number;
    owner_missing: boolean;
  }>;
}

export interface CertificationSummary {
  totalCapabilities: number;
  stableCapabilities: number;
  experimentalCapabilities: number;
  coreCapabilities: number;
  reusableCapabilities: number;
  withOwner: number;
  ownerMissing: number;
  declaredProducts: number;
}

export interface EvidenceReconAudit {
  work_id: string;
  recon_completed_at: string;
  locked_boundaries_verified: Record<string, Record<string, number>>;
  reuse_percentage: number;
  findings: {
    existing_capabilities_found: string[];
    minimal_fix_applied: {
      file: string;
      lines_changed: number;
      description: string;
    };
    blocker_analysis: {
      blocked: boolean;
      block_reason: string | null;
      critical_missing: string[];
    };
  };
  recommendations: string[];
}

export interface EvidenceProducerConvergenceReport {
  report_version: string;
  status: string;
  summary: {
    producer_count: number;
    canonical_schema_versions: string[];
    artifact_type_count: number;
    subject_type_count: number;
    producers_with_default_projection_ref: number;
    target_producer_count: number;
    registered_target_producer_count: number;
    target_coverage_ratio: number;
  };
  producers: Array<{
    producer_id: string;
    artifact_type: string;
    subject_type: string;
    schema_version: string;
    default_projection_ref: string;
    canonical_envelope: Record<string, boolean>;
  }>;
}

export function getCapabilityRegistry(): CapabilityRegistryReport {
  const filePath = path.join(REGISTRY_PATH, 'capability-registry-report.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as CapabilityRegistryReport;
}

export function getCertificationSummary(registry: CapabilityRegistryReport): CertificationSummary {
  const stable = registry.capabilities.filter(c => c.stability === 'stable').length;
  const experimental = registry.capabilities.filter(c => c.stability === 'experimental').length;
  const core = registry.summary.lifecycle_counts.core;
  const reusable = registry.summary.lifecycle_counts.reusable;

  return {
    totalCapabilities: registry.summary.total_capabilities,
    stableCapabilities: stable,
    experimentalCapabilities: experimental,
    coreCapabilities: core,
    reusableCapabilities: reusable,
    withOwner: registry.summary.with_owner,
    ownerMissing: registry.summary.owner_missing,
    declaredProducts: registry.summary.declared_products,
  };
}

export function getEvidenceReconAudit(): EvidenceReconAudit {
  const filePath = path.join(EVIDENCE_PATH, 'evidence-recon-audit.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as EvidenceReconAudit;
}

export function getEvidenceProducerConvergenceReport(): EvidenceProducerConvergenceReport {
  const filePath = path.join(VERIFICATION_PATH, 'evidence-producer-convergence-report.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as EvidenceProducerConvergenceReport;
}

export interface GateStatusProjection {
  projection_id: string;
  generated_at_utc: string;
  status: string;
  phase: {
    current: string;
    phase_a_status: string;
    gate_c1_framework_status: string;
  };
  governance_platform: {
    constitution: { status: string; law_profile: string };
    dependency_graph: { status: string; dependency_cycles: number; boundary_violations: number };
    contract_governance: { status: string; evolution_status: string; ready_contracts: number };
    capability_graph: {
      status: string;
      governance_health_status: string;
      dependency_edge_count: number;
      circular_dependency_count: number;
      unstable_dependency_count: number;
      orphan_capability_count: number;
      ownership_gap_count: number;
      capability_without_evidence_count: number;
      partial_evidence_count: number;
    };
    trust_framework: { status: string; framework_count: number };
    specification_system: { status: string; conformance_status: string; vocabulary_status: string };
  };
  science_kernel: { status: string };
}

export function getGateStatus(): GateStatusProjection {
  const filePath = path.join(VERIFICATION_PATH, 'gate-c-status-projection.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as GateStatusProjection;
}

export interface KnowledgeRegistry {
  registry_version: string;
  generated_at_utc: string;
  summary: {
    knowledge_object_count: number;
    operationalized_knowledge_count: number;
    knowledge_availability_rate: number;
    reusable_knowledge_count: number;
    reused_knowledge_object_count: number;
    improved_knowledge_object_count: number;
    total_source_learning_count: number;
    total_reuse_count: number;
    total_improved_outcome_count: number;
  };
  entries: Array<{
    knowledge_id: string;
    knowledge_key: string;
    decision_type: string;
    knowledge_status: string;
    source_learning_ids: string[];
    source_decision_entry_ids: string[];
    supporting_outcome_tracking_ids: string[];
    lessons: string[];
    follow_up_actions: string[];
    hypotheses_validated: string[];
    hypotheses_invalidated: string[];
    first_captured_at_utc: string;
    last_captured_at_utc: string;
    source_learning_count: number;
    reuse_count: number;
    reused_by_decision_entry_ids: string[];
    decision_pattern_change_count: number;
    improved_outcome_count: number;
    evidence_ref_count: number;
    capability_ref_count: number;
  }>;
}

export function getKnowledgeRegistry(): KnowledgeRegistry {
  const filePath = path.join(VERIFICATION_PATH, 'knowledge-registry.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as KnowledgeRegistry;
}

export interface ExecutionGraph {
  projection_id: string;
  projection_type: string;
  schema_version: string;
  constitutional_version: string;
  declared_graph_digest: string;
  execution_chain_digest: string;
  constitutional_digest: string;
  constitutional_claims: {
    deterministic: boolean;
    immutable: boolean;
    chain_only_operational_edges: boolean;
    registry_only_declared_edges: boolean;
  };
  graph_version: string;
  projection_version: string;
  projection_digest: string;
  generated_from: Array<{
    source_type: string;
    source_ref: string;
    source_digest: string;
  }>;
  generated_at_utc: string;
  nodes: Array<{
    id: string;
    artifact_type: string;
    label: string;
    governance_status: string;
    owner: string | null;
    lifecycle_stage: string | null;
    discovery_signature: string[];
    planner_edges: string[];
    runtime_edges: string[];
    verification_edges: string[];
    composition_edges: string[];
    evidence_edges: string[];
    execution_status: string | null;
  }>;
}

export function getExecutionGraph(): ExecutionGraph {
  const filePath = path.join(VERIFICATION_PATH, 'execution-graph.json');
  const data = readFileSync(filePath, 'utf-8');
  return JSON.parse(data) as ExecutionGraph;
}

export interface ProcedureStep {
  stepId: string;
  kind: string;
  description: string;
  delegatedTo: string;
}

export interface ProcedureItem {
  name: string;
  status: string;
  contractPath: string;
  implementationPath: string;
  inputs: string[];
  outputs: string[];
  steps: ProcedureStep[];
}

export interface SurfaceRoute {
  path: string;
  description: string;
  requirementTrace: string;
}

export interface SurfaceItem {
  name: string;
  status: string;
  description: string;
  routes: SurfaceRoute[];
}

export interface ProcedureLifecycleState {
  state: string;
  description: string;
  transitionsTo: string;
  aiRule?: string;
}

export interface ProcedureTerminalState {
  name: string;
  description: string;
}

export interface RuntimeState {
  currentMode: string;
  scope: string;
  activeGate: string;
  nextGate: string;
  procedureLifecycle: {
    name: string;
    states: ProcedureLifecycleState[];
    terminalStates: ProcedureTerminalState[];
    continuationModel: string;
  };
}

export interface ProceduresData {
  active: ProcedureItem[];
  procedurePrinciple: string;
}

export interface SurfacesData {
  surfaces: SurfaceItem[];
  sharedIdentityPlan: string;
}

export interface DataResponse<T> {
  data: T;
  dataSource: DataSourceInfo;
}

export function getProceduresData(): DataResponse<ProceduresData> {
  try {
    const filePath = path.join(VERIFICATION_PATH, 'projections/procedures-projection.json');
    const data = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data) as ProceduresData;
    return {
      data: parsed,
      dataSource: {
        source: 'registry_runtime',
        verified: true,
        registryPath: filePath,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    const { EOS_KNOWLEDGE_MODEL } = require('./eos-knowledge-model');
    return {
      data: EOS_KNOWLEDGE_MODEL.procedures,
      dataSource: {
        source: 'fallback_static',
        verified: false,
        fallbackSource: 'EOS_KNOWLEDGE_MODEL.procedures'
      }
    };
  }
}

export function getSurfacesData(): DataResponse<SurfacesData> {
  try {
    const filePath = path.join(VERIFICATION_PATH, 'projections/surfaces-projection.json');
    const data = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data) as SurfacesData;
    return {
      data: parsed,
      dataSource: {
        source: 'registry_runtime',
        verified: true,
        registryPath: filePath,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    const { EOS_KNOWLEDGE_MODEL } = require('./eos-knowledge-model');
    return {
      data: EOS_KNOWLEDGE_MODEL.surfaces,
      dataSource: {
        source: 'fallback_static',
        verified: false,
        fallbackSource: 'EOS_KNOWLEDGE_MODEL.surfaces'
      }
    };
  }
}

export function getRuntimeState(): DataResponse<RuntimeState> {
  try {
    const filePath = path.join(VERIFICATION_PATH, 'projections/runtime-state-projection.json');
    const data = readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data) as RuntimeState;
    return {
      data: parsed,
      dataSource: {
        source: 'registry_runtime',
        verified: true,
        registryPath: filePath,
        generatedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    const { EOS_KNOWLEDGE_MODEL } = require('./eos-knowledge-model');
    return {
      data: EOS_KNOWLEDGE_MODEL.state,
      dataSource: {
        source: 'fallback_static',
        verified: false,
        fallbackSource: 'EOS_KNOWLEDGE_MODEL.state'
      }
    };
  }
}