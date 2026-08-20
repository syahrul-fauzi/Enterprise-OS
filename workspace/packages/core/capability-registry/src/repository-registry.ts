import { existsSync, readFileSync, readdirSync } from "node:fs";
import { DigestEngine } from "./digest-engine.js";
import { basename, dirname, resolve } from "node:path";
import yaml from "yaml";
import { z } from "zod";

export type ProductPortfolio = {
  readonly products?: readonly {
    readonly id: string;
    readonly shared_capabilities?: readonly string[];
  }[];
};

export type LifecycleStage =
  "experimental" | "reusable" | "core" | "foundation";
export type GovernanceStatus = "VALID" | "INVALID";
export type CapabilityManifestStability =
  "experimental" | "stable" | "deprecated";
export type CapabilityContractVersion = {
  readonly name: string;
  readonly version: string;
};
export type CapabilityContractRequirement = {
  readonly name: string;
  readonly range: string;
};
export type CapabilityDependencyPolicy = {
  readonly allowed_dependencies: readonly string[];
  readonly forbidden_dependencies: readonly string[];
};

export type CapabilityRegistryEntry = {
  readonly id: string;
  readonly name: string;
  readonly provided_capabilities: readonly string[];
  readonly manifest_version: string;
  readonly version: string;
  readonly owner: string;
  readonly status: string;
  readonly stability: CapabilityManifestStability;
  readonly lifecycle_stage: LifecycleStage;
  readonly governance_status: GovernanceStatus;
  readonly owner_requirement_status:
    "OPTIONAL" | "REQUIRED_MISSING" | "REQUIRED_PRESENT";
  readonly introduced: string | null;
  readonly deprecated: string | null;
  readonly manifest_ref: string;
  readonly runtime_ref: string | null;
  readonly planner_ref: string | null;
  readonly composer_ref: string | null;
  readonly verification_ref: string | null;
  readonly declared_exports: readonly string[];
  readonly declared_dependencies: readonly string[];
  readonly dependency_policy: CapabilityDependencyPolicy;
  readonly consumers: readonly string[];
  readonly declared_consumers: readonly string[];
  readonly provided_contract_versions: readonly CapabilityContractVersion[];
  readonly required_contract_ranges: readonly CapabilityContractRequirement[];
  readonly empirically_verified_products: readonly string[];
  readonly product_reach_ratio: number;
  readonly reachable_from_products: readonly string[];
  readonly reachability_status: "REACHABLE" | "UNREACHABLE";
  readonly implementation_files: number;
  readonly test_files: number;
  readonly owner_missing: boolean;
  readonly discovery_signature: readonly string[];
};

export type DuplicateCandidate = {
  readonly left: string;
  readonly right: string;
  readonly similarity: number;
  readonly recommendation: string;
};

export type CapabilityRegistryReport = {
  readonly summary: {
    readonly total_capabilities: number;
    readonly with_owner: number;
    readonly owner_missing: number;
    readonly invalid_capabilities: number;
    readonly duplicate_candidates: number;
    readonly lifecycle_counts: Record<string, number>;
    readonly declared_products: number;
  };
  readonly capabilities: readonly CapabilityRegistryEntry[];
  readonly duplicate_candidates: readonly DuplicateCandidate[];
  readonly rule: string;
};

export type ArtifactNode = {
  readonly id: string;
  readonly type: "product" | "capability";
  readonly label: string;
  readonly manifest_ref: string | null;
  readonly governance_status: GovernanceStatus | "UNVERIFIED";
};

export type ArtifactRegistryEntry = {
  readonly id: string;
  readonly artifact_type: "product" | "capability";
  readonly label: string;
  readonly manifest_ref: string | null;
  readonly governance_status: GovernanceStatus | "UNVERIFIED";
  readonly owner: string | null;
  readonly manifest_version: string | null;
  readonly stability: CapabilityManifestStability | null;
  readonly lifecycle_stage: LifecycleStage | null;
  readonly owner_requirement_status:
    CapabilityRegistryEntry["owner_requirement_status"] | null;
  readonly declared_exports: readonly string[];
  readonly declared_dependencies: readonly string[];
  readonly dependency_policy: CapabilityDependencyPolicy | null;
  readonly consumers: readonly string[];
  readonly declared_consumers: readonly string[];
  readonly provided_contract_versions: readonly CapabilityContractVersion[];
  readonly required_contract_ranges: readonly CapabilityContractRequirement[];
  readonly empirically_verified_products: readonly string[];
  readonly product_reach_ratio: number | null;
  readonly reachable_from_products: readonly string[];
  readonly reachability_status:
    CapabilityRegistryEntry["reachability_status"] | null;
  readonly runtime_ref: string | null;
  readonly planner_ref: string | null;
  readonly composer_ref: string | null;
  readonly verification_ref: string | null;
  readonly discovery_signature: readonly string[];
  readonly execution_evidence?: Record<string, unknown> | null;
  readonly provided_artifacts: readonly string[];
  readonly declared_relations: readonly {
    readonly relation: "uses" | "declares" | "provides" | "depends_on";
    readonly target: string;
  }[];
};

export type ArtifactRegistryReport = {
  readonly summary: {
    readonly total_artifacts: number;
    readonly products: number;
    readonly capabilities: number;
    readonly with_owner: number;
    readonly owner_missing: number;
  };
  readonly artifacts: readonly ArtifactRegistryEntry[];
  readonly claim_boundary: string;
};

export type ArtifactEdge = {
  readonly from: string;
  readonly to: string;
  readonly relation: "uses" | "declares" | "depends_on";
};

export type ArtifactGraphReport = {
  readonly nodes: readonly ArtifactNode[];
  readonly edges: readonly ArtifactEdge[];
  readonly summary: {
    readonly node_count: number;
    readonly edge_count: number;
    readonly product_nodes: number;
    readonly capability_nodes: number;
  };
};

export type ArtifactGraphHealthReport = {
  readonly registry_health: "HEALTHY" | "PARTIAL" | "BLOCKED";
  readonly artifact_coverage_ratio: number;
  readonly owner_coverage_ratio: number;
  readonly reachability_ratio: number;
  readonly graph_integrity_status: "HEALTHY" | "PARTIAL" | "BLOCKED";
  readonly dependency_cycles: number;
  readonly dangling_references: readonly {
    readonly from: string;
    readonly to: string;
    readonly relation: string;
  }[];
  readonly orphan_artifacts: readonly string[];
  readonly orphan_capability_classification: readonly {
    readonly capability_id: string;
    readonly classification:
      "ACTIVE_WAITING_COMPOSITION" | "PLANNED" | "RETIRED";
    readonly reason: string;
  }[];
  readonly dead_capabilities: readonly string[];
  readonly unused_capabilities: readonly string[];
  readonly unreachable_capabilities: readonly string[];
  readonly duplicate_signatures: readonly {
    readonly left: string;
    readonly right: string;
    readonly similarity: number;
  }[];
  readonly claim_boundary: string;
};

export type CapabilityDependencyConstitutionLawId =
  | "DependencyExistenceLaw"
  | "CapabilityIsolationLaw"
  | "ConsumerDeclarationLaw"
  | "ContractCompatibilityLaw"
  | "DependencyCycleLaw"
  | "CapabilityBoundaryLaw"
  | "DependencyPolicyLaw";

export type CapabilityDependencyConstitutionFinding = {
  readonly law_id: CapabilityDependencyConstitutionLawId;
  readonly capability_id: string;
  readonly dependency_id: string | null;
  readonly contract_name: string | null;
  readonly status: "PASS" | "FAIL";
  readonly detail: string;
};

export type CapabilityDependencyConstitutionLawResult = {
  readonly law_id: CapabilityDependencyConstitutionLawId;
  readonly status: "PASS" | "FAIL";
  readonly passed: number;
  readonly failed: number;
  readonly claim_boundary: string;
};

