import { appendFileSync, mkdirSync, readFileSync } from "fs";
import { dirname } from "path";
import { createHash } from "crypto";
import { executionContext } from "./execution-context";

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
  readonly decision_id: string | null;
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
  readonly decision_id?: string | null;
}): void {
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) {
    return;
  }

  mkdirSync(dirname(evidencePath), { recursive: true });

  const ambient = executionContext.get();
  
  const resolved_product_id = input.productId ?? ambient?.product_id ?? process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID?.trim() ?? "unknown";
  const resolved_decision_id = input.decision_id ?? ambient?.decision_id ?? null;

  const event = {
    timestamp_utc: new Date().toISOString(),
    product_id: resolved_product_id,
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
      product_id: resolved_product_id,
      plan_instance_id: process.env.EOS_RUNTIME_PLAN_INSTANCE_ID?.trim() ?? null,
      plan_id: process.env.EOS_RUNTIME_PLAN_ID?.trim() ?? null,
      plan_digest: process.env.EOS_RUNTIME_PLAN_DIGEST?.trim() ?? null,
      decision_id: resolved_decision_id,
    }),
    input: canonicalize(input.input),
    result: canonicalize(input.result),
    decision_id: resolved_decision_id,
  } satisfies RuntimeInvocationEvent;

  appendFileSync(evidencePath, `${JSON.stringify(event)}\n`, "utf8");
}

export function traceExecutionByDecision(decisionId: string): {
  readonly matchingExecutions: ReadonlyArray<{
    readonly runId: string | null;
    readonly timestamp_utc: string;
    readonly capability_id: string;
    readonly operation_id: string;
    readonly success: boolean;
    readonly decision_id: string | null;
    readonly product_id: string;
  }>;
  readonly totalMatches: number;
} {
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) {
    return { matchingExecutions: [], totalMatches: 0 };
  }

  try {
    const fileContent = readFileSync(evidencePath, "utf8");
    const newlineEntries = fileContent
      .split(/\r?\n/g)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

    const allEntries: string[] = [];

    newlineEntries.forEach((entry: string) => {
      const subEntries = entry.split(/}{(?="timestamp_utc":)/g);
      subEntries.forEach((sub: string, idx: number) => {
        if (subEntries.length === 1) {
          allEntries.push(sub);
          return;
        }
        if (idx === 0) {
          allEntries.push(sub.endsWith("}") ? sub : sub + "}");
        } else {
          allEntries.push("{" + sub);
        }
      });
    });
    
    // Process all valid entries and filter by decision ID
    const matchingExecutions = allEntries
      .map((entry: string) => {
        try {
          const event = JSON.parse(entry.trim()) as RuntimeInvocationEvent;
          return event;
        } catch (e) {
          return null;
        }
      })
      .filter((event: RuntimeInvocationEvent | null): event is RuntimeInvocationEvent => {
        return event !== null && event.decision_id === decisionId;
      })
      .map((event: RuntimeInvocationEvent) => {
        // Extract runId from input if it exists (execute-workflow inputs contain runId)
        const input = event.input as Record<string, unknown>;
        const runId = typeof input?.runId === "string" ? input.runId : null;
        
        return {
          runId,
          timestamp_utc: event.timestamp_utc,
          capability_id: event.capability_id,
          operation_id: event.operation_id,
          success: event.success,
          decision_id: event.decision_id,
          product_id: event.product_id,
        };
      });

    return {
      matchingExecutions,
      totalMatches: matchingExecutions.length,
    };
  } catch {
    return { matchingExecutions: [], totalMatches: 0 };
  }
}