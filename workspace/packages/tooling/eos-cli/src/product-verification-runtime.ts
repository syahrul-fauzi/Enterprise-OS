// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type {
  ExecutionPlanReport,
  PlanInstanceReport,
} from "./product-projection-materializers.js";
import { runCommand } from "./governance-runtime.js";

export type ProductExecutionPlanMaterializationInput = {
  readonly eosRoot: string;
  readonly workspaceRoot: string;
  readonly foundationExecutionGraphPath: string;
  readonly productId: string;
  readonly plannerDescriptorPath: string;
  readonly appManifestPath: string;
  readonly appTsconfigPath: string;
};

function sha256Digest(value: unknown): string {
  return DigestEngine.digest(value);
}

export function materializeProductExecutionPlan(
  input: ProductExecutionPlanMaterializationInput,
): ExecutionPlanReport {
  const output = runCommand(
    "pnpm",
    [
      "--dir",
      input.workspaceRoot,
      "exec",
      "node",
      "--import",
      "tsx",
      "packages/tooling/eos-cli/src/scripts/materialize-product-plan.ts",
      input.plannerDescriptorPath,
      input.productId,
      input.foundationExecutionGraphPath,
      input.appManifestPath,
    ],
    input.eosRoot,
    {
      TSX_TSCONFIG_PATH: input.appTsconfigPath,
    },
  );

  return JSON.parse(output) as ExecutionPlanReport;
}

export function materializeProductPlanInstance(input: {
  readonly executionPlan: ExecutionPlanReport;
  readonly productId: string;
  readonly issuedAtUtc?: string;
}): PlanInstanceReport {
  const issuedAtUtc = input.issuedAtUtc ?? new Date().toISOString();
  const planInstanceDigest = sha256Digest({
    product_id: input.productId,
    plan_id: input.executionPlan.plan_id,
    plan_digest: input.executionPlan.plan_digest,
    execution_scope: "verify-product",
    issued_at_utc: issuedAtUtc,
  });

  return {
    plan_instance_version: "1.0.0",
    plan_instance_id: `pi:${planInstanceDigest.slice(0, 16)}`,
    plan_instance_digest: planInstanceDigest,
    product_id: input.productId,
    plan_id: input.executionPlan.plan_id,
    plan_digest: input.executionPlan.plan_digest,
    execution_scope: "verify-product",
    issued_at_utc: issuedAtUtc,
    claim_boundary:
      "Plan Instance is the run-scoped causal identity that binds a deterministic Execution Plan to the specific verified execution attempt that produced runtime invocations, replay evidence, and verification artifacts.",
  };
}