export type CapabilityDependencyConstitutionReport = {
  readonly constitutional_version: string;
  readonly constitutional_digest: string;
  readonly summary: {
    readonly total_capabilities: number;
    readonly internal_dependencies: number;
    readonly external_dependencies: number;
    readonly missing_dependencies: number;
    readonly api_runtime_violations: number;
    readonly consumer_mismatches: number;
    readonly satisfied_contract_requirements: number;
    readonly unsatisfied_contract_requirements: number;
    readonly dependency_cycles: number;
    readonly boundary_violations: number;
    readonly dependency_policy_violations: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly internal_dependency_edges: readonly {
    readonly from: string;
    readonly to: string;
  }[];
  readonly external_dependencies: readonly {
    readonly capability_id: string;
    readonly dependency_id: string;
    readonly classification:
      | "core_package"
      | "workspace_package"
      | "unknown_repository_dependency";
  }[];
  readonly law_results: readonly CapabilityDependencyConstitutionLawResult[];
  readonly findings: readonly CapabilityDependencyConstitutionFinding[];
  readonly claim_boundary: string;
};

export type ContractVersionRegistryProvider = {
  readonly capability_id: string;
  readonly version: string;
  readonly manifest_ref: string;
  readonly stability: CapabilityManifestStability;
};

export type ContractVersionRegistryCompatibleProvider = {
  readonly capability_id: string;
  readonly version: string;
};

export type ContractVersionRangePolicyStatus =
  | "PINNED_VERSION"
  | "PINNED_MAJOR"
  | "BOUNDED"
  | "UNBOUNDED"
  | "INVALID";

export type ContractVersionRegistryConsumer = {
  readonly capability_id: string;
  readonly range: string;
  readonly declared_dependency_ids: readonly string[];
  readonly compatible_providers: readonly ContractVersionRegistryCompatibleProvider[];
  readonly compatible_provider_count: number;
  readonly provider_resolution_status: "DETERMINISTIC" | "AMBIGUOUS" | "UNRESOLVED";
  readonly range_policy_status: ContractVersionRangePolicyStatus;
  readonly range_policy_detail: string;
  readonly status: "PASS" | "FAIL";
};

export type ContractVersionRegistryEntry = {
  readonly contract_name: string;
  readonly provider_count: number;
  readonly consumer_count: number;
  readonly declared_versions: readonly string[];
  readonly declared_major_versions: readonly number[];
  readonly stable_provider_count: number;
  readonly pinned_consumer_count: number;
  readonly unbounded_consumer_count: number;
  readonly ambiguous_consumer_count: number;
  readonly providers: readonly ContractVersionRegistryProvider[];
  readonly consumers: readonly ContractVersionRegistryConsumer[];
  readonly overall_status: "PASS" | "FAIL";
};

export type ContractVersionRegistryReport = {
  readonly registry_version: string;
  readonly registry_digest: string;
  readonly summary: {
    readonly total_contracts: number;
    readonly provider_bindings: number;
    readonly consumer_requirements: number;
    readonly satisfied_requirements: number;
    readonly unsatisfied_requirements: number;
    readonly multi_major_contracts: number;
    readonly pinned_consumer_requirements: number;
    readonly unbounded_consumer_requirements: number;
    readonly ambiguous_provider_bindings: number;
    readonly stable_contracts_with_multi_major: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly contracts: readonly ContractVersionRegistryEntry[];
  readonly claim_boundary: string;
};

export type CapabilityCertificationDimensionStatus =
  | "PASS"
  | "FAIL"
  | "UNVERIFIED"
  | "NOT_APPLICABLE";

export type CapabilityCertificationDimension = {
  readonly status: CapabilityCertificationDimensionStatus;
  readonly detail: string;
};

export type CapabilityPerformanceCertificationInput = {
  readonly capability_id: string;
  readonly evidence_kind: "materialization" | "runtime_execution";
  readonly metrics_digest?: string | null;
  readonly freshness_ms?: number;
  readonly generation_duration_ms?: number;
  readonly consumer_count?: number;
  readonly runtime_status?: "DECLARED" | "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
  readonly invocation_count?: number;
  readonly success_count?: number;
  readonly failure_count?: number;
  readonly reproducible_operation_count?: number;
};

export type CapabilityCertificationEntry = {
  readonly capability_id: string;
  readonly manifest_ref: string;
  readonly stability: CapabilityManifestStability;
  readonly certification_status: "CERTIFIED" | "PARTIAL" | "FAILED";
  readonly dependency_valid: CapabilityCertificationDimension;
  readonly contract_valid: CapabilityCertificationDimension;
  readonly provider_valid: CapabilityCertificationDimension;
  readonly compatibility_valid: CapabilityCertificationDimension;
  readonly performance_valid: CapabilityCertificationDimension;
};

export type CapabilityCertificationReport = {
  readonly certification_version: string;
  readonly certification_digest: string;
  readonly summary: {
    readonly total_capabilities: number;
    readonly certified_capabilities: number;
    readonly partial_capabilities: number;
    readonly failed_capabilities: number;
    readonly performance_evaluated_capabilities: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly capabilities: readonly CapabilityCertificationEntry[];
  readonly claim_boundary: string;
};

type OrphanCapabilityClassification =
  ArtifactGraphHealthReport["orphan_capability_classification"][number]["classification"];

export type CapabilityDiscoveryCandidate = {
  readonly id: string;
  readonly name: string;
  readonly lifecycle_stage: LifecycleStage;
  readonly governance_status: GovernanceStatus;
  readonly consumers: readonly string[];
  readonly empirically_verified_products: readonly string[];
  readonly similarity: number;
};

export type CapabilityDiscoveryReport = {
  readonly query: string;
  readonly query_tokens: readonly string[];
  readonly status: "REUSE_AVAILABLE" | "CREATE_ALLOWED";
  readonly top_candidate: CapabilityDiscoveryCandidate | null;
  readonly candidates: readonly CapabilityDiscoveryCandidate[];
  readonly rule: string;
};

export type CapabilityPlanningReport = {
  readonly query: string;
  readonly query_tokens: readonly string[];
  readonly decision: "REUSE_REQUIRED" | "CREATION_ALLOWED";
  readonly blocking_candidate: CapabilityDiscoveryCandidate | null;
  readonly candidates: readonly CapabilityDiscoveryCandidate[];
  readonly registry_artifact_count: number;
  readonly registry_claim_boundary: string;
  readonly rule: string;
  readonly claim_boundary: string;
};

export type ExecutionGraphNode = {
  readonly id: string;
  readonly artifact_type:
    ArtifactRegistryEntry["artifact_type"] | "capability_contract" | "evidence";
  readonly label: string;
  readonly governance_status:
    ArtifactRegistryEntry["governance_status"] | "DERIVED";
  readonly owner: string | null;
  readonly lifecycle_stage: LifecycleStage | null;
  readonly discovery_signature: readonly string[];
  readonly planner_edges: readonly string[];
  readonly runtime_edges: readonly string[];
  readonly verification_edges: readonly string[];
  readonly composition_edges: readonly string[];
  readonly evidence_edges: readonly string[];
  readonly execution_status:
    "DECLARED" | "OBSERVED" | "VERIFIED" | "REPRODUCIBLE" | null;
};

export type ExecutionGraphEdge = {
  readonly edge_id: string;
  readonly edge_digest: string;
  readonly from: string;
  readonly to: string;
  readonly topology_layer: "declared" | "observed";
  readonly edge_type:
    | "provides"
    | "composition"
    | "planner"
    | "runtime"
    | "verification"
    | "evidence"
    | "replay";
  readonly claim_status: "DECLARED" | "OBSERVED" | "VERIFIED";
  readonly lifecycle_state:
    | "DECLARED"
    | "ACTIVE"
    | "EXECUTED"
    | "VERIFIED"
    | "REPLAYABLE"
    | "SUPERSEDED";
  readonly declared: boolean;
  readonly observed: boolean;
  readonly created_by_chain: string | null;
  readonly plan_instance_id: string | null;
  readonly source_kind:
    | "artifact_registry"
    | "execution_chain"
    | "execution_evidence"
    | "runtime_reference"
    | "verification_reference"
    | "planner_signature";
  readonly source_ref: string;
  readonly evidence_ref: string | null;
};

export type ExecutionGraphReport = {
  readonly projection_id: string;
  readonly projection_type: "ExecutionGraphProjection";
  readonly schema_version: string;
  readonly constitutional_version: string;
  readonly declared_graph_digest: string;
  readonly execution_chain_digest: string;
  readonly constitutional_digest: string;
  readonly constitutional_claims: {
    readonly deterministic: true;
    readonly immutable: true;
    readonly chain_only_operational_edges: true;
    readonly registry_only_declared_edges: true;
  };
  readonly graph_version: string;
  readonly projection_version: string;
  readonly projection_digest: string;
  readonly generated_from: readonly {
    readonly source_type:
      | "artifact_registry"
      | "execution_chain"
      | "execution_evidence"
      | "runtime_reference"
      | "verification_reference"
      | "planner_signature";
    readonly source_ref: string;
    readonly source_digest: string;
  }[];
  readonly generated_at_utc: string;
  readonly nodes: readonly ExecutionGraphNode[];
  readonly edges: readonly ExecutionGraphEdge[];
  readonly summary: {
    readonly total_nodes: number;
    readonly total_edges: number;
    readonly declared_edges: number;
    readonly observed_edges: number;
    readonly capability_nodes: number;
    readonly product_nodes: number;
    readonly evidence_nodes: number;
    readonly planner_edges: number;
    readonly runtime_edges: number;
    readonly verification_edges: number;
    readonly composition_edges: number;
    readonly evidence_edges: number;
  };
  readonly claim_boundary: string;
};

export type ExecutionGraphFitnessReport = {
  readonly fitness_status: "HEALTHY" | "PARTIAL" | "BLOCKED";
  readonly connectivity_ratio: number;
  readonly execution_reachability_ratio: number;
  readonly orphan_nodes: number;
  readonly dead_nodes: number;
  readonly dependency_cycles: number;
  readonly duplicate_capability_candidates: number;
  readonly planner_coverage_ratio: number;
  readonly runtime_coverage_ratio: number;
  readonly verification_coverage_ratio: number;
  readonly replay_stability_ratio: number;
  readonly core_delta_status: "UNVERIFIED";
  readonly claim_boundary: string;
};

export type RepositoryRegistryOptions = {
  readonly eosRoot: string;
  readonly workspaceRoot: string;
  readonly enterpriseRoot: string;
  readonly capabilitiesRoot: string;
};

type LoadedProduct = {
  readonly id: string;
  readonly manifest_ref: string | null;
  readonly capabilities: readonly string[];
};

const CapabilityContractVersionSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
});

const CapabilityContractRequirementSchema = z.object({
  name: z.string().min(1),
  range: z.string().min(1),
});

const CapabilityManifestSchema = z
  .object({
    manifest_version: z.union([z.string().min(1), z.number()]).optional(),
    exports: z.array(z.string().min(1)).optional(),
    depends_on: z.array(z.string().min(1)).optional(),
    allowed_dependencies: z.array(z.string().min(1)).optional(),
    forbidden_dependencies: z.array(z.string().min(1)).optional(),
    consumed_by: z.array(z.string().min(1)).optional(),
    stability: z.enum(["experimental", "stable", "deprecated"]).optional(),
    contracts: z
      .object({
        provides: z.array(CapabilityContractVersionSchema).optional(),
        requires: z.array(CapabilityContractRequirementSchema).optional(),
      })
      .optional(),
  })
  .passthrough();

type ParsedCapabilityManifestMetadata = {
  readonly manifest_version: string;
  readonly declared_exports: readonly string[];
  readonly declared_dependencies: readonly string[];
  readonly dependency_policy: CapabilityDependencyPolicy;
  readonly declared_consumers: readonly string[];
  readonly stability: CapabilityManifestStability;
  readonly provided_contract_versions: readonly CapabilityContractVersion[];
  readonly required_contract_ranges: readonly CapabilityContractRequirement[];
};

function readYamlFile<T>(path: string): T {
  return yaml.parse(readFileSync(path, "utf8")) as T;
}

function relativeToRepo(eosRoot: string, path: string): string {
  return path.replace(`${eosRoot}/`, "");
}

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

const DISCOVERY_STOPWORDS = new Set([
  "capability",
  "capabilities",
  "composition",
  "definition",
  "default",
  "entry",
  "experience",
  "implementation",
  "index",
  "manifest",
  "service",
  "services",
  "src",
  "test",
  "tests",
  "ts",
  "tsx",
  "view",
  "workspace",
  "yaml",
]);

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

function normalizeToken(token: string): string {
  const trimmed = token.trim().toLowerCase();
  if (trimmed.endsWith("ies") && trimmed.length > 3) {
    return `${trimmed.slice(0, -3)}y`;
  }
  if (trimmed.endsWith("s") && trimmed.length > 3) {
    return trimmed.slice(0, -1);
  }
  return trimmed;
}

function tokenize(value: string): readonly string[] {
  return unique(
    value
      .toLowerCase()
      .split(/[^a-z0-9]+/g)
      .map(normalizeToken)
      .filter((token) => token.length > 1 && !DISCOVERY_STOPWORDS.has(token)),
  );
}

function sha256Digest(value: unknown): string {
  return DigestEngine.digest(value);
}

function similarity(left: readonly string[], right: readonly string[]): number {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const union = new Set([...leftSet, ...rightSet]);
  const intersection = [...leftSet].filter((token) =>
    rightSet.has(token),
  ).length;
  return union.size === 0 ? 0 : Number((intersection / union.size).toFixed(4));
}

function parseCapabilityEntries(serialized: string): readonly string[] {
  return serialized
    .split(",")
    .map((entry) => entry.trim().replaceAll(/["']/g, ""))
    .filter((entry) => entry.length > 0);
}

function escapeRegex(value: string): string {
  return value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readWorkspaceCapabilities(path: string): readonly string[] {
  const sources = [path, resolve(dirname(path), "workspace.binding.ts")].filter(
    (candidate, index, all) =>
      all.indexOf(candidate) === index && existsSync(candidate),
  );

  for (const sourcePath of sources) {
    const source = readFileSync(sourcePath, "utf8");
    const match = source.match(/capabilities:\s*\[([^\]]+)\]/m);
    if (!match?.[1]) {
      continue;
    }

    const entries = parseCapabilityEntries(match[1]);
    if (entries.length === 1 && entries[0]?.startsWith("...")) {
      const arrayRef = entries[0].slice(3);
      const arrayMatch = source.match(
        new RegExp(
          `const\\s+${escapeRegex(arrayRef)}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s+as const`,
          "m",
        ),
      );
      if (arrayMatch?.[1]) {
        return unique(parseCapabilityEntries(arrayMatch[1]));
      }
    }

    return unique(entries);
  }

  return [];
}

function collectProducts(
  workspaceRoot: string,
  productIds: readonly string[],
): readonly LoadedProduct[] {
  return productIds.map((productId) => {
    const manifestPath = resolve(
      workspaceRoot,
      `apps/${productId}/workspace.manifest.ts`,
    );
    return {
      id: productId,
      manifest_ref: existsSync(manifestPath) ? manifestPath : null,
      capabilities: existsSync(manifestPath)
        ? readWorkspaceCapabilities(manifestPath)
        : [],
    };
  });
}

function hasVerificationEvidence(
  workspaceRoot: string,
  productId: string,
): boolean {
  const evidenceDir = resolve(
    workspaceRoot,
    `products/${productId}/evidence/verification`,
  );
  return existsSync(resolve(evidenceDir, "verification-summary.md"));
}

function countFiles(path: string): number {
  if (!existsSync(path)) {
    return 0;
  }
  return readdirSync(path, { withFileTypes: true }).reduce((count, entry) => {
    const fullPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      return count + countFiles(fullPath);
    }
    return count + 1;
  }, 0);
}

function listFilesRecursively(path: string): readonly string[] {
  if (!existsSync(path)) {
    return [];
  }
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = resolve(path, entry.name);
    if (entry.isDirectory()) {
      return listFilesRecursively(fullPath);
    }
    return [fullPath];
  });
}

function readOptionalText(path: string): string {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function deriveLifecycleStage(input: {
  readonly declaredConsumers: readonly string[];
  readonly empiricallyVerifiedProducts: readonly string[];
}): LifecycleStage {
  if (input.empiricallyVerifiedProducts.length >= 3) {
    return "foundation";
  }
  if (input.declaredConsumers.length >= 3) {
    return "core";
  }
  if (input.declaredConsumers.length >= 2) {
    return "reusable";
  }
  return "experimental";
}

function deriveOwnerRequirementStatus(
  lifecycleStage: LifecycleStage,
  ownerMissing: boolean,
): CapabilityRegistryEntry["owner_requirement_status"] {
  if (lifecycleStage === "experimental") {
    return "OPTIONAL";
  }
  if (ownerMissing) {
    return "REQUIRED_MISSING";
  }
  return "REQUIRED_PRESENT";
}

function deriveGovernanceStatus(
  lifecycleStage: LifecycleStage,
  ownerMissing: boolean,
): GovernanceStatus {
  if (lifecycleStage === "experimental") {
    return "VALID";
  }
  return ownerMissing ? "INVALID" : "VALID";
}

function loadCapabilityManifest(capabilityDir: string): {
  readonly path: string;
  readonly raw: Record<string, unknown>;
} | null {
  const candidatePaths = [
    resolve(capabilityDir, "definition/capability.yaml"),
    resolve(capabilityDir, "capability.yaml"),
  ];

  for (const candidatePath of candidatePaths) {
    if (existsSync(candidatePath)) {
      return {
        path: candidatePath,
        raw: readYamlFile<Record<string, unknown>>(candidatePath),
      };
    }
  }

  return null;
}

function parseCapabilityManifestMetadata(
  raw: Record<string, unknown>,
): ParsedCapabilityManifestMetadata {
  const parsed = CapabilityManifestSchema.parse(raw);
  return {
    manifest_version: String(parsed.manifest_version ?? "1.0.0"),
    declared_exports: unique(parsed.exports ?? []),
    declared_dependencies: unique(parsed.depends_on ?? []),
    dependency_policy: {
      allowed_dependencies: unique(parsed.allowed_dependencies ?? []),
      forbidden_dependencies: unique(parsed.forbidden_dependencies ?? []),
    },
    declared_consumers: unique(parsed.consumed_by ?? []),
    stability: parsed.stability ?? "experimental",
    provided_contract_versions: unique(
      (parsed.contracts?.provides ?? []).map(
        (contract) => `${contract.name}@${contract.version}`,
      ),
    ).map((entry) => {
      const [name, version] = entry.split("@");
      return {
        name: name ?? "",
        version: version ?? "",
      };
    }),
    required_contract_ranges: unique(
      (parsed.contracts?.requires ?? []).map(
        (contract) => `${contract.name}@@${contract.range}`,
      ),
    ).map((entry) => {
      const [name, range] = entry.split("@@");
      return {
        name: name ?? "",
        range: range ?? "",
      };
    }),
  };
}

function buildSignature(input: {
  readonly id: string;
  readonly name: string;
  readonly purpose: string;
  readonly runtimeRef: string | null;
  readonly composerRef: string | null;
  readonly verificationRef: string | null;
}): readonly string[] {
  return unique([
    ...tokenize(input.id),
    ...tokenize(input.name),
    ...tokenize(input.purpose),
    ...tokenize(input.runtimeRef ?? ""),
    ...tokenize(input.composerRef ?? ""),
    ...tokenize(input.verificationRef ?? ""),
  ]);
}

function normalizeProvidedCapabilities(
  raw: Record<string, unknown>,
  legacyCapability: Record<string, unknown> | null,
): readonly string[] {
  const fromRoot = Array.isArray(raw.provides)
    ? (raw.provides as readonly unknown[]).map(String)
    : [];
  const fromLegacy = Array.isArray(legacyCapability?.provides)
    ? (legacyCapability?.provides as readonly unknown[]).map(String)
    : [];
  return unique([...fromRoot, ...fromLegacy]);
}

function resolveCapabilityId(
  capabilityIndex: ReadonlyMap<string, CapabilityRegistryEntry>,
  capabilityId: string,
): string {
  if (capabilityIndex.has(capabilityId)) {
    return capabilityId;
  }
  for (const capability of capabilityIndex.values()) {
    if (capability.provided_capabilities.includes(capabilityId)) {
      return capability.id;
    }
  }
  return capabilityId;
}

function collectReachableProducts(
  workspaceRoot: string,
  capabilityDirName: string,
): readonly string[] {
  const appsRoot = resolve(workspaceRoot, "apps");
  const productDirs = readdirSync(appsRoot, { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  );
  return productDirs
    .filter((entry) => {
      const productRoot = resolve(appsRoot, entry.name);
      const files = [
        ...listFilesRecursively(resolve(productRoot, "app")),
        ...listFilesRecursively(resolve(productRoot, "tests")),
      ];
      const readmePath = resolve(productRoot, "README.md");
      if (existsSync(readmePath)) {
        files.push(readmePath);
      }
      return files.some((filePath) =>
        readOptionalText(filePath).includes(
          `/capabilities/${capabilityDirName}/`,
        ),
      );
    })
    .map((entry) => entry.name)
    .sort();
}

function collectWorkspacePackageIds(workspaceRoot: string): readonly string[] {
  const packageRoots = [
    resolve(workspaceRoot, "packages/core"),
    resolve(workspaceRoot, "packages/presentation"),
    resolve(workspaceRoot, "packages/tooling"),
    resolve(workspaceRoot, "packages"),
  ];
  const discovered = new Set<string>();

  for (const packageRoot of packageRoots) {
    if (!existsSync(packageRoot)) {
      continue;
    }
    const entries = readdirSync(packageRoot, { withFileTypes: true }).filter(
      (entry) => entry.isDirectory(),
    );
    for (const entry of entries) {
      const packageJsonPath = resolve(packageRoot, entry.name, "package.json");
      if (!existsSync(packageJsonPath)) {
        continue;
      }
      try {
        const raw = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
          readonly name?: unknown;
        };
        if (
          typeof raw.name === "string" &&
          raw.name.startsWith("@repo/") &&
          raw.name.length > "@repo/".length
        ) {
          discovered.add(raw.name.slice("@repo/".length));
        }
      } catch {
        // Ignore malformed package manifests here; verification will surface it elsewhere.
      }
    }
  }

  return [...discovered].sort();
}

type ParsedVersion = {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
};

function parseVersion(version: string): ParsedVersion | null {
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(version.trim());
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2] ?? 0),
    patch: Number(match[3] ?? 0),
  };
}

