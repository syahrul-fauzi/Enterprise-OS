import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveProjectionStorageLocation } from "./projections.js";
import type {
  PlanInstanceReport,
  RuntimeInvocationEvent,
} from "./product-projection-materializers.js";

export type ProductFunctionalTestCase = {
  readonly id: string;
  readonly name: string;
  readonly status: "PASS";
};

export type ProductFunctionalTestReport = {
  readonly product: string;
  readonly status: "PASS" | "FAIL";
  readonly reporter: "tap";
  readonly summary: {
    readonly total: number;
    readonly pass: number;
    readonly fail: number;
    readonly skipped: number;
    readonly todo: number;
    readonly cancelled: number;
  };
  readonly test_cases: readonly ProductFunctionalTestCase[];
};

export type ProductEvidenceFiles = {
  readonly replay: string;
  readonly tests: string;
  readonly clr: string;
  readonly matrix: string;
  readonly tree: string;
  readonly atomicLeverage: string;
  readonly proof: string;
  readonly runtimeInvocations: string;
  readonly runtimeInvocationReport: string;
  readonly executionPlan: string;
  readonly executionChain: string;
  readonly executionTimeline: string;
  readonly runtimeVerificationProjection: string;
  readonly runtimeVerificationEvidence: string;
  readonly summary: string;
};

function unique(values: readonly string[]): readonly string[] {
  return Array.from(new Set(values));
}

export function resolveProductEvidenceFiles(input: {
  readonly evidenceDir: string;
}): ProductEvidenceFiles {
  const runtimeInvocationsPath = resolve(input.evidenceDir, "runtime-invocations.jsonl");
  return {
    replay: resolve(input.evidenceDir, "composition-replay.json"),
    tests: resolve(input.evidenceDir, "functional-test-report.json"),
    clr: resolve(input.evidenceDir, "clr-report.json"),
    matrix: resolve(input.evidenceDir, "capability-mapping-matrix.csv"),
    tree: resolve(input.evidenceDir, "composition-tree.txt"),
    atomicLeverage: resolve(input.evidenceDir, "atomic-leverage-report.json"),
    proof: resolve(input.evidenceDir, "proof-of-composition.md"),
    runtimeInvocations: runtimeInvocationsPath,
    runtimeInvocationReport: resolve(input.evidenceDir, "runtime-invocation-report.json"),
    executionPlan: resolveProjectionStorageLocation({
      baseDir: input.evidenceDir,
      scope: "product_verification",
      projectionType: "ExecutionPlanProjection",
    }),
    executionChain: resolveProjectionStorageLocation({
      baseDir: input.evidenceDir,
      scope: "product_verification",
      projectionType: "ExecutionChainProjection",
    }),
    executionTimeline: resolveProjectionStorageLocation({
      baseDir: input.evidenceDir,
      scope: "product_verification",
      projectionType: "ExecutionTimelineProjection",
    }),
    runtimeVerificationProjection: resolveProjectionStorageLocation({
      baseDir: input.evidenceDir,
      scope: "product_verification",
      projectionType: "ProductVerificationProjection",
    }),
    runtimeVerificationEvidence: resolve(
      input.evidenceDir,
      "product-runtime-verification-evidence.json",
    ),
    summary: resolve(input.evidenceDir, "verification-summary.md"),
  };
}

export function readRuntimeInvocationEvents(path: string): readonly RuntimeInvocationEvent[] {
  if (!existsSync(path)) {
    return [];
  }

  return readFileSync(path, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as RuntimeInvocationEvent);
}

export function materializeCompositionReplayArtifact(input: {
  readonly productId: string;
  readonly compositionId: string;
  readonly planInstanceId: string;
  readonly planId: string;
  readonly planDigest: string;
  readonly validateOutput: string;
}): Record<string, unknown> {
  return {
    product: input.productId,
    plan_instance_id: input.planInstanceId,
    plan_id: input.planId,
    plan_digest: input.planDigest,
    composition: input.compositionId,
    validator: "packages/composition/src/scripts/validate-composition-package.ts",
    command:
      "pnpm --dir /root/Enterprise-OS/workspace exec node --import tsx packages/composition/src/scripts/validate-composition-package.ts packages/compositions/legal-workspace",
    status: "PASS",
    verification_scope: "composition_package_validation",
    claim_boundary:
      "This artifact verifies package-style composition replay for the current product, not full multi-product compose-and-run parity.",
    output: input.validateOutput.trim(),
  };
}

