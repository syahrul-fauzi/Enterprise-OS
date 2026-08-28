// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type { Projection } from "./projection-domain.js";
import { materializeProjection } from "./projection-materializers.js";

export type RuntimeInvocationEvent = {
  readonly timestamp_utc: string;
  readonly product_id: string;
  readonly plan_instance_id: string | null;
  readonly plan_id: string | null;
  readonly plan_digest: string | null;
  readonly capability_id: string;
  readonly operation_id: string;
  readonly source_ref: string;
  readonly success: boolean;
  readonly input_digest: string;
  readonly result_digest: string;
  readonly invocation_digest: string;
  readonly input: unknown;
  readonly result: unknown;
};

export type ExecutionPlanReport = {
  readonly plan_version: string;
  readonly product_id: string;
  readonly planner_descriptor_ref: string;
  readonly workspace_manifest_ref: string | null;
  readonly workspace_id: string;
  readonly normalized_workspace_id: string;
  readonly plan_id: string;
  readonly plan_digest: string;
  readonly plan_canonical_json_digest: string;
  readonly graph_id: string;
  readonly graph_digest: string;
  readonly projection_source: "execution_graph" | "registry_entries";
  readonly execution_graph_digest: string | null;
  readonly execution_graph_version: string | null;
  readonly capability_order: readonly string[];
  readonly dependency_order: readonly string[];
  readonly constraints: {
    readonly require_capabilities: readonly string[];
    readonly require_roles: readonly string[];
    readonly missing_required_slots: readonly string[];
    readonly fatal_issues: readonly string[];
    readonly warnings: readonly string[];
    readonly fallbacks_needed: readonly {
      readonly type: string;
      readonly reference_id: string;
      readonly capability_id: string | null;
      readonly slot_id: string | null;
    }[];
  };
  readonly expected_evidence: readonly string[];
  readonly expected_replay: {
    readonly command: string;
    readonly expected_status: "PASS";
  };
  readonly generated_from: readonly {
    readonly source_type: string;
    readonly source_ref: string;
    readonly source_digest: string;
  }[];
  readonly generated_at_utc: string;
  readonly claim_boundary: string;
};

export type PlanInstanceReport = {
  readonly plan_instance_version: string;
  readonly plan_instance_id: string;
  readonly plan_instance_digest: string;
  readonly product_id: string;
  readonly plan_id: string;
  readonly plan_digest: string;
  readonly execution_scope: "verify-product";
  readonly issued_at_utc: string;
  readonly claim_boundary: string;
};

type ExecutionChainStatus = "OBSERVED" | "VERIFIED" | "REPRODUCIBLE";

type ExecutionChainProjectedEdge = {
  readonly edge_id: string;
  readonly edge_digest: string;
  readonly from: string;
  readonly to: string;
  readonly topology_layer: "observed";
  readonly edge_type: "runtime" | "evidence" | "verification" | "replay";
  readonly claim_status: "OBSERVED" | "VERIFIED";
  readonly lifecycle_state: "ACTIVE" | "EXECUTED" | "VERIFIED" | "REPLAYABLE";
  readonly declared: false;
  readonly observed: true;
  readonly created_by_chain: string;
  readonly plan_instance_id: string;
  readonly source_ref: string;
  readonly evidence_ref: string | null;
};

type ExecutionTimelineEvent = {
  readonly event_id: string;
  readonly timestamp_utc: string;
  readonly sequence: number;
  readonly event_type:
    | "plan_lifecycle"
    | "plan_instance_lifecycle"
    | "invocation_lifecycle"
    | "edge_lifecycle";
  readonly node_id: string | null;
  readonly edge_id: string | null;
  readonly transition: string;
  readonly lifecycle_state:
    | "CREATED"
    | "MATERIALIZED"
    | "SCHEDULED"
    | "STARTED"
    | "COMPLETED"
    | "VERIFIED"
    | "REPLAYABLE"
    | "ACTIVE"
    | "EXECUTED";
  readonly actor: string;
  readonly cause: string;
  readonly evidence_ref: string | null;
  readonly evidence_digest: string | null;
  readonly plan_instance_id: string;
  readonly chain_id: string | null;
};

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