function compareVersions(left: ParsedVersion, right: ParsedVersion): number {
  if (left.major !== right.major) {
    return left.major > right.major ? 1 : -1;
  }
  if (left.minor !== right.minor) {
    return left.minor > right.minor ? 1 : -1;
  }
  if (left.patch !== right.patch) {
    return left.patch > right.patch ? 1 : -1;
  }
  return 0;
}

function satisfiesVersionRange(version: string, range: string): boolean {
  const parsedVersion = parseVersion(version);
  if (parsedVersion === null) {
    return false;
  }
  const comparators = range
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (comparators.length === 0) {
    return false;
  }

  return comparators.every((comparator) => {
    const match = /^(<=|>=|<|>|=)?(\d+(?:\.\d+){0,2})$/.exec(comparator);
    if (!match) {
      return false;
    }
    const operator = match[1] ?? "=";
    const parsedComparator = parseVersion(match[2] ?? "");
    if (parsedComparator === null) {
      return false;
    }
    const order = compareVersions(parsedVersion, parsedComparator);
    switch (operator) {
      case ">":
        return order > 0;
      case ">=":
        return order >= 0;
      case "<":
        return order < 0;
      case "<=":
        return order <= 0;
      case "=":
        return order === 0;
      default:
        return false;
    }
  });
}

export function buildCapabilityRegistryModel(
  options: RepositoryRegistryOptions,
): CapabilityRegistryReport {
  const portfolio = readYamlFile<ProductPortfolio>(
    resolve(options.enterpriseRoot, "specifications/PRODUCT-PORTFOLIO.yaml"),
  );
  const declaredProducts =
    portfolio.products?.map((product) => product.id) ?? [];
  const loadedProducts = collectProducts(
    options.workspaceRoot,
    declaredProducts,
  );
  const productCapabilities = Object.fromEntries(
    loadedProducts.map((product) => [product.id, product.capabilities]),
  );
  const capabilityDirs = readdirSync(options.capabilitiesRoot, {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(options.capabilitiesRoot, entry.name))
    .sort();

  const capabilities = capabilityDirs
    .map((capabilityDir) => {
      const manifest = loadCapabilityManifest(capabilityDir);
      if (!manifest) {
        return null;
      }

      const raw = manifest.raw;
      const legacyCapability =
        (raw.capability as Record<string, unknown> | undefined) ?? null;
      const manifestMetadata = parseCapabilityManifestMetadata(raw);
      const id = String(
        raw.id ?? legacyCapability?.name ?? basename(capabilityDir),
      );
      const name = String(raw.name ?? legacyCapability?.name ?? id);
      const providedCapabilities = normalizeProvidedCapabilities(
        raw,
        legacyCapability,
      );
      const version = String(raw.version ?? "0.1.0-unversioned");
      const owner = String(
        raw.owner ?? legacyCapability?.owner ?? "unassigned",
      );
      const purpose = String(raw.purpose ?? legacyCapability?.purpose ?? "");
      const status = String(
        raw.status ??
          (raw.lifecycle as Record<string, unknown> | undefined)?.state ??
          "ACTIVE",
      ).toUpperCase();
      const introduced = raw.introduced ? String(raw.introduced) : null;
      const deprecated = raw.deprecated ? String(raw.deprecated) : null;
      const runtimeRefValue =
        ((raw.implementation as Record<string, unknown> | undefined)?.entry as
          string | undefined) ?? null;
      const runtimeRef = runtimeRefValue
        ? relativeToRepo(
            options.eosRoot,
            resolve(capabilityDir, runtimeRefValue),
          )
        : null;
      const composerRef = existsSync(resolve(capabilityDir, "composition"))
        ? relativeToRepo(options.eosRoot, resolve(capabilityDir, "composition"))
        : null;
      const verificationRef = existsSync(resolve(capabilityDir, "tests"))
        ? relativeToRepo(options.eosRoot, resolve(capabilityDir, "tests"))
        : null;
      const legacyConsumers = Array.isArray(legacyCapability?.consumers)
        ? (legacyCapability?.consumers as readonly unknown[]).map(String)
        : [];
      const portfolioConsumers = (portfolio.products ?? [])
        .filter(
          (product) =>
            (product.shared_capabilities ?? []).includes(id) ||
            providedCapabilities.some((provided) =>
              (product.shared_capabilities ?? []).includes(provided),
            ),
        )
        .map((product) => product.id);
      const manifestConsumers = Object.entries(productCapabilities)
        .filter(
          ([, capabilityIds]) =>
            capabilityIds.includes(id) ||
            providedCapabilities.some((provided) =>
              capabilityIds.includes(provided),
            ),
        )
        .map(([productId]) => productId);
      const reachableProducts = collectReachableProducts(
        options.workspaceRoot,
        basename(capabilityDir),
      );
      const consumers = unique([
        ...legacyConsumers,
        ...portfolioConsumers,
        ...manifestConsumers,
      ]);
      const empiricallyVerifiedProducts = consumers.filter((productId) =>
        hasVerificationEvidence(options.workspaceRoot, productId),
      );
      const lifecycleStage = deriveLifecycleStage({
        declaredConsumers: consumers,
        empiricallyVerifiedProducts,
      });
      const ownerMissing = owner === "unassigned";

      const entry: CapabilityRegistryEntry = {
        id,
        name,
        provided_capabilities: providedCapabilities,
        manifest_version: manifestMetadata.manifest_version,
        version,
        owner,
        status,
        stability: manifestMetadata.stability,
        lifecycle_stage: lifecycleStage,
        governance_status: deriveGovernanceStatus(lifecycleStage, ownerMissing),
        owner_requirement_status: deriveOwnerRequirementStatus(
          lifecycleStage,
          ownerMissing,
        ),
        introduced,
        deprecated,
        manifest_ref: relativeToRepo(options.eosRoot, manifest.path),
        runtime_ref: runtimeRef,
        planner_ref: null,
        composer_ref: composerRef,
        verification_ref: verificationRef,
        declared_exports: manifestMetadata.declared_exports,
        declared_dependencies: manifestMetadata.declared_dependencies,
        dependency_policy: manifestMetadata.dependency_policy,
        consumers,
        declared_consumers: manifestMetadata.declared_consumers,
        provided_contract_versions: manifestMetadata.provided_contract_versions,
        required_contract_ranges: manifestMetadata.required_contract_ranges,
        empirically_verified_products: empiricallyVerifiedProducts,
        product_reach_ratio: ratio(consumers.length, declaredProducts.length),
        reachable_from_products: reachableProducts,
        reachability_status:
          consumers.length > 0 || reachableProducts.length > 0
            ? "REACHABLE"
            : "UNREACHABLE",
        implementation_files: countFiles(
          resolve(capabilityDir, "implementation"),
        ),
        test_files: countFiles(resolve(capabilityDir, "tests")),
        owner_missing: ownerMissing,
        discovery_signature: buildSignature({
          id,
          name,
          purpose,
          runtimeRef,
          composerRef,
          verificationRef,
        }),
      };
      return entry;
    })
    .filter((entry): entry is CapabilityRegistryEntry => entry !== null);

  const duplicateCandidates: DuplicateCandidate[] = [];
  for (let index = 0; index < capabilities.length; index += 1) {
    const left = capabilities[index];
    if (!left) {
      continue;
    }
    for (let offset = index + 1; offset < capabilities.length; offset += 1) {
      const right = capabilities[offset];
      if (!right) {
        continue;
      }
      const score = similarity(
        left.discovery_signature,
        right.discovery_signature,
      );
      if (score >= 0.5) {
        duplicateCandidates.push({
          left: left.id,
          right: right.id,
          similarity: score,
          recommendation: `Investigate reuse before creating a new capability. Prefer ${left.id} or ${right.id} unless semantic difference is proven.`,
        });
      }
    }
  }

  const lifecycleCounts = capabilities.reduce<Record<string, number>>(
    (accumulator, capability) => {
      accumulator[capability.lifecycle_stage] =
        (accumulator[capability.lifecycle_stage] ?? 0) + 1;
      return accumulator;
    },
    {},
  );

  return {
    summary: {
      total_capabilities: capabilities.length,
      with_owner: capabilities.filter((capability) => !capability.owner_missing)
        .length,
      owner_missing: capabilities.filter(
        (capability) => capability.owner_missing,
      ).length,
      invalid_capabilities: capabilities.filter(
        (capability) => capability.governance_status === "INVALID",
      ).length,
      duplicate_candidates: duplicateCandidates.length,
      lifecycle_counts: lifecycleCounts,
      declared_products: declaredProducts.length,
    },
    capabilities,
    duplicate_candidates: duplicateCandidates,
    rule: "Everything is discovered before it is composed, and everything is composed before it is created.",
  };
}

export function buildArtifactGraph(
  options: RepositoryRegistryOptions,
  registry: CapabilityRegistryReport,
): ArtifactGraphReport {
  const portfolio = readYamlFile<ProductPortfolio>(
    resolve(options.enterpriseRoot, "specifications/PRODUCT-PORTFOLIO.yaml"),
  );
  const loadedProducts = collectProducts(
    options.workspaceRoot,
    portfolio.products?.map((product) => product.id) ?? [],
  );
  const capabilityIndex = new Map(
    registry.capabilities.map((capability) => [capability.id, capability]),
  );

  const productNodes: readonly ArtifactNode[] = loadedProducts.map(
    (product) => ({
      id: `product:${product.id}`,
      type: "product",
      label: product.id,
      manifest_ref: product.manifest_ref
        ? relativeToRepo(options.eosRoot, product.manifest_ref)
        : null,
      governance_status: product.manifest_ref ? "UNVERIFIED" : "INVALID",
    }),
  );

  const capabilityNodes: readonly ArtifactNode[] = registry.capabilities.map(
    (capability) => ({
      id: `capability:${capability.id}`,
      type: "capability",
      label: capability.name,
      manifest_ref: capability.manifest_ref,
      governance_status: capability.governance_status,
    }),
  );

  const productEdges: readonly ArtifactEdge[] = loadedProducts.flatMap(
    (product) =>
      product.capabilities.map((capabilityId) => ({
        from: `product:${product.id}`,
        to: `capability:${resolveCapabilityId(capabilityIndex, capabilityId)}`,
        relation: "uses" as const,
      })),
  );

  const declaredEdges: readonly ArtifactEdge[] = (
    portfolio.products ?? []
  ).flatMap((product) =>
    (product.shared_capabilities ?? []).map((capabilityId) => ({
      from: `product:${product.id}`,
      to: `capability:${resolveCapabilityId(capabilityIndex, capabilityId)}`,
      relation: "declares" as const,
    })),
  );

  const dependencyEdges: readonly ArtifactEdge[] = registry.capabilities.flatMap(
    (capability) =>
      capability.declared_dependencies
        .map((dependencyId) => resolveCapabilityId(capabilityIndex, dependencyId))
        .filter((dependencyId) => capabilityIndex.has(dependencyId))
        .map((dependencyId) => ({
          from: `capability:${capability.id}`,
          to: `capability:${dependencyId}`,
          relation: "depends_on" as const,
        })),
  );

  const edges = [...productEdges, ...declaredEdges, ...dependencyEdges];
  const nodes = [...productNodes, ...capabilityNodes];

  return {
    nodes,
    edges,
    summary: {
      node_count: nodes.length,
      edge_count: edges.length,
      product_nodes: productNodes.length,
      capability_nodes: capabilityNodes.length,
    },
  };
}

export function buildArtifactRegistryModel(
  options: RepositoryRegistryOptions,
  registry: CapabilityRegistryReport,
): ArtifactRegistryReport {
  const portfolio = readYamlFile<ProductPortfolio>(
    resolve(options.enterpriseRoot, "specifications/PRODUCT-PORTFOLIO.yaml"),
  );
  const loadedProducts = collectProducts(
    options.workspaceRoot,
    portfolio.products?.map((product) => product.id) ?? [],
  );
  const capabilityIndex = new Map(
    registry.capabilities.map((capability) => [capability.id, capability]),
  );

  const productArtifacts: readonly ArtifactRegistryEntry[] = loadedProducts.map(
    (product): ArtifactRegistryEntry => ({
      id: `product:${product.id}`,
      artifact_type: "product",
      label: product.id,
      manifest_ref: product.manifest_ref
        ? relativeToRepo(options.eosRoot, product.manifest_ref)
        : null,
      governance_status: product.manifest_ref ? "UNVERIFIED" : "INVALID",
      owner: null,
      manifest_version: null,
      stability: null,
      lifecycle_stage: null,
      owner_requirement_status: null,
      declared_exports: [],
      declared_dependencies: [],
      dependency_policy: null,
      consumers: [],
      declared_consumers: [],
      provided_contract_versions: [],
      required_contract_ranges: [],
      empirically_verified_products: [],
      product_reach_ratio: null,
      reachable_from_products: [],
      reachability_status: null,
      runtime_ref: null,
      planner_ref: null,
      composer_ref: null,
      verification_ref: null,
      discovery_signature: [],
      execution_evidence: null,
      provided_artifacts: [],
      declared_relations: unique(product.capabilities).map((capabilityId) => ({
        relation: "uses" as const,
        target: `capability:${resolveCapabilityId(capabilityIndex, capabilityId)}`,
      })),
    }),
  );

  const capabilityArtifacts: readonly ArtifactRegistryEntry[] =
    registry.capabilities.map((capability): ArtifactRegistryEntry => ({
      id: `capability:${capability.id}`,
      artifact_type: "capability",
      label: capability.name,
      manifest_ref: capability.manifest_ref,
      governance_status: capability.governance_status,
      owner: capability.owner_missing ? null : capability.owner,
      manifest_version: capability.manifest_version,
      stability: capability.stability,
      lifecycle_stage: capability.lifecycle_stage,
      owner_requirement_status: capability.owner_requirement_status,
      declared_exports: capability.declared_exports,
      declared_dependencies: capability.declared_dependencies,
      dependency_policy: capability.dependency_policy,
      consumers: capability.consumers,
      declared_consumers: capability.declared_consumers,
      provided_contract_versions: capability.provided_contract_versions,
      required_contract_ranges: capability.required_contract_ranges,
      empirically_verified_products: capability.empirically_verified_products,
      product_reach_ratio: capability.product_reach_ratio,
      reachable_from_products: capability.reachable_from_products,
      reachability_status: capability.reachability_status,
      runtime_ref: capability.runtime_ref,
      planner_ref: capability.planner_ref,
      composer_ref: capability.composer_ref,
      verification_ref: capability.verification_ref,
      discovery_signature: capability.discovery_signature,
      execution_evidence: null,
      provided_artifacts: unique([
        ...capability.provided_capabilities.map(
          (provided) => `capability_contract:${provided}`,
        ),
        ...capability.provided_contract_versions.map(
          (contract) =>
            `capability_contract:${contract.name}@${contract.version}`,
        ),
      ]),
      declared_relations: [
        ...capability.provided_capabilities.map((provided) => ({
          relation: "provides" as const,
          target: `capability_contract:${provided}`,
        })),
        ...capability.provided_contract_versions.map((contract) => ({
          relation: "provides" as const,
          target: `capability_contract:${contract.name}@${contract.version}`,
        })),
        ...capability.declared_dependencies
          .map((dependencyId) => resolveCapabilityId(capabilityIndex, dependencyId))
          .filter((dependencyId) => capabilityIndex.has(dependencyId))
          .map((dependencyId) => ({
            relation: "depends_on" as const,
            target: `capability:${dependencyId}`,
          })),
      ],
    }));

  const artifacts = [...productArtifacts, ...capabilityArtifacts];

  return {
    summary: {
      total_artifacts: artifacts.length,
      products: productArtifacts.length,
      capabilities: capabilityArtifacts.length,
      with_owner: capabilityArtifacts.filter(
        (artifact) => artifact.owner !== null,
      ).length,
      owner_missing: capabilityArtifacts.filter(
        (artifact) => artifact.owner === null,
      ).length,
    },
    artifacts,
    claim_boundary:
      "Artifact Registry currently models product and capability artifacts from the repository, including declared capability dependencies and contract/provider metadata for planner and verifier consumers. Workflow, policy, integration, surface, and recipe artifacts are not yet ingested as first-class entries.",
  };
}

function buildAdjacency(
  graph: ArtifactGraphReport,
): ReadonlyMap<string, readonly string[]> {
  const map = new Map<string, string[]>();
  for (const node of graph.nodes) {
    map.set(node.id, []);
  }
  for (const edge of graph.edges) {
    const existing = map.get(edge.from) ?? [];
    existing.push(edge.to);
    map.set(edge.from, existing);
  }
  return map;
}

function countCycles(graph: ArtifactGraphReport): number {
  const adjacency = buildAdjacency(graph);
  const permanent = new Set<string>();
  const temporary = new Set<string>();
  let cycles = 0;

  const visit = (nodeId: string): void => {
    if (permanent.has(nodeId)) {
      return;
    }
    if (temporary.has(nodeId)) {
      cycles += 1;
      return;
    }
    temporary.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      visit(neighbor);
    }
    temporary.delete(nodeId);
    permanent.add(nodeId);
  };

  for (const node of graph.nodes) {
    visit(node.id);
  }
  return cycles;
}

