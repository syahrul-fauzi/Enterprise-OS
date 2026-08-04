import type { ProductFunctionalTestReport } from "./product-evidence-runtime.js";

type ProductMappingRow = {
  readonly feature: string;
  readonly capability: string;
  readonly module: string;
  readonly primitive: string;
};

type ProductCompositionManifest = {
  readonly id: string;
  readonly capabilities?: readonly string[];
  readonly surfaces?: readonly string[];
};

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

function primitiveList(value: string): readonly string[] {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function percent(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(1));
}

function ratio(numerator: number, denominator: number): number {
  if (denominator === 0) {
    return 0;
  }
  return Number((numerator / denominator).toFixed(4));
}

export function materializeClrReport(input: {
  readonly workspaceCapabilities: readonly string[];
  readonly compositionManifest: ProductCompositionManifest;
  readonly mappingRows: readonly ProductMappingRow[];
}): Record<string, unknown> {
  const mappedCapabilities = unique(input.mappingRows.map((row) => row.capability));
  const reusedCapabilities = input.workspaceCapabilities.filter((capability) =>
    mappedCapabilities.includes(capability),
  ).length;
  const totalCapabilities = input.workspaceCapabilities.length;
  const newCapabilities = Math.max(totalCapabilities - reusedCapabilities, 0);
  const reusedPatterns = unique(input.mappingRows.map((row) => row.module)).length;
  const totalPatterns = reusedPatterns;
  const reusedSurfaces = input.compositionManifest.surfaces?.length ?? 0;
  const totalSurfaces = reusedSurfaces;

  return {
    methodology: {
      capability_reuse_ratio_formula: "reused_capabilities / total_product_capabilities",
      clr_formula: "reused_capabilities / new_product_specific_capabilities",
      experience_module_reuse_ratio_formula:
        "reused_modules / total_modules_observed_in_mapping_matrix",
      surface_reuse_ratio_formula: "reused_surfaces / total_surfaces_declared_in_composition",
      evidence_basis: [
        "apps/<product>/workspace.manifest.ts",
        "packages/compositions/<composition>/manifest.yaml",
        "capability-mapping-matrix.csv",
      ],
    },
    capability_reuse: {
      reused: reusedCapabilities,
      total: totalCapabilities,
      created_new: newCapabilities,
      reuse_ratio: ratio(reusedCapabilities, totalCapabilities),
      reuse_percentage: percent(reusedCapabilities, totalCapabilities),
      clr: newCapabilities === 0 ? "FULL_REUSE" : reusedCapabilities / newCapabilities,
      composition_manifest_capabilities: input.compositionManifest.capabilities ?? [],
      workspace_capabilities: input.workspaceCapabilities,
    },
    experience_module_reuse: {
      reused: reusedPatterns,
      total: totalPatterns,
      reuse_ratio: ratio(reusedPatterns, totalPatterns),
      reuse_percentage: percent(reusedPatterns, totalPatterns),
    },
    surface_reuse: {
      reused: reusedSurfaces,
      total: totalSurfaces,
      reuse_ratio: ratio(reusedSurfaces, totalSurfaces),
      reuse_percentage: percent(reusedSurfaces, totalSurfaces),
    },
  };
}

export function materializeAtomicLeverageReport(input: {
  readonly mappingRows: readonly ProductMappingRow[];
}): Record<string, unknown> {
  const moduleCounts = new Map<string, number>();
  const primitiveCounts = new Map<string, number>();

  for (const row of input.mappingRows) {
    moduleCounts.set(row.module, (moduleCounts.get(row.module) ?? 0) + 1);
    for (const primitive of primitiveList(row.primitive)) {
      primitiveCounts.set(primitive, (primitiveCounts.get(primitive) ?? 0) + 1);
    }
  }

  return {
    methodology: {
      module_reuse_formula: "number_of_features_using_module",
      primitive_reuse_formula: "number_of_features_using_primitive",
      evidence_basis: "capability-mapping-matrix.csv",
      claim_boundary:
        "Single-product observation only. Cross-product leverage requires additional verified products.",
    },
    module_reuse: Array.from(moduleCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([module, reuse_count]) => ({ module, reuse_count })),
    primitive_reuse: Array.from(primitiveCounts.entries())
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([primitive, reuse_count]) => ({ primitive, reuse_count })),
  };
}