function sha256Digest(value: unknown): string {
  return DigestEngine.digest(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function collectStrings(value: unknown, keys: readonly string[]): readonly string[] {
  const record = asRecord(value);
  if (!record) {
    return [];
  }
  return unique(
    keys
      .flatMap((key) => {
        const candidate = record[key];
        if (typeof candidate === "string") {
          return [candidate];
        }
        return asStringArray(candidate);
      })
      .filter((entry) => entry.length > 0),
  );
}

function stableNodeId(prefix: string, value: string): string {
  return `${prefix}:${value.trim()}`;
}

function stableEdgeId(input: {
  readonly topology_layer: "declared" | "observed";
  readonly from: string;
  readonly to: string;
  readonly edge_type: string;
}): string {
  const digest = sha256Digest({
    topology_layer: input.topology_layer,
    from: input.from,
    to: input.to,
    edge_type: input.edge_type,
  });
  return `EDGE:${digest.slice(0, 16)}`;
}

function rankChainStatus(value: string): number {
  switch (value) {
    case "REPRODUCIBLE":
      return 3;
    case "VERIFIED":
      return 2;
    case "OBSERVED":
      return 1;
    default:
      return 0;
  }
}

function mergeChainStatus(left: string, right: string): string {
  return rankChainStatus(left) >= rankChainStatus(right) ? left : right;
}

function observedEdgeClaimStatus(chainStatus: ExecutionChainStatus): "OBSERVED" | "VERIFIED" {
  return chainStatus === "OBSERVED" ? "OBSERVED" : "VERIFIED";
}

function observedEdgeLifecycleState(
  edgeType: ExecutionChainProjectedEdge["edge_type"],
  chainStatus: ExecutionChainStatus,
): ExecutionChainProjectedEdge["lifecycle_state"] {
  switch (edgeType) {
    case "runtime":
      return chainStatus === "OBSERVED" ? "ACTIVE" : "EXECUTED";
    case "evidence":
      return "EXECUTED";
    case "verification":
      return "VERIFIED";
    case "replay":
      return "REPLAYABLE";
  }
}

function buildObservedProjectedEdges(input: {
  readonly productId: string;
  readonly chainId: string;
  readonly chainStatus: ExecutionChainStatus;
  readonly planInstanceId: string;
  readonly requirementNodeIds: readonly string[];
  readonly workflowNodeIds: readonly string[];
  readonly planNodeIds: readonly string[];
  readonly planInstanceNodeId: string;
  readonly capabilityNodeId: string;
  readonly operationNodeId: string;
  readonly invocationNodeIds: readonly string[];
  readonly evidenceNodeIds: readonly string[];
  readonly replayNodeIds: readonly string[];
  readonly verificationNodeIds: readonly string[];
}): readonly ExecutionChainProjectedEdge[] {
  const orderedGroups: readonly {
    readonly ids: readonly string[];
    readonly edge_type: ExecutionChainProjectedEdge["edge_type"];
  }[] = [
    { ids: [`product:${input.productId}`], edge_type: "runtime" as const },
    { ids: input.requirementNodeIds, edge_type: "runtime" as const },
    { ids: input.workflowNodeIds, edge_type: "runtime" as const },
    { ids: input.planNodeIds, edge_type: "runtime" as const },
    { ids: [input.planInstanceNodeId], edge_type: "runtime" as const },
    { ids: [input.capabilityNodeId], edge_type: "runtime" as const },
    { ids: [input.operationNodeId], edge_type: "runtime" as const },
    { ids: input.invocationNodeIds, edge_type: "runtime" as const },
    { ids: input.evidenceNodeIds, edge_type: "evidence" as const },
    { ids: input.replayNodeIds, edge_type: "replay" as const },
    { ids: input.verificationNodeIds, edge_type: "verification" as const },
  ].filter((group) => group.ids.length > 0);

  const edges: ExecutionChainProjectedEdge[] = [];
  for (let index = 0; index < orderedGroups.length - 1; index += 1) {
    const fromGroup = orderedGroups[index]!;
    const toGroup = orderedGroups[index + 1]!;
    for (const from of fromGroup.ids) {
      for (const to of toGroup.ids) {
        const edgeId = stableEdgeId({
          topology_layer: "observed",
          from,
          to,
          edge_type: toGroup.edge_type,
        });
        const claimStatus = observedEdgeClaimStatus(input.chainStatus);
        const lifecycleState = observedEdgeLifecycleState(toGroup.edge_type, input.chainStatus);
        edges.push({
          edge_id: edgeId,
          edge_digest: sha256Digest({
            edge_id: edgeId,
            from,
            to,
            edge_type: toGroup.edge_type,
            claim_status: claimStatus,
            lifecycle_state: lifecycleState,
            plan_instance_id: input.planInstanceId,
            created_by_chain: input.chainId,
          }),
          from,
          to,
          topology_layer: "observed",
          edge_type: toGroup.edge_type,
          claim_status: claimStatus,
          lifecycle_state: lifecycleState,
          declared: false,
          observed: true,
          created_by_chain: input.chainId,
          plan_instance_id: input.planInstanceId,
          source_ref: `${input.productId}:${input.chainId}`,
          evidence_ref: input.chainId,
        });
      }
    }
  }

  return edges.sort(
    (left, right) =>
      left.from.localeCompare(right.from) ||
      left.edge_type.localeCompare(right.edge_type) ||
      left.to.localeCompare(right.to),
  );
}

export function materializeExecutionChainProjection(input: {
  readonly productId: string;
  readonly replayPassed: boolean;
  readonly events: readonly RuntimeInvocationEvent[];
  readonly runtimeInvocationReport: Record<string, unknown>;
  readonly executionPlan: ExecutionPlanReport;
  readonly planInstance: PlanInstanceReport;
}): Projection<Record<string, unknown>> {
  const invocationCounts = new Map<string, number>();
  for (const event of input.events) {
    invocationCounts.set(event.invocation_digest, (invocationCounts.get(event.invocation_digest) ?? 0) + 1);
  }

  const runtimeCapabilityStatus = new Map<string, string>(
    (
      input.runtimeInvocationReport.capabilities as
        | readonly { readonly capability_id: string; readonly status: string }[]
        | undefined
    )?.map((entry) => [entry.capability_id, entry.status]) ?? [],
  );
  const aggregatedChains = new Map<string, Record<string, unknown>>();
  const planInstanceNodeId = stableNodeId("PI", input.planInstance.plan_instance_id);
  const replayNodeId = stableNodeId("REP", `${input.productId}:composition-replay`);

  for (const event of input.events) {
    const resultRecord = asRecord(event.result);
    const outputRecord = asRecord(resultRecord?.output);
    const matchedArtifacts = Array.isArray(resultRecord?.matchedArtifacts)
      ? (resultRecord?.matchedArtifacts as readonly unknown[])
      : [];
    const workflowSteps = Array.isArray(resultRecord?.steps)
      ? (resultRecord?.steps as readonly unknown[])
      : [];

    const requirementIds = unique([
      ...collectStrings(event.input, ["requirementId", "id", "requirementRef"]),
      ...collectStrings(event.result, ["requirementId", "requirementRef"]),
      ...collectStrings(outputRecord, ["requirementId", "requirementRef"]),
      ...matchedArtifacts.flatMap((artifact) => collectStrings(artifact, ["requirementIds", "externalRequirementRefs"])),
    ]);
    const workflowIds = unique([
      ...collectStrings(event.input, ["workflowId"]),
      ...collectStrings(event.result, ["workflowId"]),
      ...workflowSteps.flatMap((step) => collectStrings(step, ["workflowId", "stepId"])),
    ]);
    const planIds = unique([
      ...collectStrings(event.input, ["planId"]),
      ...collectStrings(event.result, ["planId"]),
      input.executionPlan.plan_id,
    ]);
    const evidenceRefs = unique([
      ...collectStrings(outputRecord, ["evidencePaths", "requirementRefs"]),
      ...matchedArtifacts.flatMap((artifact) => collectStrings(artifact, ["reference"])),
    ]);
    const verificationRefs = unique([
      ...collectStrings(event.result, ["verificationStatus"]),
      ...collectStrings(outputRecord, ["verificationStatus"]),
      ...matchedArtifacts.flatMap((artifact) => collectStrings(artifact, ["verification"])),
    ]);
    const capabilityRefs = unique([
      event.capability_id,
      ...collectStrings(event.result, ["linkedCapabilityIds"]),
      ...collectStrings(outputRecord, ["linkedCapabilityIds"]),
      ...matchedArtifacts.flatMap((artifact) => collectStrings(artifact, ["linkedCapabilityIds"])),
    ]);

    const causalStatus =
      invocationCounts.get(event.invocation_digest)! > 1 && input.replayPassed
        ? "REPRODUCIBLE"
        : event.success
          ? "VERIFIED"
          : "OBSERVED";
    const stableStructure = {
      product_id: input.productId,
      requirement_node_ids: requirementIds.map((entry) => stableNodeId("REQ", entry)),
      workflow_node_ids: workflowIds.map((entry) => stableNodeId("WF", entry)),
      plan_node_ids: planIds.map((entry) => stableNodeId("PLAN", entry)),
      plan_instance_node_id: planInstanceNodeId,
      capability_node_id: stableNodeId("CAP", event.capability_id),
      operation_node_id: stableNodeId("OP", `${event.capability_id}:${event.operation_id}`),
      evidence_node_ids: evidenceRefs.map((entry) => stableNodeId("EVID", entry)),
      verification_node_ids: verificationRefs.map((entry) => stableNodeId("VER", entry)),
      replay_node_ids: [replayNodeId],
    } as const;
    const chainDigest = sha256Digest(stableStructure);
    const chainId = `chain:${chainDigest.slice(0, 16)}`;
    const invocationId = stableNodeId("INV", `${input.productId}:${event.timestamp_utc}:${event.invocation_digest}`);
    const chainRecord = aggregatedChains.get(chainDigest);
    const projectedEdges = buildObservedProjectedEdges({
      productId: input.productId,
      chainId,
      chainStatus: causalStatus,
      planInstanceId: event.plan_instance_id ?? input.planInstance.plan_instance_id,
      requirementNodeIds: stableStructure.requirement_node_ids,
      workflowNodeIds: stableStructure.workflow_node_ids,
      planNodeIds: stableStructure.plan_node_ids,
      planInstanceNodeId,
      capabilityNodeId: stableStructure.capability_node_id,
      operationNodeId: stableStructure.operation_node_id,
      invocationNodeIds: [invocationId],
      evidenceNodeIds: stableStructure.evidence_node_ids,
      replayNodeIds: stableStructure.replay_node_ids,
      verificationNodeIds: stableStructure.verification_node_ids,
    });

    if (!chainRecord) {
      aggregatedChains.set(chainDigest, {
        chain_id: chainId,
        chain_digest: chainDigest,
        product_id: input.productId,
        plan_id: input.executionPlan.plan_id,
        plan_digest: input.executionPlan.plan_digest,
        plan_instance_id: event.plan_instance_id ?? input.planInstance.plan_instance_id,
        plan_instance_digest: input.planInstance.plan_instance_digest,
        plan_instance_node_id: planInstanceNodeId,
        requirement_ids: requirementIds,
        requirement_node_ids: stableStructure.requirement_node_ids,
        capability_id: event.capability_id,
        capability_node_id: stableStructure.capability_node_id,
        capability_refs: capabilityRefs,
        workflow_ids: workflowIds,
        workflow_node_ids: stableStructure.workflow_node_ids,
        orchestration_plan_ids: planIds,
        plan_node_ids: stableStructure.plan_node_ids,
        operation_id: event.operation_id,
        operation_node_id: stableStructure.operation_node_id,
        source_ref: event.source_ref,
        evidence_refs: evidenceRefs,
        evidence_node_ids: stableStructure.evidence_node_ids,
        verification_refs: verificationRefs,
        verification_node_ids: stableStructure.verification_node_ids,
        replay_node_ids: stableStructure.replay_node_ids,
        replay_status: input.replayPassed ? "PASS" : "FAIL",
        capability_status: runtimeCapabilityStatus.get(event.capability_id) ?? "OBSERVED",
        chain_status: causalStatus,
        invocation_count: 1,
        success_count: event.success ? 1 : 0,
        failure_count: event.success ? 0 : 1,
        reproducible_invocation_count: causalStatus === "REPRODUCIBLE" ? 1 : 0,
        invocation_ids: [invocationId],
        invocation_instances: [
          {
            invocation_id: invocationId,
            timestamp_utc: event.timestamp_utc,
            plan_instance_id: event.plan_instance_id ?? input.planInstance.plan_instance_id,
            plan_id: event.plan_id ?? input.executionPlan.plan_id,
            plan_digest: event.plan_digest ?? input.executionPlan.plan_digest,
            input_digest: event.input_digest,
            result_digest: event.result_digest,
            invocation_digest: event.invocation_digest,
            success: event.success,
          },
        ],
        projected_edges: projectedEdges,
        causal_coverage: {
          has_requirement: requirementIds.length > 0,
          has_workflow: workflowIds.length > 0,
          has_plan: planIds.length > 0,
          has_evidence: evidenceRefs.length > 0,
          has_verification: verificationRefs.length > 0,
        },
        stable_structure: stableStructure,
        claim_boundary:
          "Execution chain is derived from product verification runtime invocations plus workflow/traceability/evidence payloads already observed in the same run. Stable node IDs identify governance-relevant nodes across runs; invocation IDs remain run-instance specific.",
      });
      continue;
    }

    chainRecord.capability_refs = unique([...(chainRecord.capability_refs as readonly string[]), ...capabilityRefs]);
    chainRecord.evidence_refs = unique([...(chainRecord.evidence_refs as readonly string[]), ...evidenceRefs]);
    chainRecord.evidence_node_ids = unique([
      ...(chainRecord.evidence_node_ids as readonly string[]),
      ...stableStructure.evidence_node_ids,
    ]);
    chainRecord.verification_refs = unique([
      ...(chainRecord.verification_refs as readonly string[]),
      ...verificationRefs,
    ]);
    chainRecord.verification_node_ids = unique([
      ...(chainRecord.verification_node_ids as readonly string[]),
      ...stableStructure.verification_node_ids,
    ]);
    chainRecord.invocation_ids = unique([...(chainRecord.invocation_ids as readonly string[]), invocationId]);
    chainRecord.invocation_instances = [
      ...(chainRecord.invocation_instances as readonly unknown[]),
      {
        invocation_id: invocationId,
        timestamp_utc: event.timestamp_utc,
        plan_instance_id: event.plan_instance_id ?? input.planInstance.plan_instance_id,
        plan_id: event.plan_id ?? input.executionPlan.plan_id,
        plan_digest: event.plan_digest ?? input.executionPlan.plan_digest,
        input_digest: event.input_digest,
        result_digest: event.result_digest,
        invocation_digest: event.invocation_digest,
        success: event.success,
      },
    ];
    chainRecord.invocation_count = Number(chainRecord.invocation_count ?? 0) + 1;
    chainRecord.success_count = Number(chainRecord.success_count ?? 0) + (event.success ? 1 : 0);
    chainRecord.failure_count = Number(chainRecord.failure_count ?? 0) + (event.success ? 0 : 1);
    chainRecord.reproducible_invocation_count =
      Number(chainRecord.reproducible_invocation_count ?? 0) + (causalStatus === "REPRODUCIBLE" ? 1 : 0);
    chainRecord.chain_status = mergeChainStatus(String(chainRecord.chain_status ?? "OBSERVED"), causalStatus);
    chainRecord.capability_status = mergeChainStatus(
      String(chainRecord.capability_status ?? "OBSERVED"),
      runtimeCapabilityStatus.get(event.capability_id) ?? "OBSERVED",
    );
    chainRecord.causal_coverage = {
      has_requirement:
        Boolean((chainRecord.causal_coverage as Record<string, unknown>)?.has_requirement) ||
        requirementIds.length > 0,
      has_workflow:
        Boolean((chainRecord.causal_coverage as Record<string, unknown>)?.has_workflow) ||
        workflowIds.length > 0,
      has_plan: Boolean((chainRecord.causal_coverage as Record<string, unknown>)?.has_plan) || planIds.length > 0,
      has_evidence:
        Boolean((chainRecord.causal_coverage as Record<string, unknown>)?.has_evidence) ||
        evidenceRefs.length > 0,
      has_verification:
        Boolean((chainRecord.causal_coverage as Record<string, unknown>)?.has_verification) ||
        verificationRefs.length > 0,
    };
    chainRecord.projected_edges = buildObservedProjectedEdges({
      productId: input.productId,
      chainId,
      chainStatus: String(chainRecord.chain_status ?? "OBSERVED") as ExecutionChainStatus,
      planInstanceId: String(chainRecord.plan_instance_id ?? input.planInstance.plan_instance_id),
      requirementNodeIds: chainRecord.requirement_node_ids as readonly string[],
      workflowNodeIds: chainRecord.workflow_node_ids as readonly string[],
      planNodeIds: chainRecord.plan_node_ids as readonly string[],
      planInstanceNodeId: String(chainRecord.plan_instance_node_id ?? planInstanceNodeId),
      capabilityNodeId: String(chainRecord.capability_node_id ?? stableStructure.capability_node_id),
      operationNodeId: String(chainRecord.operation_node_id ?? stableStructure.operation_node_id),
      invocationNodeIds: chainRecord.invocation_ids as readonly string[],
      evidenceNodeIds: chainRecord.evidence_node_ids as readonly string[],
      replayNodeIds: chainRecord.replay_node_ids as readonly string[],
      verificationNodeIds: chainRecord.verification_node_ids as readonly string[],
    });
  }

  const chains = Array.from(aggregatedChains.values()).sort(
    (left, right) =>
      String(left.capability_id).localeCompare(String(right.capability_id)) ||
      String(left.operation_id).localeCompare(String(right.operation_id)) ||
      String(left.chain_id).localeCompare(String(right.chain_id)),
  );
  const uniqueChainDigests = chains.map((chain) => String(chain.chain_digest));
  const hasCoverage = (
    chain: Record<string, unknown>,
    key: "has_requirement" | "has_workflow" | "has_plan" | "has_evidence" | "has_verification",
  ): boolean => Boolean((chain.causal_coverage as Record<string, unknown> | undefined)?.[key]);
  const chainProjectionDigest = sha256Digest(
    chains.map((chain) => ({
      chain_id: chain.chain_id,
      chain_digest: chain.chain_digest,
      chain_status: chain.chain_status,
      projected_edges: chain.projected_edges,
    })),
  );

  return materializeProjection({
    projectionType: "ExecutionChainProjection",
    generatedFrom: [
      {
        source_type: "runtime_invocation_evidence",
        source_ref: `runtime-invocations:${input.productId}`,
        source_digest: sha256Digest(
          input.events.map((event) => ({
            invocation_digest: event.invocation_digest,
            capability_id: event.capability_id,
            operation_id: event.operation_id,
            input_digest: event.input_digest,
            result_digest: event.result_digest,
          })),
        ),
      },
      {
        source_type: "execution_plan",
        source_ref: input.executionPlan.plan_id,
        source_digest: input.executionPlan.plan_digest,
      },
      {
        source_type: "plan_instance",
        source_ref: input.planInstance.plan_instance_id,
        source_digest: input.planInstance.plan_instance_digest,
      },
    ],
    projectionDigest: chainProjectionDigest,
    payload: {
      product_id: input.productId,
      chain_projection_version: "1.0.0",
      summary: {
        plan_instance_id: input.planInstance.plan_instance_id,
        total_invocations: input.events.length,
        total_chains: chains.length,
        unique_chain_digests: uniqueChainDigests.length,
        chains_with_requirement: chains.filter((chain) => hasCoverage(chain, "has_requirement")).length,
        chains_with_workflow: chains.filter((chain) => hasCoverage(chain, "has_workflow")).length,
        chains_with_plan: chains.filter((chain) => hasCoverage(chain, "has_plan")).length,
        chains_with_evidence: chains.filter((chain) => hasCoverage(chain, "has_evidence")).length,
        chains_with_verification: chains.filter((chain) => hasCoverage(chain, "has_verification")).length,
        verified_chains: chains.filter((chain) => chain.chain_status === "VERIFIED" || chain.chain_status === "REPRODUCIBLE").length,
        reproducible_chains: chains.filter((chain) => chain.chain_status === "REPRODUCIBLE").length,
        stable_chains: chains.filter((chain) => Number(chain.invocation_count) > 1).length,
        total_projected_edges: chains.reduce(
          (sum, chain) => sum + ((chain.projected_edges as readonly unknown[] | undefined)?.length ?? 0),
          0,
        ),
        chain_projection_digest: chainProjectionDigest,
      },
      chains,
      claim_boundary:
        "Execution chain is a deterministic derivation from runtime invocation evidence and existing verification artifacts. It is not a new source of truth; it is a proof-oriented causal view over the verified product run. Stable chain digests track governance-relevant structure across epochs, while invocation instances remain run-specific.",
    },
  });
}

export function materializeExecutionTimelineProjection(input: {
  readonly productId: string;
  readonly replayPassed: boolean;
  readonly executionPlan: ExecutionPlanReport;
  readonly planInstance: PlanInstanceReport;
  readonly executionChainReport: Projection<Record<string, unknown>>;
  readonly testsStartedAtUtc: string;
  readonly testsCompletedAtUtc: string;
  readonly replayValidatedAtUtc: string;
}): Projection<Record<string, unknown>> {
  const events: ExecutionTimelineEvent[] = [];
  const planNodeId = stableNodeId("PLAN", input.executionPlan.plan_id);
  const planInstanceNodeId = stableNodeId("PI", input.planInstance.plan_instance_id);
  const chains = Array.isArray(input.executionChainReport.payload.chains)
    ? (input.executionChainReport.payload.chains as readonly Record<string, unknown>[])
    : [];
  const invocationTimestamps = chains.flatMap((chain) =>
    Array.isArray(chain.invocation_instances)
      ? (chain.invocation_instances as readonly Record<string, unknown>[])
          .map((instance) => String(instance.timestamp_utc ?? ""))
          .filter((timestamp) => timestamp.length > 0)
      : [],
  );
  const earliestInvocationUtc =
    invocationTimestamps.slice().sort((left, right) => left.localeCompare(right))[0] ?? input.testsStartedAtUtc;
  const latestInvocationUtc =
    invocationTimestamps.slice().sort((left, right) => right.localeCompare(left))[0] ?? input.testsCompletedAtUtc;

  const pushEvent = (event: Omit<ExecutionTimelineEvent, "event_id" | "sequence">): void => {
    const sequence = events.length + 1;
    events.push({
      ...event,
      sequence,
      event_id: `EVT:${sha256Digest({
        sequence,
        timestamp_utc: event.timestamp_utc,
        event_type: event.event_type,
        node_id: event.node_id,
        edge_id: event.edge_id,
        transition: event.transition,
        plan_instance_id: event.plan_instance_id,
        chain_id: event.chain_id,
      }).slice(0, 16)}`,
    });
  };

  pushEvent({
    timestamp_utc: input.executionPlan.generated_at_utc,
    event_type: "plan_lifecycle",
    node_id: planNodeId,
    edge_id: null,
    transition: "PLAN_CREATED",
    lifecycle_state: "CREATED",
    actor: "planner",
    cause: "execution_plan_materialized",
    evidence_ref: input.executionPlan.plan_id,
    evidence_digest: input.executionPlan.plan_digest,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: input.executionPlan.generated_at_utc,
    event_type: "plan_lifecycle",
    node_id: planNodeId,
    edge_id: null,
    transition: "PLAN_MATERIALIZED",
    lifecycle_state: "MATERIALIZED",
    actor: "planner",
    cause: "planner_safe_descriptor_projection",
    evidence_ref: input.executionPlan.plan_id,
    evidence_digest: input.executionPlan.plan_digest,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: input.planInstance.issued_at_utc,
    event_type: "plan_instance_lifecycle",
    node_id: planInstanceNodeId,
    edge_id: null,
    transition: "PLAN_INSTANCE_CREATED",
    lifecycle_state: "CREATED",
    actor: "verify-product",
    cause: "deterministic_plan_instantiation",
    evidence_ref: input.planInstance.plan_instance_id,
    evidence_digest: input.planInstance.plan_instance_digest,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: input.planInstance.issued_at_utc,
    event_type: "plan_instance_lifecycle",
    node_id: planInstanceNodeId,
    edge_id: null,
    transition: "PLAN_INSTANCE_SCHEDULED",
    lifecycle_state: "SCHEDULED",
    actor: "verify-product",
    cause: "verification_run_prepared",
    evidence_ref: input.planInstance.plan_instance_id,
    evidence_digest: input.planInstance.plan_instance_digest,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: earliestInvocationUtc,
    event_type: "plan_instance_lifecycle",
    node_id: planInstanceNodeId,
    edge_id: null,
    transition: "PLAN_INSTANCE_STARTED",
    lifecycle_state: "STARTED",
    actor: "runtime",
    cause: "first_runtime_invocation_observed",
    evidence_ref: input.planInstance.plan_instance_id,
    evidence_digest: null,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });

  for (const chain of chains) {
    const chainId = String(chain.chain_id ?? "UNVERIFIED");
    const invocationInstances = Array.isArray(chain.invocation_instances)
      ? (chain.invocation_instances as readonly Record<string, unknown>[])
      : [];
    for (const invocation of invocationInstances) {
      pushEvent({
        timestamp_utc: String(invocation.timestamp_utc ?? input.testsCompletedAtUtc),
        event_type: "invocation_lifecycle",
        node_id: String(invocation.invocation_id ?? null),
        edge_id: null,
        transition: "INVOCATION_COMPLETED",
        lifecycle_state: "COMPLETED",
        actor: "runtime",
        cause: String(chain.operation_node_id ?? "operation_execution_observed"),
        evidence_ref: String(invocation.invocation_digest ?? null),
        evidence_digest: String(invocation.result_digest ?? null),
        plan_instance_id: input.planInstance.plan_instance_id,
        chain_id: chainId,
      });
    }

    const projectedEdges = Array.isArray(chain.projected_edges)
      ? (chain.projected_edges as readonly Record<string, unknown>[])
      : [];
    const chainTimestamp =
      invocationInstances
        .map((invocation) => String(invocation.timestamp_utc ?? ""))
        .filter((timestamp) => timestamp.length > 0)
        .sort((left, right) => left.localeCompare(right))[0] ?? earliestInvocationUtc;

    for (const edge of projectedEdges) {
      const lifecycleState = String(edge.lifecycle_state ?? "ACTIVE");
      const timestampUtc =
        lifecycleState === "REPLAYABLE"
          ? input.replayValidatedAtUtc
          : lifecycleState === "VERIFIED"
            ? input.testsCompletedAtUtc
            : chainTimestamp;
      pushEvent({
        timestamp_utc: timestampUtc,
        event_type: "edge_lifecycle",
        node_id: null,
        edge_id: String(edge.edge_id ?? null),
        transition: `EDGE_${lifecycleState}`,
        lifecycle_state:
          lifecycleState === "REPLAYABLE"
            ? "REPLAYABLE"
            : lifecycleState === "VERIFIED"
              ? "VERIFIED"
              : lifecycleState === "EXECUTED"
                ? "EXECUTED"
                : "ACTIVE",
        actor:
          lifecycleState === "REPLAYABLE"
            ? "replay"
            : lifecycleState === "VERIFIED"
              ? "verification"
              : "runtime",
        cause: `${String(edge.from ?? "unknown")} -> ${String(edge.to ?? "unknown")}`,
        evidence_ref: String(edge.evidence_ref ?? chainId),
        evidence_digest: String(edge.edge_digest ?? null),
        plan_instance_id: input.planInstance.plan_instance_id,
        chain_id: chainId,
      });
    }
  }

  pushEvent({
    timestamp_utc: latestInvocationUtc,
    event_type: "plan_instance_lifecycle",
    node_id: planInstanceNodeId,
    edge_id: null,
    transition: "PLAN_INSTANCE_COMPLETED",
    lifecycle_state: "COMPLETED",
    actor: "runtime",
    cause: "last_runtime_invocation_observed",
    evidence_ref: input.planInstance.plan_instance_id,
    evidence_digest: null,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: input.testsCompletedAtUtc,
    event_type: "plan_instance_lifecycle",
    node_id: planInstanceNodeId,
    edge_id: null,
    transition: "PLAN_INSTANCE_VERIFIED",
    lifecycle_state: "VERIFIED",
    actor: "verification",
    cause: "functional_test_suite_passed",
    evidence_ref: "functional-test-report.json",
    evidence_digest: null,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  pushEvent({
    timestamp_utc: input.testsCompletedAtUtc,
    event_type: "plan_lifecycle",
    node_id: planNodeId,
    edge_id: null,
    transition: "PLAN_VERIFIED",
    lifecycle_state: "VERIFIED",
    actor: "verification",
    cause: "plan_instance_verified",
    evidence_ref: "verification-summary.md",
    evidence_digest: input.planInstance.plan_instance_digest,
    plan_instance_id: input.planInstance.plan_instance_id,
    chain_id: null,
  });
  if (input.replayPassed) {
    pushEvent({
      timestamp_utc: input.replayValidatedAtUtc,
      event_type: "plan_lifecycle",
      node_id: planNodeId,
      edge_id: null,
      transition: "PLAN_REPLAYABLE",
      lifecycle_state: "REPLAYABLE",
      actor: "replay",
      cause: "composition_replay_passed",
      evidence_ref: "composition-replay.json",
      evidence_digest: input.planInstance.plan_instance_digest,
      plan_instance_id: input.planInstance.plan_instance_id,
      chain_id: null,
    });
  }

  const sortedEvents = events.sort(
    (left, right) =>
      left.timestamp_utc.localeCompare(right.timestamp_utc) || left.sequence - right.sequence,
  );

  return materializeProjection({
    projectionType: "ExecutionTimelineProjection",
    generatedFrom: [
      {
        source_type: "execution_plan",
        source_ref: input.executionPlan.plan_id,
        source_digest: input.executionPlan.plan_digest,
      },
      {
        source_type: "plan_instance",
        source_ref: input.planInstance.plan_instance_id,
        source_digest: input.planInstance.plan_instance_digest,
      },
      {
        source_type: "execution_chain",
        source_ref: `${input.productId}:${input.planInstance.plan_instance_id}`,
        source_digest: String(
          (input.executionChainReport.payload.summary as Record<string, unknown> | undefined)
            ?.chain_projection_digest ?? "UNVERIFIED",
        ),
      },
    ],
    payload: {
      timeline_version: "1.0.0",
      product_id: input.productId,
      plan_id: input.executionPlan.plan_id,
      plan_digest: input.executionPlan.plan_digest,
      plan_instance_id: input.planInstance.plan_instance_id,
      summary: {
        total_events: sortedEvents.length,
        node_lifecycle_events: sortedEvents.filter((event) => event.node_id !== null).length,
        edge_lifecycle_events: sortedEvents.filter((event) => event.edge_id !== null).length,
        first_event_utc: sortedEvents[0]?.timestamp_utc ?? input.planInstance.issued_at_utc,
        last_event_utc: sortedEvents[sortedEvents.length - 1]?.timestamp_utc ?? input.testsCompletedAtUtc,
      },
      events: sortedEvents.map((event, index) => ({
        ...event,
        sequence: index + 1,
      })),
      claim_boundary:
        "Execution Timeline is a temporal event stream derived from plan materialization, plan-instance issuance, observed runtime invocation completions, and verification/replay milestones in the same verification run. Invocation start times are not independently observed yet; runtime lifecycle coverage is therefore completion-biased until entry instrumentation is materialized.",
    },
  });
}

export const ExecutionChainBuilder = {
  projectionType: "ExecutionChainProjection",
  build: materializeExecutionChainProjection,
} as const;

export const ExecutionTimelineBuilder = {
  projectionType: "ExecutionTimelineProjection",
  build: materializeExecutionTimelineProjection,
} as const;

export const buildExecutionChainProjection = materializeExecutionChainProjection;
export const buildExecutionTimelineProjection = materializeExecutionTimelineProjection;