function buildCapabilityAdjacency(
  edges: readonly { readonly from: string; readonly to: string }[],
): ReadonlyMap<string, readonly string[]> {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = adjacency.get(edge.from) ?? [];
    existing.push(edge.to);
    adjacency.set(edge.from, existing);
    if (!adjacency.has(edge.to)) {
      adjacency.set(edge.to, []);
    }
  }
  return new Map(
    [...adjacency.entries()].map(([node, neighbors]) => [
      node,
      unique(neighbors),
    ]),
  );
}

function normalizeCapabilityCycle(cycle: readonly string[]): string {
  if (cycle.length === 0) {
    return "";
  }

  let bestRotation = cycle;
  for (let index = 1; index < cycle.length; index += 1) {
    const rotated = [...cycle.slice(index), ...cycle.slice(0, index)];
    if (rotated.join("->").localeCompare(bestRotation.join("->")) < 0) {
      bestRotation = rotated;
    }
  }
  return bestRotation.join("->");
}

function findCapabilityDependencyCycles(
  edges: readonly { readonly from: string; readonly to: string }[],
): readonly (readonly string[])[] {
  const adjacency = buildCapabilityAdjacency(edges);
  const cycles = new Map<string, readonly string[]>();
  const nodes = [...adjacency.keys()].sort();

  const visit = (
    start: string,
    current: string,
    path: readonly string[],
  ): void => {
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === start && path.length > 1) {
        const cycle = [...path];
        cycles.set(normalizeCapabilityCycle(cycle), cycle);
        continue;
      }
      if (path.includes(neighbor)) {
        continue;
      }
      visit(start, neighbor, [...path, neighbor]);
    }
  };

  for (const node of nodes) {
    visit(node, node, [node]);
  }

  return [...cycles.values()].sort((left, right) =>
    left.join("->").localeCompare(right.join("->")),
  );
}

export function buildArtifactGraphHealth(
  registry: CapabilityRegistryReport,
  graph: ArtifactGraphReport,
): ArtifactGraphHealthReport {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const productNodes = graph.nodes.filter((node) => node.type === "product");
  const capabilityNodes = graph.nodes.filter(
    (node) => node.type === "capability",
  );
  const danglingReferences = graph.edges
    .filter((edge) => !nodeIds.has(edge.from) || !nodeIds.has(edge.to))
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      relation: edge.relation,
    }));
  const orphanArtifacts = graph.nodes
    .filter(
      (node) =>
        !graph.edges.some(
          (edge) => edge.from === node.id || edge.to === node.id,
        ),
    )
    .map((node) => node.id)
    .sort();
  const usedCapabilityIds = new Set(
    graph.edges
      .filter((edge) => edge.to.startsWith("capability:"))
      .map((edge) => edge.to.replace(/^capability:/, "")),
  );
  const unusedCapabilities = registry.capabilities
    .filter((capability) => !usedCapabilityIds.has(capability.id))
    .map((capability) => capability.id)
    .sort();
  const unreachableCapabilities = registry.capabilities
    .filter((capability) => capability.reachability_status === "UNREACHABLE")
    .map((capability) => capability.id)
    .sort();
  const orphanCapabilityClassification = registry.capabilities
    .filter((capability) =>
      orphanArtifacts.includes(`capability:${capability.id}`),
    )
    .map((capability) => ({
      capability_id: capability.id,
      classification: (() => {
        const classification: OrphanCapabilityClassification =
          capability.deprecated !== null ||
          capability.status === "ARCHIVED" ||
          capability.status === "RETIRED"
            ? "RETIRED"
            : capability.reachable_from_products.length > 0
              ? "ACTIVE_WAITING_COMPOSITION"
              : "PLANNED";
        return classification;
      })(),
      reason:
        capability.deprecated !== null ||
        capability.status === "ARCHIVED" ||
        capability.status === "RETIRED"
          ? "Capability is marked deprecated/archived and should not remain active in composition."
          : capability.reachable_from_products.length > 0
            ? `Capability is referenced by product runtime/tests (${capability.reachable_from_products.join(", ")}) but not yet declared in composition graph.`
            : "Capability has implementation artifacts but no observed product reachability or composition edge.",
    }))
    .sort((left, right) =>
      left.capability_id.localeCompare(right.capability_id),
    );
  const deadCapabilities = registry.capabilities
    .filter(
      (capability) =>
        capability.empirically_verified_products.length === 0 &&
        capability.consumers.length === 0 &&
        capability.reachable_from_products.length === 0,
    )
    .map((capability) => capability.id)
    .sort();
  const cycleCount = countCycles(graph);
  const ownerCoverageRatio = ratio(
    registry.capabilities.filter((capability) => !capability.owner_missing)
      .length,
    registry.capabilities.length,
  );
  const artifactCoverageRatio = ratio(
    productNodes.filter((node) => node.manifest_ref !== null).length +
      capabilityNodes.filter((node) => node.manifest_ref !== null).length,
    graph.nodes.length,
  );
  const duplicateSignatures = registry.duplicate_candidates.map(
    (candidate) => ({
      left: candidate.left,
      right: candidate.right,
      similarity: candidate.similarity,
    }),
  );
  const reachabilityRatio = ratio(
    registry.capabilities.filter(
      (capability) => capability.reachability_status === "REACHABLE",
    ).length,
    registry.capabilities.length,
  );

  const graphIntegrityStatus =
    cycleCount > 0 || danglingReferences.length > 0
      ? "BLOCKED"
      : orphanArtifacts.length > 0 || unusedCapabilities.length > 0
        ? "PARTIAL"
        : "HEALTHY";
  const registryHealth =
    registry.summary.invalid_capabilities > 0
      ? "BLOCKED"
      : ownerCoverageRatio < 1 || duplicateSignatures.length > 0
        ? "PARTIAL"
        : "HEALTHY";

  return {
    registry_health: registryHealth,
    artifact_coverage_ratio: artifactCoverageRatio,
    owner_coverage_ratio: ownerCoverageRatio,
    reachability_ratio: reachabilityRatio,
    graph_integrity_status: graphIntegrityStatus,
    dependency_cycles: cycleCount,
    dangling_references: danglingReferences,
    orphan_artifacts: orphanArtifacts,
    orphan_capability_classification: orphanCapabilityClassification,
    dead_capabilities: deadCapabilities,
    unused_capabilities: unusedCapabilities,
    unreachable_capabilities: unreachableCapabilities,
    duplicate_signatures: duplicateSignatures,
    claim_boundary:
      "Graph health currently covers product and capability manifests, including declared capability dependency edges, plus direct runtime/test reachability from product code. Workflow, policy, integration, and surface artifacts are not yet ingested as first-class nodes.",
  };
}

