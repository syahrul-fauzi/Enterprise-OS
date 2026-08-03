import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createHash } from "node:crypto";

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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function digest(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

export function recordRuntimeInvocation(input: {
  readonly capabilityId: string;
  readonly operationId: string;
  readonly sourceRef: string;
  readonly success: boolean;
  readonly input: unknown;
  readonly result: unknown;
  readonly productId?: string;
}): void {
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) {
    return;
  }

  mkdirSync(dirname(evidencePath), { recursive: true });

  const event = {
    timestamp_utc: new Date().toISOString(),
    product_id: input.productId ?? process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID?.trim() ?? "unknown",
    plan_instance_id: process.env.EOS_RUNTIME_PLAN_INSTANCE_ID?.trim() ?? null,
    plan_id: process.env.EOS_RUNTIME_PLAN_ID?.trim() ?? null,
    plan_digest: process.env.EOS_RUNTIME_PLAN_DIGEST?.trim() ?? null,
    capability_id: input.capabilityId,
    operation_id: input.operationId,
    source_ref: input.sourceRef,
    success: input.success,
    input_digest: digest(input.input),
    result_digest: digest(input.result),
    invocation_digest: digest({
      capability_id: input.capabilityId,
      operation_id: input.operationId,
      input: input.input,
      result: input.result,
      success: input.success,
      source_ref: input.sourceRef,
      product_id: input.productId ?? process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID?.trim() ?? "unknown",
      plan_instance_id: process.env.EOS_RUNTIME_PLAN_INSTANCE_ID?.trim() ?? null,
      plan_id: process.env.EOS_RUNTIME_PLAN_ID?.trim() ?? null,
      plan_digest: process.env.EOS_RUNTIME_PLAN_DIGEST?.trim() ?? null,
    }),
    input: canonicalize(input.input),
    result: canonicalize(input.result),
  } satisfies RuntimeInvocationEvent;

  appendFileSync(evidencePath, `${JSON.stringify(event)}\n`, "utf8");
}