export function materializeFunctionalTestArtifact(input: {
  readonly testReport: ProductFunctionalTestReport;
  readonly planInstanceId: string;
  readonly planId: string;
  readonly planDigest: string;
}): Record<string, unknown> {
  return {
    ...input.testReport,
    plan_instance_id: input.planInstanceId,
    plan_id: input.planId,
    plan_digest: input.planDigest,
    command:
      "pnpm --dir /root/Enterprise-OS/workspace exec node --import tsx --test --test-reporter tap <test-files>",
  };
}

export function materializeRuntimeInvocationReport(input: {
  readonly productId: string;
  readonly replayPassed: boolean;
  readonly events: readonly RuntimeInvocationEvent[];
  readonly planInstance: PlanInstanceReport;
}): Record<string, unknown> {
  const groupedByCapability = new Map<string, RuntimeInvocationEvent[]>();
  for (const event of input.events) {
    const existing = groupedByCapability.get(event.capability_id) ?? [];
    existing.push(event);
    groupedByCapability.set(event.capability_id, existing);
  }

  const capabilities = Array.from(groupedByCapability.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([capabilityId, events]) => {
      const operations = new Map<string, RuntimeInvocationEvent[]>();
      for (const event of events) {
        const key = `${event.operation_id}:${event.input_digest}`;
        const existing = operations.get(key) ?? [];
        existing.push(event);
        operations.set(key, existing);
      }

      const operationReports = Array.from(operations.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, groupedEvents]) => {
          const [operationId, inputDigest] = key.split(":");
          const resultDigests = unique(groupedEvents.map((event) => event.result_digest));
          return {
            operation_id: operationId,
            input_digest: inputDigest,
            invocation_count: groupedEvents.length,
            success_count: groupedEvents.filter((event) => event.success).length,
            failure_count: groupedEvents.filter((event) => !event.success).length,
            result_digests: resultDigests,
            reproducible: groupedEvents.length > 1 && resultDigests.length === 1,
            source_refs: unique(groupedEvents.map((event) => event.source_ref)),
          };
        });

      const successCount = events.filter((event) => event.success).length;
      const failureCount = events.length - successCount;
      const reproducibleOperationCount = operationReports.filter((entry) => entry.reproducible).length;
      const status =
        successCount > 0 && failureCount === 0 && input.replayPassed && reproducibleOperationCount > 0
          ? "REPRODUCIBLE"
          : successCount > 0 && failureCount === 0
            ? "VERIFIED"
            : events.length > 0
              ? "OBSERVED"
              : "DECLARED";

      return {
        capability_id: capabilityId,
        status,
        invocation_count: events.length,
        success_count: successCount,
        failure_count: failureCount,
        operation_count: operationReports.length,
        reproducible_operation_count: reproducibleOperationCount,
        operations: operationReports,
      };
    });

  return {
    product_id: input.productId,
    plan_instance_id: input.planInstance.plan_instance_id,
    plan_id: input.planInstance.plan_id,
    plan_digest: input.planInstance.plan_digest,
    summary: {
      total_invocations: input.events.length,
      observed_capabilities: capabilities.length,
      verified_capabilities: capabilities.filter(
        (capability) =>
          capability.status === "VERIFIED" || capability.status === "REPRODUCIBLE",
      ).length,
      reproducible_capabilities: capabilities.filter((capability) => capability.status === "REPRODUCIBLE").length,
    },
    capabilities,
    claim_boundary:
      "Runtime invocation evidence is captured from actual capability service execution during product verification tests. REPRODUCIBLE currently requires stable repeated result digests inside the observed run plus PASS composition replay; cross-environment replay is not yet materialized per capability.",
  };
}
