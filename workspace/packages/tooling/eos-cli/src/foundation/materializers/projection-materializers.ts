import type { Projection } from "../../projection-domain.js";
import { sha256ProjectionValue } from "../../projection-domain.js";
import { materializeProjection } from "../../projection-materializers.js";

type FoundationExecutionChain = {
  readonly chain_digest: string;
  readonly chain_status: "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";
  readonly capability_id: string;
  readonly requirement_node_ids: readonly string[];
  readonly workflow_node_ids: readonly string[];
  readonly plan_node_ids: readonly string[];
};

export type FoundationProductEvidenceInput = {
  readonly product_id: string;
  readonly capabilities: readonly string[];
  readonly mapped_capabilities: readonly string[];
  readonly execution_chain_summary: {
    readonly chain_projection_digest: string;
  } | null;
  readonly execution_chains: readonly FoundationExecutionChain[];
};

export type ArchitectureTrendMetrics = {
  readonly foundation_status: string;
  readonly verified_products: number;
  readonly declared_products: number;
  readonly owner_coverage_ratio: number;
  readonly reachability_ratio: number;
  readonly orphan_artifacts: number;
  readonly documentation_only_specs: number;
  readonly weighted_clr_normalized: number | null;
  readonly total_artifacts: number;
  readonly observed_capabilities: number;
  readonly verified_capabilities: number;
  readonly reproducible_capabilities: number;
  readonly products_with_execution_plan: number;
  readonly total_chain_invocations: number;
  readonly unique_chain_digests: number;
  readonly chains_with_requirement: number;
  readonly reproducible_chains: number;
  readonly stable_chains: number;
  readonly chain_projection_digest: string;
  readonly chain_status_fingerprints: readonly string[];
};

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values)).sort();
}

function hashDeterministically(value: unknown): string {
  return sha256ProjectionValue(value);
}

function scoreStatus(value: string, ordering: readonly string[]): number {
  const index = ordering.indexOf(value);
  return index === -1 ? -1 : index;
}

