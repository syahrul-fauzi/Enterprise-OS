import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import type { ExecutionGraphReport } from "@repo/core-capability-registry";
import type { ComposeInput, ComposeResult } from "@repo/composition";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

const [, , descriptorPathArg, productIdArg, executionGraphPathArg, workspaceManifestPathArg] =
  process.argv;
if (!descriptorPathArg || !productIdArg) {
  throw new Error(
    "Usage: materialize-product-plan.ts <planner-descriptor-path> <product-id> [execution-graph-path] [workspace-manifest-path]",
  );
}

const descriptorPath = resolve(descriptorPathArg);
const executionGraphPath = executionGraphPathArg ? resolve(executionGraphPathArg) : null;
const workspaceManifestPath = workspaceManifestPathArg ? resolve(workspaceManifestPathArg) : null;
const descriptorModule = await import(pathToFileURL(descriptorPath).href);
const descriptorSource =
  descriptorModule.compositionDescriptor ??
  descriptorModule.default ??
  descriptorModule.descriptorSource;
if (!descriptorSource?.workspace) {
  throw new Error(
    `Planner descriptor must export { compositionDescriptor }: ${descriptorPath}`,
  );
}

const executionGraph =
  executionGraphPath && existsSync(executionGraphPath)
    ? (JSON.parse(readFileSync(executionGraphPath, "utf8")) as ExecutionGraphReport)
    : null;

const composeModuleUrl = new URL(
  "../../../../composition/dist/compose/index.js",
  import.meta.url,
);
const { compose } = (await import(composeModuleUrl.href)) as {
  readonly compose: (input: ComposeInput) => ComposeResult;
};

const composed = compose({
  ...descriptorSource,
  resolver: {
    actor: { roles: ["admin"], permissions: [] },
    features: { flags: {} },
    executionGraph: executionGraph ?? undefined,
    requestId: `verify-product:${productIdArg}:execution-plan`,
  },
});

const expectedEvidence = [
  "composition-replay.json",
  "functional-test-report.json",
  "runtime-invocation-report.json",
  "execution-chain.json",
  "execution-timeline.json",
  "verification-summary.md",
] as const;

const expectedReplay = {
  command:
    "pnpm --dir /root/Enterprise-OS/workspace exec node --import tsx packages/composition/src/scripts/validate-composition-package.ts packages/compositions/legal-workspace",
  expected_status: "PASS" as const,
};

const artifact = {
  plan_version: "1.0.0",
  product_id: productIdArg,
  planner_descriptor_ref: descriptorPath,
  workspace_manifest_ref: workspaceManifestPath,
  workspace_id: String(composed.plan.workspaceId),
  normalized_workspace_id: String(composed.normalized.id),
  plan_id: composed.plan.id,
  plan_digest: String(composed.plan.canonicalHash),
  plan_canonical_json_digest: sha256(composed.plan.canonicalJson),
  graph_id: composed.graphId,
  graph_digest: composed.graphHash,
  projection_source: executionGraph ? "execution_graph" : "registry_entries",
  execution_graph_digest: executionGraph?.projection_digest ?? null,
  execution_graph_version: executionGraph?.projection_version ?? null,
  capability_order: composed.plan.capabilitiesRequiredOrder,
  dependency_order: composed.plan.dependenciesOrder,
  constraints: {
    require_capabilities: composed.plan.permissions.requireCapabilities,
    require_roles: composed.plan.permissions.requireRoles,
    missing_required_slots: composed.plan.validation.missingRequiredSlots,
    fatal_issues: composed.plan.validation.fatalIssues.map((issue) => issue.code),
    warnings: composed.plan.validation.warnings.map((issue) => issue.code),
    fallbacks_needed: composed.plan.fallbacksNeeded.map((entry) => ({
      type: entry.type,
      reference_id: entry.referenceId,
      capability_id: entry.capabilityId ?? null,
      slot_id: entry.slotId ?? null,
    })),
  },
  expected_evidence: expectedEvidence,
  expected_replay: expectedReplay,
  generated_from: [
    {
      source_type: "planner_descriptor",
      source_ref: descriptorPath,
      source_digest: sha256(readFileSync(descriptorPath, "utf8")),
    },
    ...(workspaceManifestPath
      ? [
          {
            source_type: "workspace_manifest",
            source_ref: workspaceManifestPath,
            source_digest: sha256(readFileSync(workspaceManifestPath, "utf8")),
          },
        ]
      : []),
    {
      source_type: executionGraph ? "execution_graph" : "registry_entries",
      source_ref: executionGraphPath ?? `registry:${basename(descriptorPath)}`,
      source_digest:
        executionGraph?.projection_digest ??
        sha256(composed.normalized.capabilitiesReferenced),
    },
  ],
  generated_at_utc: new Date().toISOString(),
  claim_boundary:
    "Execution Plan is a deterministic product-level planning artifact materialized from a planner-safe composition descriptor via compose(). It captures planner output, expected evidence, and replay expectations for the verified product run; it is not a runtime trace.",
};

process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