export function materializeProofOfCompositionMarkdown(input: {
  readonly productId: string;
  readonly compositionId: string;
  readonly workspaceCapabilities: readonly string[];
  readonly testReport: ProductFunctionalTestReport;
  readonly evidenceFiles: Record<string, string>;
  readonly mappingRows: readonly ProductMappingRow[];
}): string {
  return [
    "# Chapter 6 - Proof of Composition",
    "",
    "## Facts",
    `- Product: \`${input.productId}\``,
    `- Composition asset: \`${input.compositionId}\``,
    `- Workspace capabilities: ${input.workspaceCapabilities.map((entry) => `\`${entry}\``).join(", ")}`,
    `- Functional tests passed: ${input.testReport.summary.pass}/${input.testReport.summary.total}`,
    "",
    "## Pipeline",
    "1. Validate composition package manifest and workspace descriptor.",
    "2. Replay product verification via `pnpm eos verify-product lawyershub`.",
    "3. Execute functional tests with TAP reporter for deterministic parsing.",
    "4. Materialize capability mapping matrix, composition tree, CLR report, and atomic leverage report.",
    "5. Persist all outputs as evidence artifacts under `workspace/products/<product>/evidence/verification`.",
    "",
    "## Evidence Outputs",
    ...Object.entries(input.evidenceFiles).map(([name, file]) => `- ${name}: \`${file}\``),
    "",
    "## Observations",
    `- Mapping rows observed: ${input.mappingRows.length}`,
    `- Test cases observed: ${input.testReport.test_cases.length}`,
    "- Evidence confirms implementation verification for the current product scope only.",
    "",
    "## Claim Boundary",
    "- Multi-product replay for `services-id` and `ilc` is not yet verified by this command.",
    "- Zero-core-code-delta proof across products is not yet produced by this evidence set.",
    "- Reference feature parity matrix requires explicit reference datasets per product.",
    "",
  ].join("\n");
}

export function materializeVerificationSummaryMarkdown(input: {
  readonly productId: string;
  readonly compositionId: string;
  readonly capabilities: readonly string[];
  readonly testReport: ProductFunctionalTestReport;
  readonly runtimeInvocationSummary: {
    readonly total_invocations: number;
    readonly observed_capabilities: number;
    readonly verified_capabilities: number;
    readonly reproducible_capabilities: number;
  };
  readonly executionPlanSummary: {
    readonly plan_id: string;
    readonly plan_digest: string;
    readonly plan_instance_id: string;
    readonly projection_source: "execution_graph" | "registry_entries";
  };
  readonly executionChainSummary: {
    readonly total_chains: number;
    readonly chains_with_requirement: number;
    readonly chains_with_workflow: number;
    readonly reproducible_chains: number;
  };
  readonly executionTimelineSummary: {
    readonly total_events: number;
    readonly edge_lifecycle_events: number;
  };
  readonly evidenceFiles: readonly string[];
}): string {
  return [
    `# ${input.productId} Verification Summary`,
    "",
    `- composition: \`${input.compositionId}\``,
    `- capabilities: ${input.capabilities.map((entry) => `\`${entry}\``).join(", ")}`,
    `- functional tests: ${input.testReport.summary.pass}/${input.testReport.summary.total} PASS`,
    `- runtime invocations: ${input.runtimeInvocationSummary.total_invocations}`,
    `- observed capabilities: ${input.runtimeInvocationSummary.observed_capabilities}`,
    `- verified capabilities: ${input.runtimeInvocationSummary.verified_capabilities}`,
    `- reproducible capabilities: ${input.runtimeInvocationSummary.reproducible_capabilities}`,
    `- execution plan: \`${input.executionPlanSummary.plan_id}\``,
    `- plan digest: \`${input.executionPlanSummary.plan_digest}\``,
    `- plan instance: \`${input.executionPlanSummary.plan_instance_id}\``,
    `- plan projection source: \`${input.executionPlanSummary.projection_source}\``,
    `- execution chains: ${input.executionChainSummary.total_chains}`,
    `- chains with requirement: ${input.executionChainSummary.chains_with_requirement}`,
    `- chains with workflow: ${input.executionChainSummary.chains_with_workflow}`,
    `- reproducible chains: ${input.executionChainSummary.reproducible_chains}`,
    `- timeline events: ${input.executionTimelineSummary.total_events}`,
    `- edge lifecycle events: ${input.executionTimelineSummary.edge_lifecycle_events}`,
    `- parser: \`${input.testReport.reporter}\``,
    `- status: \`${input.testReport.status}\``,
    "",
    "## Evidence",
    ...input.evidenceFiles.map((file) => `- ${file}`),
    "",
  ].join("\n");
}