export function buildCapabilityDependencyConstitutionReport(
  options: RepositoryRegistryOptions,
  registry: CapabilityRegistryReport,
): CapabilityDependencyConstitutionReport {
  const capabilityIndex = new Map(
    registry.capabilities.map((capability) => [capability.id, capability]),
  );
  const workspacePackages = new Set(collectWorkspacePackageIds(options.workspaceRoot));
  const findings: CapabilityDependencyConstitutionFinding[] = [];
  const internalDependencyEdges: Array<{ from: string; to: string }> = [];
  const externalDependencies: Array<
    CapabilityDependencyConstitutionReport["external_dependencies"][number]
  > = [];

  const lawCounters: Record<
    CapabilityDependencyConstitutionLawId,
    { passed: number; failed: number; claim_boundary: string }
  > = {
    DependencyExistenceLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "Every declared dependency must resolve either to an internal capability or a known workspace package. Unknown dependency identifiers are architecturally invalid.",
    },
    CapabilityIsolationLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "API capabilities may depend on capability providers, but they must not depend directly on workspace core packages such as core-runtime.",
    },
    ConsumerDeclarationLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "When a capability declares consumed_by, each declared consumer must exist and reciprocate the relationship through depends_on.",
    },
    ContractCompatibilityLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "Required capability contracts must be satisfied by at least one declared dependency that provides a compatible contract version.",
    },
    DependencyCycleLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "Capability dependency graphs must remain acyclic. Any cycle between declared capability manifests blocks clean composition and deterministic evolution.",
    },
    CapabilityBoundaryLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "Capability boundaries must preserve provider-consumer direction. Capabilities must not depend on API consumer boundaries, and providers must not depend back on their declared consumers.",
    },
    DependencyPolicyLaw: {
      passed: 0,
      failed: 0,
      claim_boundary:
        "When a capability declares allowed_dependencies or forbidden_dependencies, every declared dependency must comply with that manifest-level policy. This turns dependency intent into an auditable governance contract.",
    },
  };

  const recordFinding = (
    finding: CapabilityDependencyConstitutionFinding,
  ): void => {
    findings.push(finding);
    if (finding.status === "PASS") {
      lawCounters[finding.law_id].passed += 1;
    } else {
      lawCounters[finding.law_id].failed += 1;
    }
  };

  for (const capability of registry.capabilities) {
    const resolvedInternalDependencies = new Set<string>();
    const resolvedDeclaredDependencies = new Set<string>();

    for (const declaredDependency of capability.declared_dependencies) {
      const resolvedDependency = resolveCapabilityId(
        capabilityIndex,
        declaredDependency,
      );
      resolvedDeclaredDependencies.add(
        capabilityIndex.has(resolvedDependency)
          ? resolvedDependency
          : declaredDependency,
      );
      if (capabilityIndex.has(resolvedDependency)) {
        resolvedInternalDependencies.add(resolvedDependency);
        internalDependencyEdges.push({
          from: capability.id,
          to: resolvedDependency,
        });
        recordFinding({
          law_id: "DependencyExistenceLaw",
          capability_id: capability.id,
          dependency_id: resolvedDependency,
          contract_name: null,
          status: "PASS",
          detail: `Declared dependency "${declaredDependency}" resolves to internal capability "${resolvedDependency}".`,
        });
        recordFinding({
          law_id: "CapabilityBoundaryLaw",
          capability_id: capability.id,
          dependency_id: resolvedDependency,
          contract_name: null,
          status:
            resolvedDependency.startsWith("api-") ? "FAIL" : "PASS",
          detail: resolvedDependency.startsWith("api-")
            ? `Capability "${capability.id}" depends on API boundary capability "${resolvedDependency}". API remains the outer consumer boundary and must not be used as an inward dependency.`
            : `Dependency "${capability.id}" -> "${resolvedDependency}" stays within non-API capability boundaries.`,
        });

        const dependencyCapability = capabilityIndex.get(resolvedDependency)!;
        if (dependencyCapability.declared_consumers.length > 0) {
          recordFinding({
            law_id: "ConsumerDeclarationLaw",
            capability_id: resolvedDependency,
            dependency_id: capability.id,
            contract_name: null,
            status: dependencyCapability.declared_consumers.includes(capability.id)
              ? "PASS"
              : "FAIL",
            detail: dependencyCapability.declared_consumers.includes(capability.id)
              ? `Consumer "${capability.id}" is declared by dependency "${resolvedDependency}" and reciprocated through depends_on.`
              : `Dependency "${resolvedDependency}" declares consumed_by=[${dependencyCapability.declared_consumers.join(", ")}], but consumer "${capability.id}" is missing from that list.`,
          });
        }
        continue;
      }

      const classification = workspacePackages.has(declaredDependency)
        ? declaredDependency.startsWith("core-")
          ? "core_package"
          : "workspace_package"
        : "unknown_repository_dependency";
      externalDependencies.push({
        capability_id: capability.id,
        dependency_id: declaredDependency,
        classification,
      });
      recordFinding({
        law_id: "DependencyExistenceLaw",
        capability_id: capability.id,
        dependency_id: declaredDependency,
        contract_name: null,
        status:
          classification === "unknown_repository_dependency" ? "FAIL" : "PASS",
        detail:
          classification === "unknown_repository_dependency"
            ? `Declared dependency "${declaredDependency}" does not resolve to a capability manifest or known workspace package.`
            : `Declared dependency "${declaredDependency}" resolves to workspace package classification "${classification}".`,
      });

      if (
        capability.id.startsWith("api-") &&
        classification === "core_package"
      ) {
        recordFinding({
          law_id: "CapabilityIsolationLaw",
          capability_id: capability.id,
          dependency_id: declaredDependency,
          contract_name: null,
          status: "FAIL",
          detail: `API capability "${capability.id}" depends directly on core package "${declaredDependency}". API must depend on capability providers instead of runtime/core packages.`,
        });
      } else if (capability.id.startsWith("api-")) {
        recordFinding({
          law_id: "CapabilityIsolationLaw",
          capability_id: capability.id,
          dependency_id: declaredDependency,
          contract_name: null,
          status: "PASS",
          detail: `API capability "${capability.id}" does not violate runtime isolation for dependency "${declaredDependency}".`,
        });
      }
    }

    const allowedDependencies = new Set(
      capability.dependency_policy.allowed_dependencies,
    );
    const forbiddenDependencies = new Set(
      capability.dependency_policy.forbidden_dependencies,
    );
    if (
      allowedDependencies.size === 0 &&
      forbiddenDependencies.size === 0
    ) {
      recordFinding({
        law_id: "DependencyPolicyLaw",
        capability_id: capability.id,
        dependency_id: null,
        contract_name: null,
        status: "PASS",
        detail: `Capability "${capability.id}" does not declare manifest-level dependency policy yet.`,
      });
    } else {
      for (const resolvedDependency of [...resolvedDeclaredDependencies].sort()) {
        const violatesAllowed =
          allowedDependencies.size > 0 &&
          !allowedDependencies.has(resolvedDependency);
        const violatesForbidden = forbiddenDependencies.has(resolvedDependency);
        recordFinding({
          law_id: "DependencyPolicyLaw",
          capability_id: capability.id,
          dependency_id: resolvedDependency,
          contract_name: null,
          status:
            violatesAllowed || violatesForbidden ? "FAIL" : "PASS",
          detail: violatesForbidden
            ? `Dependency "${resolvedDependency}" is explicitly forbidden by manifest policy for capability "${capability.id}".`
            : violatesAllowed
              ? `Dependency "${resolvedDependency}" is not listed in allowed_dependencies for capability "${capability.id}".`
              : `Dependency "${resolvedDependency}" complies with manifest dependency policy for capability "${capability.id}".`,
        });
      }
    }

    if (capability.id.startsWith("api-")) {
      if (capability.declared_consumers.length === 0) {
        recordFinding({
          law_id: "CapabilityBoundaryLaw",
          capability_id: capability.id,
          dependency_id: null,
          contract_name: null,
          status: "PASS",
          detail: `API capability "${capability.id}" remains an outer boundary and does not declare downstream capability consumers.`,
        });
      } else {
        for (const declaredConsumer of capability.declared_consumers) {
          recordFinding({
            law_id: "CapabilityBoundaryLaw",
            capability_id: capability.id,
            dependency_id: declaredConsumer,
            contract_name: null,
            status: "FAIL",
            detail: `API capability "${capability.id}" declares consumer "${declaredConsumer}". API boundaries must remain terminal consumers and cannot be depended on by other capabilities.`,
          });
        }
      }
    }

    for (const declaredConsumer of capability.declared_consumers) {
      const consumerCapability = capabilityIndex.get(declaredConsumer);
      if (!consumerCapability) {
        recordFinding({
          law_id: "ConsumerDeclarationLaw",
          capability_id: capability.id,
          dependency_id: declaredConsumer,
          contract_name: null,
          status: "FAIL",
          detail: `Declared consumer "${declaredConsumer}" does not resolve to a capability manifest.`,
        });
        continue;
      }
      recordFinding({
        law_id: "CapabilityBoundaryLaw",
        capability_id: capability.id,
        dependency_id: declaredConsumer,
        contract_name: null,
        status: resolvedInternalDependencies.has(declaredConsumer)
          ? "FAIL"
          : "PASS",
        detail: resolvedInternalDependencies.has(declaredConsumer)
          ? `Capability "${capability.id}" depends on its declared consumer "${declaredConsumer}". Provider-to-consumer back-dependencies violate capability boundaries.`
          : `Capability "${capability.id}" does not depend on declared consumer "${declaredConsumer}", preserving provider-consumer direction.`,
      });
      const resolvedConsumerDependencies = consumerCapability.declared_dependencies.map(
        (dependencyId) => resolveCapabilityId(capabilityIndex, dependencyId),
      );
      recordFinding({
        law_id: "ConsumerDeclarationLaw",
        capability_id: capability.id,
        dependency_id: declaredConsumer,
        contract_name: null,
        status: resolvedConsumerDependencies.includes(capability.id)
          ? "PASS"
          : "FAIL",
        detail: resolvedConsumerDependencies.includes(capability.id)
          ? `Declared consumer "${declaredConsumer}" reciprocates dependency on "${capability.id}".`
          : `Declared consumer "${declaredConsumer}" does not list "${capability.id}" in depends_on.`,
      });
    }

    for (const requirement of capability.required_contract_ranges) {
      const providerCandidates = capability.declared_dependencies
        .map((dependencyId) => resolveCapabilityId(capabilityIndex, dependencyId))
        .flatMap((dependencyId) => {
          const dependencyCapability = capabilityIndex.get(dependencyId);
          if (!dependencyCapability) {
            return [];
          }
          return dependencyCapability.provided_contract_versions
            .filter((contract) => contract.name === requirement.name)
            .map((contract) => ({
              dependency_id: dependencyId,
              version: contract.version,
            }));
        });

      if (providerCandidates.length === 0) {
        recordFinding({
          law_id: "ContractCompatibilityLaw",
          capability_id: capability.id,
          dependency_id: null,
          contract_name: requirement.name,
          status: "FAIL",
          detail: `No declared dependency provides contract "${requirement.name}" required by "${capability.id}".`,
        });
        continue;
      }

      const satisfyingProvider = providerCandidates.find((candidate) =>
        satisfiesVersionRange(candidate.version, requirement.range),
      );
      recordFinding({
        law_id: "ContractCompatibilityLaw",
        capability_id: capability.id,
        dependency_id: satisfyingProvider?.dependency_id ?? providerCandidates[0]?.dependency_id ?? null,
        contract_name: requirement.name,
        status: satisfyingProvider ? "PASS" : "FAIL",
        detail: satisfyingProvider
          ? `Contract "${requirement.name}" range "${requirement.range}" is satisfied by dependency "${satisfyingProvider.dependency_id}" version "${satisfyingProvider.version}".`
          : `Contract "${requirement.name}" range "${requirement.range}" is not satisfied by available provider versions [${providerCandidates.map((candidate) => `${candidate.dependency_id}@${candidate.version}`).join(", ")}].`,
      });
    }
  }

  const dependencyCycles = findCapabilityDependencyCycles(internalDependencyEdges);
  const capabilitiesInCycle = new Set(dependencyCycles.flat());
  for (const capability of registry.capabilities) {
    const cycle = dependencyCycles.find((candidate) =>
      candidate.includes(capability.id),
    );
    recordFinding({
      law_id: "DependencyCycleLaw",
      capability_id: capability.id,
      dependency_id:
        cycle && cycle.length > 1
          ? cycle[(cycle.indexOf(capability.id) + 1) % cycle.length] ?? null
          : null,
      contract_name: null,
      status: capabilitiesInCycle.has(capability.id) ? "FAIL" : "PASS",
      detail: cycle
        ? `Capability "${capability.id}" participates in dependency cycle ${[...cycle, cycle[0]].join(" -> ")}.`
        : `Capability "${capability.id}" does not participate in any declared capability dependency cycle.`,
    });
  }

  const lawResults = (
    Object.entries(lawCounters) as [
      CapabilityDependencyConstitutionLawId,
      { passed: number; failed: number; claim_boundary: string },
    ][]
  ).map(([lawId, counters]) => ({
    law_id: lawId,
    status: counters.failed === 0 ? ("PASS" as const) : ("FAIL" as const),
    passed: counters.passed,
    failed: counters.failed,
    claim_boundary: counters.claim_boundary,
  }));

  const summary = {
    total_capabilities: registry.capabilities.length,
    internal_dependencies: internalDependencyEdges.length,
    external_dependencies: externalDependencies.length,
    missing_dependencies: lawCounters.DependencyExistenceLaw.failed,
    api_runtime_violations: lawCounters.CapabilityIsolationLaw.failed,
    consumer_mismatches: lawCounters.ConsumerDeclarationLaw.failed,
    satisfied_contract_requirements:
      lawCounters.ContractCompatibilityLaw.passed,
    unsatisfied_contract_requirements:
      lawCounters.ContractCompatibilityLaw.failed,
    dependency_cycles: lawCounters.DependencyCycleLaw.failed,
    boundary_violations: lawCounters.CapabilityBoundaryLaw.failed,
    dependency_policy_violations: lawCounters.DependencyPolicyLaw.failed,
    overall_status: lawResults.every((result) => result.status === "PASS")
      ? ("PASS" as const)
      : ("FAIL" as const),
  };

  const constitutionalVersion = "1.2.0";
  const constitutionalDigest = sha256Digest({
    constitutional_version: constitutionalVersion,
    summary,
    internal_dependency_edges: internalDependencyEdges
      .slice()
      .sort(
        (left, right) =>
          left.from.localeCompare(right.from) || left.to.localeCompare(right.to),
      ),
    external_dependencies: externalDependencies
      .slice()
      .sort(
        (left, right) =>
          left.capability_id.localeCompare(right.capability_id) ||
          left.dependency_id.localeCompare(right.dependency_id),
      ),
    law_results: lawResults,
    findings,
  });

  return {
    constitutional_version: constitutionalVersion,
    constitutional_digest: constitutionalDigest,
    summary,
    internal_dependency_edges: internalDependencyEdges
      .slice()
      .sort(
        (left, right) =>
          left.from.localeCompare(right.from) || left.to.localeCompare(right.to),
      ),
    external_dependencies: externalDependencies
      .slice()
      .sort(
        (left, right) =>
          left.capability_id.localeCompare(right.capability_id) ||
          left.dependency_id.localeCompare(right.dependency_id),
      ),
    law_results: lawResults,
    findings,
    claim_boundary:
      "Capability Dependency Constitution verifies that capability manifests declare resolvable dependencies, preserve API-to-provider isolation, keep consumed_by relationships reciprocal, prevent boundary inversion, remain acyclic, honor manifest-level dependency policy, and satisfy required contract ranges through declared providers.",
  };
}