export function materializeTopologyDriftProjection(
  productEvidence: readonly FoundationProductEvidenceInput[],
): Projection<Record<string, unknown>> {
  const perProduct = productEvidence.map((product) => {
    const declaredCapabilities = uniqueSorted([
      ...product.capabilities,
      ...product.mapped_capabilities,
    ]);
    const observedCapabilities = uniqueSorted(
      product.execution_chains.map((chain) => chain.capability_id),
    );
    const alignedCapabilities = declaredCapabilities.filter((capabilityId) =>
      observedCapabilities.includes(capabilityId),
    );
    const undeclaredObservedCapabilities = observedCapabilities.filter(
      (capabilityId) => !declaredCapabilities.includes(capabilityId),
    );
    const unobservedDeclaredCapabilities = declaredCapabilities.filter(
      (capabilityId) => !observedCapabilities.includes(capabilityId),
    );
    const observedRequirementNodeIds = uniqueSorted(
      product.execution_chains.flatMap((chain) => chain.requirement_node_ids),
    );
    const observedWorkflowNodeIds = uniqueSorted(
      product.execution_chains.flatMap((chain) => chain.workflow_node_ids),
    );
    const observedPlanNodeIds = uniqueSorted(
      product.execution_chains.flatMap((chain) => chain.plan_node_ids),
    );

    return {
      product_id: product.product_id,
      declared_capabilities: declaredCapabilities,
      observed_capabilities: observedCapabilities,
      aligned_capabilities: alignedCapabilities,
      undeclared_observed_capabilities: undeclaredObservedCapabilities,
      unobserved_declared_capabilities: unobservedDeclaredCapabilities,
      observed_requirement_node_ids: observedRequirementNodeIds,
      observed_workflow_node_ids: observedWorkflowNodeIds,
      observed_plan_node_ids: observedPlanNodeIds,
      drift_status:
        undeclaredObservedCapabilities.length > 0 ||
        unobservedDeclaredCapabilities.length > 0
          ? "DRIFT"
          : alignedCapabilities.length > 0
            ? "ALIGNED"
            : "UNVERIFIED",
    };
  });

  const canonicalProjection = perProduct.map((product) => ({
    product_id: product.product_id,
    declared_capabilities: product.declared_capabilities,
    observed_capabilities: product.observed_capabilities,
    undeclared_observed_capabilities: product.undeclared_observed_capabilities,
    unobserved_declared_capabilities: product.unobserved_declared_capabilities,
  }));
  const projectionDigest = hashDeterministically(canonicalProjection);

  return materializeProjection({
    projectionType: "TopologyDriftProjection",
    generatedFrom: productEvidence.map((product) => ({
      source_type: "execution_chain",
      source_ref: product.product_id,
      source_digest:
        product.execution_chain_summary?.chain_projection_digest ?? "UNVERIFIED",
    })),
    projectionDigest,
    payload: {
      drift_status: perProduct.some((product) => product.drift_status === "DRIFT")
        ? "DRIFT"
        : "ALIGNED",
      summary: {
        total_products: perProduct.length,
        aligned_products: perProduct.filter(
          (product) => product.drift_status === "ALIGNED",
        ).length,
        drifted_products: perProduct.filter(
          (product) => product.drift_status === "DRIFT",
        ).length,
        undeclared_observed_edges: perProduct.reduce(
          (sum, product) => sum + product.undeclared_observed_capabilities.length,
          0,
        ),
        unobserved_declared_edges: perProduct.reduce(
          (sum, product) => sum + product.unobserved_declared_capabilities.length,
          0,
        ),
        unmodeled_observed_requirements: uniqueSorted(
          perProduct.flatMap((product) => product.observed_requirement_node_ids),
        ).length,
        unmodeled_observed_workflows: uniqueSorted(
          perProduct.flatMap((product) => product.observed_workflow_node_ids),
        ).length,
        unmodeled_observed_plans: uniqueSorted(
          perProduct.flatMap((product) => product.observed_plan_node_ids),
        ).length,
        canonical_topology_digest: projectionDigest,
      },
      products: perProduct,
      claim_boundary:
        "Topology drift currently compares declared product-to-capability topology against observed capability execution chains. Requirement, workflow, and plan nodes are reported as unmodeled observed topology until they become first-class declared contracts in the registry.",
    },
  });
}