export function buildContractVersionRegistryReport(
  registry: CapabilityRegistryReport,
): ContractVersionRegistryReport {
  const capabilityIndex = new Map(
    registry.capabilities.map((capability) => [capability.id, capability]),
  );
  const contractNames = unique([
    ...registry.capabilities.flatMap((capability) =>
      capability.provided_contract_versions.map((contract) => contract.name),
    ),
    ...registry.capabilities.flatMap((capability) =>
      capability.required_contract_ranges.map((contract) => contract.name),
    ),
  ]);

  const contracts = contractNames.map((contractName) => {
    const providers = registry.capabilities
      .flatMap((capability) =>
        capability.provided_contract_versions
          .filter((contract) => contract.name === contractName)
          .map((contract) => ({
            capability_id: capability.id,
            version: contract.version,
            manifest_ref: capability.manifest_ref,
            stability: capability.stability,
          })),
      )
      .sort(
        (left, right) =>
          left.capability_id.localeCompare(right.capability_id) ||
          left.version.localeCompare(right.version),
      );

    const consumers = registry.capabilities
      .flatMap((capability) =>
        capability.required_contract_ranges
          .filter((contract) => contract.name === contractName)
          .map((contract) => {
            const rangeAnalysis = analyzeContractVersionRange(contract.range);
            const compatibleProviders = capability.declared_dependencies
              .map((dependencyId) =>
                resolveCapabilityId(capabilityIndex, dependencyId),
              )
              .flatMap((dependencyId) => {
                const dependencyCapability = capabilityIndex.get(dependencyId);
                if (!dependencyCapability) {
                  return [];
                }
                return dependencyCapability.provided_contract_versions
                  .filter(
                    (provided) =>
                      provided.name === contractName &&
                      satisfiesVersionRange(provided.version, contract.range),
                  )
                  .map((provided) => ({
                    capability_id: dependencyCapability.id,
                    version: provided.version,
                  }));
              })
              .sort(
                (left, right) =>
                  left.capability_id.localeCompare(right.capability_id) ||
                  left.version.localeCompare(right.version),
              );

            return {
              capability_id: capability.id,
              range: contract.range,
              declared_dependency_ids: capability.declared_dependencies,
              compatible_providers: compatibleProviders,
              compatible_provider_count: compatibleProviders.length,
              provider_resolution_status:
                compatibleProviders.length === 0
                  ? ("UNRESOLVED" as const)
                  : compatibleProviders.length === 1
                    ? ("DETERMINISTIC" as const)
                    : ("AMBIGUOUS" as const),
              range_policy_status: rangeAnalysis.status,
              range_policy_detail: rangeAnalysis.detail,
              status:
                compatibleProviders.length > 0
                  ? ("PASS" as const)
                  : ("FAIL" as const),
            } satisfies ContractVersionRegistryConsumer;
          }),
      )
      .sort(
        (left, right) =>
          left.capability_id.localeCompare(right.capability_id) ||
          left.range.localeCompare(right.range),
      );

    const declaredMajorVersions = unique(
      providers.flatMap((provider) => {
        const parsed = parseVersion(provider.version);
        return parsed ? [String(parsed.major)] : [];
      }),
    ).map((majorVersion) => Number(majorVersion));
    const stableProviderCount = providers.filter(
      (provider) => provider.stability === "stable",
    ).length;
    const pinnedConsumerCount = consumers.filter(
      (consumer) =>
        consumer.range_policy_status === "PINNED_MAJOR" ||
        consumer.range_policy_status === "PINNED_VERSION",
    ).length;
    const unboundedConsumerCount = consumers.filter(
      (consumer) => consumer.range_policy_status === "UNBOUNDED",
    ).length;
    const ambiguousConsumerCount = consumers.filter(
      (consumer) => consumer.provider_resolution_status === "AMBIGUOUS",
    ).length;

    return {
      contract_name: contractName,
      provider_count: providers.length,
      consumer_count: consumers.length,
      declared_versions: unique(providers.map((provider) => provider.version)),
      declared_major_versions: declaredMajorVersions,
      stable_provider_count: stableProviderCount,
      pinned_consumer_count: pinnedConsumerCount,
      unbounded_consumer_count: unboundedConsumerCount,
      ambiguous_consumer_count: ambiguousConsumerCount,
      providers,
      consumers,
      overall_status:
        consumers.every((consumer) => consumer.status === "PASS") &&
        unboundedConsumerCount === 0 &&
        ambiguousConsumerCount === 0
          ? ("PASS" as const)
          : ("FAIL" as const),
    } satisfies ContractVersionRegistryEntry;
  });

  const providerBindings = contracts.reduce(
    (sum, contract) => sum + contract.provider_count,
    0,
  );
  const consumerRequirements = contracts.reduce(
    (sum, contract) => sum + contract.consumer_count,
    0,
  );
  const satisfiedRequirements = contracts.reduce(
    (sum, contract) =>
      sum + contract.consumers.filter((consumer) => consumer.status === "PASS").length,
    0,
  );
  const unsatisfiedRequirements = consumerRequirements - satisfiedRequirements;
  const multiMajorContracts = contracts.filter(
    (contract) => contract.declared_major_versions.length > 1,
  ).length;
  const pinnedConsumerRequirements = contracts.reduce(
    (sum, contract) => sum + contract.pinned_consumer_count,
    0,
  );
  const unboundedConsumerRequirements = contracts.reduce(
    (sum, contract) => sum + contract.unbounded_consumer_count,
    0,
  );
  const ambiguousProviderBindings = contracts.reduce(
    (sum, contract) => sum + contract.ambiguous_consumer_count,
    0,
  );
  const stableContractsWithMultiMajor = contracts.filter(
    (contract) =>
      contract.stable_provider_count > 0 &&
      contract.declared_major_versions.length > 1,
  ).length;
  const registryVersion = "1.1.0";
  const summary = {
    total_contracts: contracts.length,
    provider_bindings: providerBindings,
    consumer_requirements: consumerRequirements,
    satisfied_requirements: satisfiedRequirements,
    unsatisfied_requirements: unsatisfiedRequirements,
    multi_major_contracts: multiMajorContracts,
    pinned_consumer_requirements: pinnedConsumerRequirements,
    unbounded_consumer_requirements: unboundedConsumerRequirements,
    ambiguous_provider_bindings: ambiguousProviderBindings,
    stable_contracts_with_multi_major: stableContractsWithMultiMajor,
    overall_status:
      unsatisfiedRequirements === 0 &&
      unboundedConsumerRequirements === 0 &&
      ambiguousProviderBindings === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const registryDigest = sha256Digest({
    registry_version: registryVersion,
    summary,
    contracts,
  });

  return {
    registry_version: registryVersion,
    registry_digest: registryDigest,
    summary,
    contracts,
    claim_boundary:
      "Contract Version Registry is the audit projection of capability contract providers, consumer version ranges, and compatibility resolved through declared capability dependencies. It also classifies whether consumer ranges are major-pinned or open-ended and whether provider resolution remains deterministic as contracts evolve.",
  };
}

function isValidVersionRange(range: string): boolean {
  const comparators = range
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (comparators.length === 0) {
    return false;
  }
  return comparators.every((comparator) =>
    /^(<=|>=|<|>|=)?\d+(?:\.\d+){0,2}$/.test(comparator),
  );
}

function parseVersionRangeComparators(range: string): readonly {
  readonly operator: "<=" | ">=" | "<" | ">" | "=";
  readonly version: { readonly major: number; readonly minor: number; readonly patch: number };
}[] {
  return range
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .flatMap((entry) => {
      const match = entry.match(/^(<=|>=|<|>|=)?(\d+(?:\.\d+){0,2})$/);
      if (!match?.[2]) {
        return [];
      }
      const version = parseVersion(match[2]);
      if (!version) {
        return [];
      }
      return [
        {
          operator: (match[1] ?? "=") as "<=" | ">=" | "<" | ">" | "=",
          version,
        },
      ];
    });
}

function analyzeContractVersionRange(range: string): {
  readonly status: ContractVersionRangePolicyStatus;
  readonly detail: string;
} {
  if (!isValidVersionRange(range)) {
    return {
      status: "INVALID",
      detail: `Range "${range}" is not a valid semver comparator set.`,
    };
  }

  const comparators = parseVersionRangeComparators(range);
  const exactComparator = comparators.find(
    (comparator) => comparator.operator === "=",
  );
  if (exactComparator) {
    return {
      status: "PINNED_VERSION",
      detail: `Range "${range}" pins the consumer to exact version ${exactComparator.version.major}.${exactComparator.version.minor}.${exactComparator.version.patch}.`,
    };
  }

  const lowerBounds = comparators.filter(
    (comparator) =>
      comparator.operator === ">=" || comparator.operator === ">",
  );
  const upperBounds = comparators.filter(
    (comparator) =>
      comparator.operator === "<=" || comparator.operator === "<",
  );

  if (upperBounds.length === 0) {
    return {
      status: "UNBOUNDED",
      detail: `Range "${range}" has no upper bound, so major-version evolution is open-ended.`,
    };
  }

  const highestLowerBound = lowerBounds
    .slice()
    .sort((left, right) => compareParsedVersions(right.version, left.version))[0];
  const lowestUpperBound = upperBounds
    .slice()
    .sort((left, right) => compareParsedVersions(left.version, right.version))[0];

  if (
    highestLowerBound &&
    lowestUpperBound &&
    lowestUpperBound.operator === "<" &&
    lowestUpperBound.version.major === highestLowerBound.version.major + 1
  ) {
    return {
      status: "PINNED_MAJOR",
      detail: `Range "${range}" is pinned to major ${highestLowerBound.version.major} with upper bound <${lowestUpperBound.version.major}.`,
    };
  }

  return {
    status: "BOUNDED",
    detail: `Range "${range}" is bounded, but not to a single major-version lane.`,
  };
}

function compareParsedVersions(
  left: { readonly major: number; readonly minor: number; readonly patch: number },
  right: { readonly major: number; readonly minor: number; readonly patch: number },
): number {
  return (
    left.major - right.major ||
    left.minor - right.minor ||
    left.patch - right.patch
  );
}

export function buildCapabilityCertificationReport(input: {
  readonly registry: CapabilityRegistryReport;
  readonly dependencyConstitution: CapabilityDependencyConstitutionReport;
  readonly contractVersionRegistry: ContractVersionRegistryReport;
  readonly performanceMetrics?: readonly CapabilityPerformanceCertificationInput[];
}): CapabilityCertificationReport {
  const performanceMetrics = new Map(
    (input.performanceMetrics ?? []).map((entry) => [entry.capability_id, entry]),
  );

  const capabilities = input.registry.capabilities
    .map((capability) => {
      const dependencyFindings = input.dependencyConstitution.findings.filter(
        (finding) =>
          finding.capability_id === capability.id &&
          (finding.law_id === "DependencyExistenceLaw" ||
            finding.law_id === "CapabilityIsolationLaw" ||
            finding.law_id === "ConsumerDeclarationLaw" ||
            finding.law_id === "DependencyCycleLaw" ||
            finding.law_id === "CapabilityBoundaryLaw" ||
            finding.law_id === "DependencyPolicyLaw"),
      );
      const dependencyFailures = dependencyFindings.filter(
        (finding) => finding.status === "FAIL",
      );
      const dependencyValid: CapabilityCertificationDimension = {
        status:
          dependencyFailures.length === 0 ? ("PASS" as const) : ("FAIL" as const),
        detail:
          dependencyFailures.length === 0
            ? `No dependency constitution violations found for "${capability.id}".`
            : dependencyFailures.map((finding) => finding.detail).join(" "),
      };

      const providedContractErrors = capability.provided_contract_versions
        .filter((contract) => parseVersion(contract.version) === null)
        .map(
          (contract) =>
            `Provided contract "${contract.name}" declares invalid version "${contract.version}".`,
        );
      const requiredContractErrors = capability.required_contract_ranges
        .filter((contract) => !isValidVersionRange(contract.range))
        .map(
          (contract) =>
            `Required contract "${contract.name}" declares invalid range "${contract.range}".`,
        );
      const contractErrors = [
        ...providedContractErrors,
        ...requiredContractErrors,
      ];
      const contractValid: CapabilityCertificationDimension = {
        status: contractErrors.length === 0 ? ("PASS" as const) : ("FAIL" as const),
        detail:
          contractErrors.length === 0
            ? `Contract declarations are syntactically valid for "${capability.id}".`
            : contractErrors.join(" "),
      };

      const providerEntries = input.contractVersionRegistry.contracts.flatMap(
        (contract) =>
          contract.providers.filter(
            (provider) => provider.capability_id === capability.id,
          ),
      );
      const providerValid: CapabilityCertificationDimension =
        capability.provided_contract_versions.length === 0
          ? {
              status: "NOT_APPLICABLE",
              detail: `Capability "${capability.id}" does not provide versioned contracts.`,
            }
          : providerEntries.length === capability.provided_contract_versions.length
            ? {
                status: "PASS",
                detail: `All provided contracts for "${capability.id}" are registered and versioned.`,
              }
            : {
                status: "FAIL",
                detail: `Some provided contracts for "${capability.id}" are missing from the contract registry projection.`,
              };

      const compatibilityEntries = input.contractVersionRegistry.contracts.flatMap(
        (contract) =>
          contract.consumers.filter(
            (consumer) => consumer.capability_id === capability.id,
          ),
      );
      const compatibilityFailures = compatibilityEntries.filter(
        (consumer) => consumer.status === "FAIL",
      );
      const compatibilityValid: CapabilityCertificationDimension =
        capability.required_contract_ranges.length === 0
          ? {
              status: "NOT_APPLICABLE",
              detail: `Capability "${capability.id}" does not require versioned contracts.`,
            }
          : compatibilityFailures.length === 0
            ? {
                status: "PASS",
                detail: `All required contract ranges for "${capability.id}" are satisfied by declared dependencies.`,
              }
            : {
                status: "FAIL",
                detail: compatibilityFailures
                  .map(
                    (consumer) =>
                      `Contract range "${consumer.range}" for "${consumer.capability_id}" has no compatible provider.`,
                  )
                  .join(" "),
              };

      const performanceEvidence = performanceMetrics.get(capability.id);
      const performanceValid: CapabilityCertificationDimension =
        performanceEvidence === undefined
          ? {
              status: "UNVERIFIED",
              detail: `No materialization or runtime performance evidence is currently registered for "${capability.id}".`,
            }
          : performanceEvidence.evidence_kind === "materialization" &&
              (performanceEvidence.generation_duration_ms ?? -1) >= 0 &&
              (performanceEvidence.freshness_ms ?? -1) >= 0 &&
              (performanceEvidence.consumer_count ?? -1) >= 0
            ? {
                status: "PASS",
                detail: `Materialization evidence recorded for "${capability.id}" with freshness=${performanceEvidence.freshness_ms ?? 0}ms duration=${performanceEvidence.generation_duration_ms ?? 0}ms consumers=${performanceEvidence.consumer_count ?? 0}.`,
              }
            : performanceEvidence.evidence_kind === "runtime_execution" &&
                (performanceEvidence.runtime_status === "VERIFIED" ||
                  performanceEvidence.runtime_status === "REPRODUCIBLE") &&
                (performanceEvidence.invocation_count ?? 0) > 0
              ? {
                  status: "PASS",
                  detail: `Runtime execution evidence recorded for "${capability.id}" with status=${performanceEvidence.runtime_status ?? "DECLARED"} invocations=${performanceEvidence.invocation_count ?? 0} successes=${performanceEvidence.success_count ?? 0} failures=${performanceEvidence.failure_count ?? 0}.`,
                }
            : {
                status: "FAIL",
                detail:
                  performanceEvidence.evidence_kind === "runtime_execution"
                    ? `Runtime execution evidence for "${capability.id}" is insufficient for certification. status=${performanceEvidence.runtime_status ?? "DECLARED"} invocations=${performanceEvidence.invocation_count ?? 0}.`
                    : `Materialization evidence for "${capability.id}" contains invalid or incomplete metric values.`,
              };

      const dimensions = [
        dependencyValid.status,
        contractValid.status,
        providerValid.status,
        compatibilityValid.status,
        performanceValid.status,
      ];
      const certificationStatus = dimensions.includes("FAIL")
        ? ("FAILED" as const)
        : dimensions.includes("UNVERIFIED")
          ? ("PARTIAL" as const)
          : ("CERTIFIED" as const);

      return {
        capability_id: capability.id,
        manifest_ref: capability.manifest_ref,
        stability: capability.stability,
        certification_status: certificationStatus,
        dependency_valid: dependencyValid,
        contract_valid: contractValid,
        provider_valid: providerValid,
        compatibility_valid: compatibilityValid,
        performance_valid: performanceValid,
      } satisfies CapabilityCertificationEntry;
    })
    .sort((left, right) => left.capability_id.localeCompare(right.capability_id));

  const summary = {
    total_capabilities: capabilities.length,
    certified_capabilities: capabilities.filter(
      (capability) => capability.certification_status === "CERTIFIED",
    ).length,
    partial_capabilities: capabilities.filter(
      (capability) => capability.certification_status === "PARTIAL",
    ).length,
    failed_capabilities: capabilities.filter(
      (capability) => capability.certification_status === "FAILED",
    ).length,
    performance_evaluated_capabilities: capabilities.filter(
      (capability) => capability.performance_valid.status !== "UNVERIFIED",
    ).length,
    overall_status: capabilities.some(
      (capability) => capability.certification_status === "FAILED",
    )
      ? ("FAIL" as const)
      : ("PASS" as const),
  };
  const certificationVersion = "1.0.0";
  const certificationDigest = sha256Digest({
    certification_version: certificationVersion,
    summary,
    capabilities,
  });

  return {
    certification_version: certificationVersion,
    certification_digest: certificationDigest,
    summary,
    capabilities,
    claim_boundary:
      "Capability Certification composes manifest validity, dependency constitution, contract registry compatibility, and available performance evidence into a per-capability certification status. Capabilities without performance evidence remain partial rather than implicitly certified.",
  };
}

export function buildCapabilityDiscoveryReport(
  query: string,
  registry: CapabilityRegistryReport,
): CapabilityDiscoveryReport {
  const queryTokens = tokenize(query);
  const candidates = registry.capabilities
    .map((capability) => ({
      id: capability.id,
      name: capability.name,
      lifecycle_stage: capability.lifecycle_stage,
      governance_status: capability.governance_status,
      consumers: capability.consumers,
      empirically_verified_products: capability.empirically_verified_products,
      similarity: similarity(queryTokens, capability.discovery_signature),
    }))
    .filter((candidate) => candidate.similarity > 0)
    .sort(
      (left, right) =>
        right.similarity - left.similarity || left.id.localeCompare(right.id),
    );

  const topCandidate = candidates[0] ?? null;
  return {
    query,
    query_tokens: queryTokens,
    status:
      topCandidate && topCandidate.similarity >= 0.5
        ? "REUSE_AVAILABLE"
        : "CREATE_ALLOWED",
    top_candidate: topCandidate,
    candidates,
    rule: "Everything is discovered before it is composed, and everything is composed before it is created.",
  };
}

export function buildCapabilityDiscoveryReportFromArtifactRegistry(
  query: string,
  artifactRegistry: ArtifactRegistryReport,
): CapabilityDiscoveryReport {
  const queryTokens = tokenize(query);
  const candidates = artifactRegistry.artifacts
    .filter(
      (
        artifact,
      ): artifact is ArtifactRegistryEntry & {
        readonly artifact_type: "capability";
        readonly lifecycle_stage: LifecycleStage;
      } =>
        artifact.artifact_type === "capability" &&
        artifact.lifecycle_stage !== null,
    )
    .map((artifact) => ({
      id: artifact.id.replace(/^capability:/, ""),
      name: artifact.label,
      lifecycle_stage: artifact.lifecycle_stage,
      governance_status:
        artifact.governance_status === "UNVERIFIED"
          ? "INVALID"
          : artifact.governance_status,
      consumers: artifact.consumers,
      empirically_verified_products: artifact.empirically_verified_products,
      similarity: similarity(queryTokens, artifact.discovery_signature),
    }))
    .filter((candidate) => candidate.similarity > 0)
    .sort(
      (left, right) =>
        right.similarity - left.similarity || left.id.localeCompare(right.id),
    );

  const topCandidate = candidates[0] ?? null;
  return {
    query,
    query_tokens: queryTokens,
    status:
      topCandidate && topCandidate.similarity >= 0.5
        ? "REUSE_AVAILABLE"
        : "CREATE_ALLOWED",
    top_candidate: topCandidate,
    candidates,
    rule: "Everything is discovered before it is composed, and everything is composed before it is created.",
  };
}

export function buildCapabilityPlanningReport(
  query: string,
  artifactRegistry: ArtifactRegistryReport,
): CapabilityPlanningReport {
  const discovery = buildCapabilityDiscoveryReportFromArtifactRegistry(
    query,
    artifactRegistry,
  );
  const blockingCandidate =
    discovery.top_candidate && discovery.top_candidate.similarity >= 0.5
      ? discovery.top_candidate
      : null;

  return {
    query: discovery.query,
    query_tokens: discovery.query_tokens,
    decision: blockingCandidate ? "REUSE_REQUIRED" : "CREATION_ALLOWED",
    blocking_candidate: blockingCandidate,
    candidates: discovery.candidates,
    registry_artifact_count: artifactRegistry.summary.total_artifacts,
    registry_claim_boundary: artifactRegistry.claim_boundary,
    rule: discovery.rule,
    claim_boundary:
      blockingCandidate !== null
        ? "Planner gate blocks creation until the closest reusable capability is disproven."
        : "Planner gate did not find a sufficiently similar reusable capability in the current Artifact Registry snapshot.",
  };
}

function executionEvidenceStatus(
  entry: ArtifactRegistryEntry,
): ExecutionGraphNode["execution_status"] {
  const executionReachability =
    entry.execution_evidence &&
    typeof entry.execution_evidence === "object" &&
    "execution_reachability" in entry.execution_evidence &&
    typeof entry.execution_evidence.execution_reachability === "object" &&
    entry.execution_evidence.execution_reachability !== null
      ? (entry.execution_evidence.execution_reachability as Record<
          string,
          unknown
        >)
      : null;
  const status = executionReachability?.status;
  return status === "DECLARED" ||
    status === "OBSERVED" ||
    status === "VERIFIED" ||
    status === "REPRODUCIBLE"
    ? status
    : null;
}

function countCyclesFromEdges(
  nodes: readonly { readonly id: string }[],
  edges: readonly ExecutionGraphEdge[],
): number {
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    if (edge.from === edge.to) {
      continue;
    }
    const list = adjacency.get(edge.from) ?? [];
    list.push(edge.to);
    adjacency.set(edge.from, list);
  }

  const permanent = new Set<string>();
  const temporary = new Set<string>();
  let cycles = 0;

  const visit = (nodeId: string): void => {
    if (permanent.has(nodeId)) {
      return;
    }
    if (temporary.has(nodeId)) {
      cycles += 1;
      return;
    }
    temporary.add(nodeId);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      visit(neighbor);
    }
    temporary.delete(nodeId);
    permanent.add(nodeId);
  };

  for (const node of nodes) {
    visit(node.id);
  }
  return cycles;
}

export function buildExecutionGraphModel(
  artifactRegistry: ArtifactRegistryReport,
): ExecutionGraphReport {
  const derivedNodes: ExecutionGraphNode[] = [];
  const edges: ExecutionGraphEdge[] = [];
  type ExecutionChainProjection = {
    readonly chain_id: string;
    readonly chain_digest: string;
    readonly product_id: string;
    readonly capability_id: string;
    readonly plan_id: string;
    readonly plan_instance_id: string;
    readonly plan_instance_node_id: string;
    readonly chain_status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
    readonly requirement_node_ids: readonly string[];
    readonly workflow_node_ids: readonly string[];
    readonly plan_node_ids: readonly string[];
    readonly evidence_node_ids: readonly string[];
    readonly verification_node_ids: readonly string[];
    readonly replay_node_ids: readonly string[];
    readonly operation_node_id: string;
    readonly capability_node_id: string;
    readonly invocation_node_ids: readonly string[];
    readonly projected_edges: readonly {
      readonly edge_id: string;
      readonly edge_digest: string;
      readonly from: string;
      readonly to: string;
      readonly topology_layer: "observed";
      readonly edge_type: "runtime" | "evidence" | "verification" | "replay";
      readonly claim_status: "OBSERVED" | "VERIFIED";
      readonly lifecycle_state:
        "ACTIVE" | "EXECUTED" | "VERIFIED" | "REPLAYABLE";
      readonly declared: false;
      readonly observed: true;
      readonly created_by_chain: string;
      readonly plan_instance_id: string;
      readonly source_ref: string;
      readonly evidence_ref: string | null;
    }[];
  };

  const asStringArray = (value: unknown): readonly string[] =>
    Array.isArray(value)
      ? unique(
          value.filter((entry): entry is string => typeof entry === "string"),
        )
      : [];

  const asRecord = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const makeDerivedNode = (
    id: string,
    label: string,
    artifactType: ExecutionGraphNode["artifact_type"] = "evidence",
  ): ExecutionGraphNode => ({
    id,
    artifact_type: artifactType,
    label,
    governance_status: "DERIVED",
    owner: null,
    lifecycle_stage: null,
    discovery_signature: [],
    planner_edges: [],
    runtime_edges: [],
    verification_edges: [],
    composition_edges: [],
    evidence_edges: [],
    execution_status: null,
  });

  const ensureNode = (node: ExecutionGraphNode): void => {
    if (!derivedNodes.some((entry) => entry.id === node.id)) {
      derivedNodes.push(node);
    }
  };

  const labelForProjectedNode = (id: string): string => {
    if (id.startsWith("REQ:")) {
      return `Requirement ${id.slice(4)}`;
    }
    if (id.startsWith("WF:")) {
      return `Workflow ${id.slice(3)}`;
    }
    if (id.startsWith("PLAN:")) {
      return `Plan ${id.slice(5)}`;
    }
    if (id.startsWith("PI:")) {
      return `Plan Instance ${id.slice(3)}`;
    }
    if (id.startsWith("CAP:")) {
      return `Capability ${id.slice(4)}`;
    }
    if (id.startsWith("OP:")) {
      return `Operation ${id.slice(3)}`;
    }
    if (id.startsWith("INV:")) {
      return `Invocation ${id.slice(4)}`;
    }
    if (id.startsWith("EVID:")) {
      return `Evidence ${id.slice(5)}`;
    }
    if (id.startsWith("VER:")) {
      return `Verification ${id.slice(4)}`;
    }
    if (id.startsWith("REP:")) {
      return `Replay ${id.slice(4)}`;
    }
    return id;
  };

  const stableEdgeId = (input: {
    readonly topology_layer: "declared" | "observed";
    readonly from: string;
    readonly to: string;
    readonly edge_type: string;
  }): string => {
    const digest = sha256Digest({
      topology_layer: input.topology_layer,
      from: input.from,
      to: input.to,
      edge_type: input.edge_type,
    });
    return `EDGE:${digest.slice(0, 16)}`;
  };

  const readExecutionChains = (
    artifact: ArtifactRegistryEntry,
  ): readonly ExecutionChainProjection[] => {
    const executionEvidence =
      artifact.execution_evidence &&
      typeof artifact.execution_evidence === "object"
        ? (artifact.execution_evidence as Record<string, unknown>)
        : null;
    const perProduct = Array.isArray(executionEvidence?.per_product)
      ? (executionEvidence.per_product as readonly Record<string, unknown>[])
      : [];

    return perProduct.flatMap((entry) => {
      const executionChains = Array.isArray(entry.execution_chains)
        ? (entry.execution_chains as readonly unknown[])
        : [];
      return executionChains
        .map((chain) => asRecord(chain))
        .filter((chain): chain is Record<string, unknown> => chain !== null)
        .map((chain) => {
          const invocationInstances = Array.isArray(chain.invocation_instances)
            ? (chain.invocation_instances as readonly unknown[])
            : [];
          const invocationNodeIds = unique([
            ...asStringArray(chain.invocation_ids),
            ...invocationInstances.flatMap((instance) => {
              const record = asRecord(instance);
              return record && typeof record.invocation_id === "string"
                ? [record.invocation_id]
                : [];
            }),
          ]);
          const capabilityId =
            typeof chain.capability_id === "string"
              ? chain.capability_id
              : artifact.id.replace(/^capability:/, "");
          return {
            chain_id:
              typeof chain.chain_id === "string"
                ? chain.chain_id
                : `chain:${artifact.id}`,
            chain_digest:
              typeof chain.chain_digest === "string"
                ? chain.chain_digest
                : "UNVERIFIED",
            product_id:
              typeof chain.product_id === "string"
                ? chain.product_id
                : typeof entry.product_id === "string"
                  ? entry.product_id
                  : "unknown",
            capability_id: capabilityId,
            plan_id:
              typeof chain.plan_id === "string" ? chain.plan_id : "UNVERIFIED",
            plan_instance_id:
              typeof chain.plan_instance_id === "string"
                ? chain.plan_instance_id
                : "UNVERIFIED",
            plan_instance_node_id:
              typeof chain.plan_instance_node_id === "string"
                ? chain.plan_instance_node_id
                : `PI:${typeof chain.plan_instance_id === "string" ? chain.plan_instance_id : "UNVERIFIED"}`,
            chain_status:
              chain.chain_status === "REPRODUCIBLE" ||
              chain.chain_status === "VERIFIED" ||
              chain.chain_status === "OBSERVED"
                ? chain.chain_status
                : "OBSERVED",
            requirement_node_ids: asStringArray(chain.requirement_node_ids),
            workflow_node_ids: asStringArray(chain.workflow_node_ids),
            plan_node_ids: asStringArray(chain.plan_node_ids),
            evidence_node_ids: asStringArray(chain.evidence_node_ids),
            verification_node_ids: asStringArray(chain.verification_node_ids),
            replay_node_ids: asStringArray(chain.replay_node_ids),
            operation_node_id:
              typeof chain.operation_node_id === "string"
                ? chain.operation_node_id
                : `OP:${capabilityId}:unknown`,
            capability_node_id:
              typeof chain.capability_node_id === "string"
                ? chain.capability_node_id
                : `CAP:${capabilityId}`,
            invocation_node_ids: invocationNodeIds,
            projected_edges: Array.isArray(chain.projected_edges)
              ? (chain.projected_edges as readonly unknown[])
                  .map((edge) => asRecord(edge))
                  .filter(
                    (edge): edge is Record<string, unknown> => edge !== null,
                  )
                  .map((edge) => ({
                    edge_id:
                      typeof edge.edge_id === "string"
                        ? edge.edge_id
                        : stableEdgeId({
                            topology_layer: "observed",
                            from:
                              typeof edge.from === "string"
                                ? edge.from
                                : "UNVERIFIED",
                            to:
                              typeof edge.to === "string"
                                ? edge.to
                                : "UNVERIFIED",
                            edge_type:
                              typeof edge.edge_type === "string"
                                ? edge.edge_type
                                : "runtime",
                          }),
                    edge_digest:
                      typeof edge.edge_digest === "string"
                        ? edge.edge_digest
                        : "UNVERIFIED",
                    from:
                      typeof edge.from === "string" ? edge.from : "UNVERIFIED",
                    to: typeof edge.to === "string" ? edge.to : "UNVERIFIED",
                    topology_layer: "observed" as const,
                    edge_type:
                      edge.edge_type === "evidence" ||
                      edge.edge_type === "verification" ||
                      edge.edge_type === "replay" ||
                      edge.edge_type === "runtime"
                        ? edge.edge_type
                        : "runtime",
                    claim_status:
                      edge.claim_status === "VERIFIED" ||
                      edge.claim_status === "OBSERVED"
                        ? edge.claim_status
                        : "OBSERVED",
                    lifecycle_state:
                      edge.lifecycle_state === "EXECUTED" ||
                      edge.lifecycle_state === "VERIFIED" ||
                      edge.lifecycle_state === "REPLAYABLE" ||
                      edge.lifecycle_state === "ACTIVE"
                        ? edge.lifecycle_state
                        : "ACTIVE",
                    declared: false as const,
                    observed: true as const,
                    created_by_chain:
                      typeof edge.created_by_chain === "string"
                        ? edge.created_by_chain
                        : `chain:${artifact.id}`,
                    plan_instance_id:
                      typeof edge.plan_instance_id === "string"
                        ? edge.plan_instance_id
                        : typeof chain.plan_instance_id === "string"
                          ? chain.plan_instance_id
                          : "UNVERIFIED",
                    source_ref:
                      typeof edge.source_ref === "string"
                        ? edge.source_ref
                        : `${typeof chain.product_id === "string" ? chain.product_id : "unknown"}:${typeof chain.chain_id === "string" ? chain.chain_id : `chain:${artifact.id}`}`,
                    evidence_ref:
                      typeof edge.evidence_ref === "string" ||
                      edge.evidence_ref === null
                        ? (edge.evidence_ref as string | null)
                        : typeof chain.chain_id === "string"
                          ? chain.chain_id
                          : null,
                  }))
              : [],
          } satisfies ExecutionChainProjection;
        });
    });
  };

  const uniqueChains = new Map<string, ExecutionChainProjection>();

  for (const artifact of artifactRegistry.artifacts) {
    const executionChains = readExecutionChains(artifact);
    for (const chain of executionChains) {
      uniqueChains.set(`${chain.product_id}:${chain.chain_digest}`, chain);
    }

    derivedNodes.push({
      id: artifact.id,
      artifact_type: artifact.artifact_type,
      label: artifact.label,
      governance_status: artifact.governance_status,
      owner: artifact.owner,
      lifecycle_stage: artifact.lifecycle_stage,
      discovery_signature: artifact.discovery_signature,
      planner_edges:
        artifact.discovery_signature.length > 0 ? [artifact.id] : [],
      runtime_edges: unique(executionChains.map((chain) => chain.chain_id)),
      verification_edges: unique(
        executionChains.flatMap((chain) => [
          ...chain.verification_node_ids,
          ...chain.replay_node_ids,
        ]),
      ),
      composition_edges: artifact.declared_relations
        .filter(
          (relation) =>
            relation.relation === "uses" || relation.relation === "declares",
        )
        .map((relation) => relation.target),
      evidence_edges: unique(
        executionChains.flatMap((chain) => [
          ...chain.evidence_node_ids,
          ...chain.replay_node_ids,
          chain.plan_instance_node_id,
        ]),
      ),
      execution_status: executionEvidenceStatus(artifact),
    });

    for (const relation of artifact.declared_relations) {
      const edgeType =
        relation.relation === "provides" ? "provides" : "composition";
      const edgeId = stableEdgeId({
        topology_layer: "declared",
        from: artifact.id,
        to: relation.target,
        edge_type: edgeType,
      });
      edges.push({
        edge_id: edgeId,
        edge_digest: sha256Digest({
          edge_id: edgeId,
          from: artifact.id,
          to: relation.target,
          edge_type: edgeType,
          topology_layer: "declared",
          claim_status: "DECLARED",
          lifecycle_state: "DECLARED",
        }),
        from: artifact.id,
        to: relation.target,
        topology_layer: "declared",
        edge_type: edgeType,
        claim_status: "DECLARED",
        lifecycle_state: "DECLARED",
        declared: true,
        observed: false,
        created_by_chain: null,
        plan_instance_id: null,
        source_kind: "artifact_registry",
        source_ref: artifact.manifest_ref ?? artifact.id,
        evidence_ref: artifact.manifest_ref ?? null,
      });
    }

    if (artifact.discovery_signature.length > 0) {
      const edgeId = stableEdgeId({
        topology_layer: "declared",
        from: artifact.id,
        to: artifact.id,
        edge_type: "planner",
      });
      edges.push({
        edge_id: edgeId,
        edge_digest: sha256Digest({
          edge_id: edgeId,
          from: artifact.id,
          to: artifact.id,
          edge_type: "planner",
          topology_layer: "declared",
          claim_status: "DECLARED",
          lifecycle_state: "DECLARED",
        }),
        from: artifact.id,
        to: artifact.id,
        topology_layer: "declared",
        edge_type: "planner",
        claim_status: "DECLARED",
        lifecycle_state: "DECLARED",
        declared: true,
        observed: false,
        created_by_chain: null,
        plan_instance_id: null,
        source_kind: "planner_signature",
        source_ref: artifact.id,
        evidence_ref: null,
      });
    }
  }

  const providedTargets = unique(
    artifactRegistry.artifacts.flatMap(
      (artifact) => artifact.provided_artifacts,
    ),
  );
  for (const target of providedTargets) {
    if (!derivedNodes.some((node) => node.id === target)) {
      derivedNodes.push({
        id: target,
        artifact_type: "capability_contract",
        label: target.replace(/^capability_contract:/, ""),
        governance_status: "DERIVED",
        owner: null,
        lifecycle_stage: null,
        discovery_signature: [],
        planner_edges: [],
        runtime_edges: [],
        verification_edges: [],
        composition_edges: [],
        evidence_edges: [],
        execution_status: null,
      });
    }
  }

  for (const chain of uniqueChains.values()) {
    const productNodeId = `product:${chain.product_id}`;
    if (!derivedNodes.some((node) => node.id === productNodeId)) {
      ensureNode(makeDerivedNode(productNodeId, chain.product_id, "product"));
    }

    const projectedNodeIds = unique([
      ...chain.requirement_node_ids,
      ...chain.workflow_node_ids,
      ...chain.plan_node_ids,
      chain.plan_instance_node_id,
      chain.capability_node_id,
      chain.operation_node_id,
      ...chain.invocation_node_ids,
      ...chain.evidence_node_ids,
      ...chain.replay_node_ids,
      ...chain.verification_node_ids,
    ]);
    for (const nodeId of projectedNodeIds) {
      ensureNode(makeDerivedNode(nodeId, labelForProjectedNode(nodeId)));
    }

    for (const edge of chain.projected_edges) {
      edges.push({
        edge_id: edge.edge_id,
        edge_digest: edge.edge_digest,
        from: edge.from,
        to: edge.to,
        topology_layer: "observed",
        edge_type: edge.edge_type,
        claim_status: edge.claim_status,
        lifecycle_state: edge.lifecycle_state,
        declared: false,
        observed: true,
        created_by_chain: edge.created_by_chain,
        plan_instance_id: edge.plan_instance_id,
        source_kind: "execution_chain",
        source_ref: edge.source_ref,
        evidence_ref: edge.evidence_ref,
      });
    }
  }

  const nodes = unique(derivedNodes.map((node) => node.id))
    .map((id) => derivedNodes.find((node) => node.id === id)!)
    .sort((left, right) => left.id.localeCompare(right.id));
  const sortedEdges = edges.sort(
    (left, right) =>
      left.edge_id.localeCompare(right.edge_id) ||
      left.from.localeCompare(right.from) ||
      left.edge_type.localeCompare(right.edge_type) ||
      left.to.localeCompare(right.to),
  );
  const generatedFrom = [
    {
      source_type: "artifact_registry" as const,
      source_ref: "artifact_registry:artifacts",
      source_digest: sha256Digest(
        artifactRegistry.artifacts.map((artifact) => ({
          id: artifact.id,
          manifest_ref: artifact.manifest_ref,
          governance_status: artifact.governance_status,
          declared_relations: artifact.declared_relations,
          provided_artifacts: artifact.provided_artifacts,
        })),
      ),
    },
    {
      source_type: "execution_evidence" as const,
      source_ref: "artifact_registry:execution_evidence",
      source_digest: sha256Digest(
        artifactRegistry.artifacts.map((artifact) => ({
          id: artifact.id,
          execution_evidence: artifact.execution_evidence ?? null,
        })),
      ),
    },
    {
      source_type: "execution_chain" as const,
      source_ref: "artifact_registry:execution_chains",
      source_digest: sha256Digest(
        Array.from(uniqueChains.values()).map((chain) => ({
          chain_id: chain.chain_id,
          chain_digest: chain.chain_digest,
          product_id: chain.product_id,
          capability_id: chain.capability_id,
          plan_id: chain.plan_id,
          plan_instance_id: chain.plan_instance_id,
          requirement_node_ids: chain.requirement_node_ids,
          workflow_node_ids: chain.workflow_node_ids,
          plan_node_ids: chain.plan_node_ids,
          evidence_node_ids: chain.evidence_node_ids,
          verification_node_ids: chain.verification_node_ids,
          replay_node_ids: chain.replay_node_ids,
          invocation_node_ids: chain.invocation_node_ids,
          projected_edges: chain.projected_edges,
        })),
      ),
    },
    {
      source_type: "planner_signature" as const,
      source_ref: "artifact_registry:planner_signatures",
      source_digest: sha256Digest(
        artifactRegistry.artifacts.map((artifact) => ({
          id: artifact.id,
          discovery_signature: artifact.discovery_signature,
        })),
      ),
    },
  ] as const;
  const declaredGraphDigest = sha256Digest(
    sortedEdges
      .filter((edge) => edge.topology_layer === "declared")
      .map((edge) => ({
        edge_id: edge.edge_id,
        from: edge.from,
        to: edge.to,
        edge_type: edge.edge_type,
        source_kind: edge.source_kind,
      })),
  );
  const executionChainDigest =
    generatedFrom.find((entry) => entry.source_type === "execution_chain")
      ?.source_digest ?? "UNVERIFIED";
  const constitutionalVersion = "1.0.0";
  const summary = {
    total_nodes: nodes.length,
    total_edges: sortedEdges.length,
    declared_edges: sortedEdges.filter(
      (edge) => edge.topology_layer === "declared",
    ).length,
    observed_edges: sortedEdges.filter(
      (edge) => edge.topology_layer === "observed",
    ).length,
    capability_nodes: nodes.filter(
      (node) => node.artifact_type === "capability",
    ).length,
    product_nodes: nodes.filter((node) => node.artifact_type === "product")
      .length,
    evidence_nodes: nodes.filter((node) => node.artifact_type === "evidence")
      .length,
    planner_edges: sortedEdges.filter((edge) => edge.edge_type === "planner")
      .length,
    runtime_edges: sortedEdges.filter((edge) => edge.edge_type === "runtime")
      .length,
    verification_edges: sortedEdges.filter(
      (edge) => edge.edge_type === "verification",
    ).length,
    composition_edges: sortedEdges.filter(
      (edge) => edge.edge_type === "composition",
    ).length,
    evidence_edges: sortedEdges.filter(
      (edge) => edge.edge_type === "evidence" || edge.edge_type === "replay",
    ).length,
  } as const;
  const projectionDigest = sha256Digest({
    graph_version: "1.0.0",
    projection_version: "1.0.0",
    generated_from: generatedFrom,
    nodes,
    edges: sortedEdges,
    summary,
  });
  const constitutionalDigest = sha256Digest({
    constitutional_version: constitutionalVersion,
    projection_api_version: "1.0.0",
    declared_graph_digest: declaredGraphDigest,
    execution_chain_digest: executionChainDigest,
  });

  return {
    projection_id: `ExecutionGraphProjection:${projectionDigest.slice(0, 16)}`,
    projection_type: "ExecutionGraphProjection",
    schema_version: "1.0.0",
    constitutional_version: constitutionalVersion,
    declared_graph_digest: declaredGraphDigest,
    execution_chain_digest: executionChainDigest,
    constitutional_digest: constitutionalDigest,
    constitutional_claims: {
      deterministic: true,
      immutable: true,
      chain_only_operational_edges: true,
      registry_only_declared_edges: true,
    },
    graph_version: "1.0.0",
    projection_version: "1.0.0",
    projection_digest: projectionDigest,
    generated_from: generatedFrom,
    generated_at_utc: new Date().toISOString(),
    nodes,
    edges: sortedEdges,
    summary,
    claim_boundary:
      "Execution Graph is an immutable constitutional projection with two layers: declared topology from Artifact Registry and observed operational topology from explicit Execution Chain projected edges. The graph must not infer operational adjacency from evidence, replay, verification, summaries, or registry booleans; if chains do not carry projected edges, no operational edges may be materialized. The graph must be regenerated from upstream declared contracts and execution chains and must not be edited directly.",
  };
}