export function materializeArchitectureTrendProjection(input: {
  readonly previous: Record<string, unknown> | null;
  readonly currentMetrics: ArchitectureTrendMetrics;
}): Projection<Record<string, unknown>> {
  const priorSnapshots = Array.isArray(input.previous?.snapshots)
    ? (input.previous.snapshots as readonly Record<string, unknown>[])
    : [];
  const currentSnapshot = {
    foundation_status: String(input.currentMetrics.foundation_status),
    verified_products: Number(input.currentMetrics.verified_products),
    declared_products: Number(input.currentMetrics.declared_products),
    owner_coverage_ratio: Number(input.currentMetrics.owner_coverage_ratio),
    reachability_ratio: Number(input.currentMetrics.reachability_ratio),
    orphan_artifacts: Number(input.currentMetrics.orphan_artifacts),
    documentation_only_specs: Number(input.currentMetrics.documentation_only_specs),
    weighted_clr_normalized:
      input.currentMetrics.weighted_clr_normalized === null
        ? null
        : Number(input.currentMetrics.weighted_clr_normalized),
    total_artifacts: Number(input.currentMetrics.total_artifacts),
    observed_capabilities: Number(input.currentMetrics.observed_capabilities),
    verified_capabilities: Number(input.currentMetrics.verified_capabilities),
    reproducible_capabilities: Number(input.currentMetrics.reproducible_capabilities),
    products_with_execution_plan: Number(input.currentMetrics.products_with_execution_plan),
    total_chain_invocations: Number(input.currentMetrics.total_chain_invocations),
    unique_chain_digests: Number(input.currentMetrics.unique_chain_digests),
    chains_with_requirement: Number(input.currentMetrics.chains_with_requirement),
    reproducible_chains: Number(input.currentMetrics.reproducible_chains),
    stable_chains: Number(input.currentMetrics.stable_chains),
    chain_projection_digest: String(input.currentMetrics.chain_projection_digest),
    chain_status_fingerprints: uniqueSorted(input.currentMetrics.chain_status_fingerprints),
  };
  const snapshotHash = hashDeterministically(currentSnapshot);
  const latestExisting = priorSnapshots[priorSnapshots.length - 1] ?? null;
  const latestExistingHash =
    latestExisting && typeof latestExisting.snapshot_hash === "string"
      ? latestExisting.snapshot_hash
      : null;
  const snapshots =
    latestExistingHash === snapshotHash
      ? priorSnapshots
      : [
          ...priorSnapshots,
          {
            epoch: `epoch-${String(priorSnapshots.length + 1).padStart(3, "0")}`,
            recorded_at_utc: new Date().toISOString(),
            snapshot_hash: snapshotHash,
            metrics: currentSnapshot,
          },
        ];
  const latest = snapshots[snapshots.length - 1] ?? null;
  const previousSnapshot = snapshots.length >= 2 ? snapshots[snapshots.length - 2] ?? null : null;

  if (!latest) {
    return materializeProjection({
      projectionType: "TrendProjection",
      generatedFrom: [],
      payload: {
        trend_status: "BASELINE",
        latest_epoch: "epoch-000",
        total_epochs: 0,
        snapshots: [],
        improvements: [],
        regressions: [],
        claim_boundary: "No architecture snapshot has been materialized yet.",
      },
    });
  }

  if (!previousSnapshot) {
    return materializeProjection({
      projectionType: "TrendProjection",
      generatedFrom: [
        {
          source_type: "foundation_metrics",
          source_ref: String(latest.epoch),
          source_digest: snapshotHash,
        },
      ],
      payload: {
        trend_status: "BASELINE",
        latest_epoch: String(latest.epoch),
        total_epochs: snapshots.length,
        snapshots,
        improvements: [],
        regressions: [],
        claim_boundary:
          "Architecture trend requires at least two distinct foundation snapshots. Current run establishes the first epoch.",
      },
    });
  }

  const previousMetrics = previousSnapshot.metrics as Record<string, unknown>;
  const improvements: string[] = [];
  const regressions: string[] = [];
  const chainMetricsComparable =
    typeof previousMetrics.chain_projection_digest === "string" &&
    previousMetrics.chain_projection_digest.length > 0 &&
    previousMetrics.chain_projection_digest !== "UNVERIFIED";

  const compareHigherIsBetter = (key: keyof typeof currentSnapshot): void => {
    const current = Number(currentSnapshot[key] ?? 0);
    const previous = Number(previousMetrics[key] ?? 0);
    if (current > previous) {
      improvements.push(`${key} improved`);
    } else if (current < previous) {
      regressions.push(`${key} regressed`);
    }
  };

  const compareLowerIsBetter = (key: keyof typeof currentSnapshot): void => {
    const current = Number(currentSnapshot[key] ?? 0);
    const previous = Number(previousMetrics[key] ?? 0);
    if (current < previous) {
      improvements.push(`${key} reduced`);
    } else if (current > previous) {
      regressions.push(`${key} increased`);
    }
  };

  compareHigherIsBetter("verified_products");
  compareHigherIsBetter("owner_coverage_ratio");
  compareHigherIsBetter("reachability_ratio");
  compareHigherIsBetter("observed_capabilities");
  compareHigherIsBetter("verified_capabilities");
  compareHigherIsBetter("reproducible_capabilities");
  compareHigherIsBetter("products_with_execution_plan");
  if (chainMetricsComparable) {
    compareHigherIsBetter("total_chain_invocations");
    compareHigherIsBetter("unique_chain_digests");
    compareHigherIsBetter("chains_with_requirement");
    compareHigherIsBetter("reproducible_chains");
    compareHigherIsBetter("stable_chains");
  }
  if (currentSnapshot.weighted_clr_normalized !== null && previousMetrics.weighted_clr_normalized !== null) {
    compareHigherIsBetter("weighted_clr_normalized");
  }
  compareLowerIsBetter("orphan_artifacts");
  compareLowerIsBetter("documentation_only_specs");

  const previousChainFingerprints = new Set(
    chainMetricsComparable && Array.isArray(previousMetrics.chain_status_fingerprints)
      ? (previousMetrics.chain_status_fingerprints as readonly string[])
      : [],
  );
  const currentChainFingerprints = new Set(currentSnapshot.chain_status_fingerprints);
  const previousChainByDigest = new Map<string, string>();
  const currentChainByDigest = new Map<string, string>();

  for (const fingerprint of previousChainFingerprints) {
    const [productId, chainDigest, chainStatus] = fingerprint.split(":");
    if (productId && chainDigest && chainStatus) {
      previousChainByDigest.set(`${productId}:${chainDigest}`, chainStatus);
    }
  }
  for (const fingerprint of currentChainFingerprints) {
    const [productId, chainDigest, chainStatus] = fingerprint.split(":");
    if (productId && chainDigest && chainStatus) {
      currentChainByDigest.set(`${productId}:${chainDigest}`, chainStatus);
    }
  }

  const addedChains = chainMetricsComparable
    ? [...currentChainByDigest.keys()].filter((key) => !previousChainByDigest.has(key))
    : [];
  const removedChains = chainMetricsComparable
    ? [...previousChainByDigest.keys()].filter((key) => !currentChainByDigest.has(key))
    : [];
  const sharedChains = chainMetricsComparable
    ? [...currentChainByDigest.keys()].filter((key) => previousChainByDigest.has(key))
    : [];
  const changedChains = sharedChains.filter(
    (key) => currentChainByDigest.get(key) !== previousChainByDigest.get(key),
  );
  const stabilizedChains = sharedChains.filter(
    (key) => currentChainByDigest.get(key) === previousChainByDigest.get(key),
  );
  const regressedChains = sharedChains.filter(
    (key) =>
      scoreStatus(currentChainByDigest.get(key) ?? "OBSERVED", ["OBSERVED", "VERIFIED", "REPRODUCIBLE"]) <
      scoreStatus(previousChainByDigest.get(key) ?? "OBSERVED", ["OBSERVED", "VERIFIED", "REPRODUCIBLE"]),
  );
  const reproducedChains = sharedChains.filter(
    (key) => currentChainByDigest.get(key) === "REPRODUCIBLE",
  );

  return materializeProjection({
    projectionType: "TrendProjection",
    generatedFrom: [
      {
        source_type: "foundation_metrics",
        source_ref: String(latest.epoch),
        source_digest: snapshotHash,
      },
      {
        source_type: "foundation_metrics",
        source_ref: String(previousSnapshot.epoch),
        source_digest: String(previousSnapshot.snapshot_hash ?? "UNVERIFIED"),
      },
    ],
    payload: {
      trend_status:
        regressions.length > 0 ? "REGRESSING" : improvements.length > 0 ? "IMPROVING" : "STABLE",
      latest_epoch: String(latest.epoch),
      previous_epoch: String(previousSnapshot.epoch),
      total_epochs: snapshots.length,
      snapshots,
      chain_delta: {
        comparable: chainMetricsComparable,
        added: addedChains.length,
        removed: removedChains.length,
        changed: changedChains.length,
        stabilized: stabilizedChains.length,
        reproduced: reproducedChains.length,
        regressed: regressedChains.length,
      },
      improvements,
      regressions,
      claim_boundary:
        "Architecture trend now tracks longitudinal foundation metrics plus stable execution-chain fingerprints and chain delta counts. Substrate LOC delta and full temporal proof-graph lineage are not yet included.",
    },
  });
}

export const TopologyDriftBuilder = {
  projectionType: "TopologyDriftProjection",
  build: materializeTopologyDriftProjection,
} as const;

export const TrendBuilder = {
  projectionType: "TrendProjection",
  build: materializeArchitectureTrendProjection,
} as const;