export function buildExecutionGraphFitness(
  executionGraph: ExecutionGraphReport,
  duplicateCapabilityCandidates: number,
): ExecutionGraphFitnessReport {
  const nodesWithEdges = new Set<string>();
  for (const edge of executionGraph.edges) {
    nodesWithEdges.add(edge.from);
    nodesWithEdges.add(edge.to);
  }

  const capabilityNodes = executionGraph.nodes.filter(
    (node) => node.artifact_type === "capability",
  );
  const runtimeCoveredNodes = capabilityNodes.filter(
    (node) =>
      node.execution_status === "OBSERVED" ||
      node.execution_status === "VERIFIED" ||
      node.execution_status === "REPRODUCIBLE",
  );
  const reproducibleNodes = capabilityNodes.filter(
    (node) => node.execution_status === "REPRODUCIBLE",
  );
  const verificationCoveredNodes = capabilityNodes.filter(
    (node) => node.verification_edges.length > 0,
  );
  const replayEdges = executionGraph.edges.filter(
    (edge) => edge.edge_type === "replay",
  );
  const evidenceEdges = executionGraph.edges.filter(
    (edge) => edge.edge_type === "evidence",
  );
  const cycles = countCyclesFromEdges(
    executionGraph.nodes,
    executionGraph.edges,
  );
  const orphanNodes = executionGraph.nodes.filter(
    (node) => !nodesWithEdges.has(node.id),
  ).length;
  const deadNodes = capabilityNodes.filter(
    (node) => node.execution_status === "DECLARED",
  ).length;

  const plannerCoverageRatio = ratio(
    capabilityNodes.filter((node) => node.planner_edges.length > 0).length,
    capabilityNodes.length,
  );
  const runtimeCoverageRatio = ratio(
    runtimeCoveredNodes.length,
    capabilityNodes.length,
  );
  const verificationCoverageRatio = ratio(
    verificationCoveredNodes.length,
    capabilityNodes.length,
  );
  const replayEvidenceBasis =
    evidenceEdges.length === 0 ? capabilityNodes.length : evidenceEdges.length;
  const replayStabilityRatio = Number(
    Math.min(
      1,
      ratio(
        Math.min(
          Math.max(replayEdges.length, reproducibleNodes.length),
          replayEvidenceBasis,
        ),
        replayEvidenceBasis,
      ),
    ).toFixed(4),
  );
  const connectivityRatio = ratio(
    nodesWithEdges.size,
    executionGraph.nodes.length,
  );
  const executionReachabilityRatio = ratio(
    runtimeCoveredNodes.length,
    capabilityNodes.length,
  );

  return {
    fitness_status:
      cycles > 0 || duplicateCapabilityCandidates > 0
        ? "BLOCKED"
        : orphanNodes > 0 || deadNodes > 0
          ? "PARTIAL"
          : "HEALTHY",
    connectivity_ratio: connectivityRatio,
    execution_reachability_ratio: executionReachabilityRatio,
    orphan_nodes: orphanNodes,
    dead_nodes: deadNodes,
    dependency_cycles: cycles,
    duplicate_capability_candidates: duplicateCapabilityCandidates,
    planner_coverage_ratio: plannerCoverageRatio,
    runtime_coverage_ratio: runtimeCoverageRatio,
    verification_coverage_ratio: verificationCoverageRatio,
    replay_stability_ratio: replayStabilityRatio,
    core_delta_status: "UNVERIFIED",
    claim_boundary:
      "Graph fitness is computed from the shared Execution Graph view. Core delta remains unverified until substrate-diff evidence is materialized.",
  };
}

export function buildCapabilityDiscoveryReportFromExecutionGraph(
  query: string,
  executionGraph: ExecutionGraphReport,
): CapabilityDiscoveryReport {
  const queryTokens = tokenize(query);
  const candidates = executionGraph.nodes
    .filter(
      (
        node,
      ): node is ExecutionGraphNode & {
        readonly lifecycle_stage: LifecycleStage;
      } => node.artifact_type === "capability" && node.lifecycle_stage !== null,
    )
    .map((node) => ({
      id: node.id.replace(/^capability:/, ""),
      name: node.label,
      lifecycle_stage: node.lifecycle_stage,
      governance_status:
        node.governance_status === "UNVERIFIED" ||
        node.governance_status === "DERIVED"
          ? "INVALID"
          : node.governance_status,
      consumers: executionGraph.edges
        .filter(
          (edge) =>
            edge.to === node.id &&
            edge.edge_type === "composition" &&
            edge.from.startsWith("product:"),
        )
        .map((edge) => edge.from.replace(/^product:/, "")),
      empirically_verified_products: unique(
        node.evidence_edges
          .filter((edgeId) => edgeId.startsWith("REP:"))
          .map((edgeId) => edgeId.split(":")[1] ?? edgeId),
      ),
      similarity: similarity(queryTokens, node.discovery_signature),
    }))
    .filter((candidate) => candidate.similarity > 0)
    .sort(
      (left, right) =>
        right.similarity - left.similarity || left.id.localeCompare(right.id),
    );

  const topCandidate = candidates[0] ?? null;
  return {
    query,
    query_tokens: queryTokens,
    status:
      topCandidate && topCandidate.similarity >= 0.5
        ? "REUSE_AVAILABLE"
        : "CREATE_ALLOWED",
    top_candidate: topCandidate,
    candidates,
    rule: "Everything is discovered before it is composed, and everything is composed before it is created.",
  };
}

export function buildCapabilityPlanningReportFromExecutionGraph(
  query: string,
  executionGraph: ExecutionGraphReport,
): CapabilityPlanningReport {
  const discovery = buildCapabilityDiscoveryReportFromExecutionGraph(
    query,
    executionGraph,
  );
  const blockingCandidate =
    discovery.top_candidate && discovery.top_candidate.similarity >= 0.5
      ? discovery.top_candidate
      : null;

  return {
    query: discovery.query,
    query_tokens: discovery.query_tokens,
    decision: blockingCandidate ? "REUSE_REQUIRED" : "CREATION_ALLOWED",
    blocking_candidate: blockingCandidate,
    candidates: discovery.candidates,
    registry_artifact_count: executionGraph.summary.total_nodes,
    registry_claim_boundary: executionGraph.claim_boundary,
    rule: discovery.rule,
    claim_boundary:
      blockingCandidate !== null
        ? "Planner gate blocks creation until the closest reusable capability is disproven in the shared Execution Graph."
        : "Planner gate did not find a sufficiently similar reusable capability in the current Execution Graph snapshot.",
  };
}