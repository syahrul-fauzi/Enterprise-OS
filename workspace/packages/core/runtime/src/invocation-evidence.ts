import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "path";
import { createHash } from "crypto";
import { executionContext } from "./execution-context.js";

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
  readonly tenant_id: string | null;
  readonly inputRefs?: readonly string[];
  readonly outputRefs?: readonly string[];
  readonly parentInvocationIds?: readonly string[];
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

// Helper untuk validasi authorization: semua inputRefs harus berasal dari decision/tenant yang sama
function validateArtifactAccess(inputRefs: readonly string[] | undefined, currentDecisionId: string | null | undefined, currentTenantId: string | null | undefined): { valid: boolean; invalidRefs: string[] } {
  if (!inputRefs || inputRefs.length === 0) return { valid: true, invalidRefs: [] };
  
  // Baca semua evidence logs untuk memeriksa origin dari setiap inputRef
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) return { valid: false, invalidRefs: inputRefs as string[] };

  try {
    const logs = readFileSync(evidencePath, "utf8").split("\n").filter(Boolean).map((line: string) => JSON.parse(line));
    
    const invalidRefs: string[] = [];
    for (const ref of inputRefs) {
      const artifactOrigin = logs.find((log: any) => log.outputRefs?.includes(ref));
      console.log(`[validateArtifactAccess] Checking ref ${ref}, found origin:`, artifactOrigin ? { decision: artifactOrigin.decision_id, tenant: artifactOrigin.tenant_id } : "NOT FOUND");
      if (artifactOrigin) {
        if (artifactOrigin.decision_id !== currentDecisionId || artifactOrigin.tenant_id !== currentTenantId) {
          invalidRefs.push(ref);
          console.log(`[validateArtifactAccess] Invalid ref ${ref}: origin decision/tenant mismatch. Current: ${currentDecisionId}/${currentTenantId}, Origin: ${artifactOrigin.decision_id}/${artifactOrigin.tenant_id}`);
        }
      } else {
        // Artifact not found in logs - mark as invalid (unknown origin)
        invalidRefs.push(ref);
        console.log(`[validateArtifactAccess] Invalid ref ${ref}: artifact origin not found in evidence logs`);
      }
    }
    console.log(`[validateArtifactAccess] Final check: valid=${invalidRefs.length === 0}, invalidRefs=`, invalidRefs);
    return { valid: invalidRefs.length === 0, invalidRefs };
  } catch (e) {
    console.error("[validateArtifactAccess] Error reading evidence logs:", e);
    return { valid: false, invalidRefs: inputRefs as string[] };
  }
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
  readonly tenant_id?: string | null;
  readonly inputRefs?: readonly string[];
  readonly outputRefs?: readonly string[];
  readonly parentInvocationIds?: readonly string[];
}): void {
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) {
    return;
  }

  mkdirSync(dirname(evidencePath), { recursive: true });

  const ambient = executionContext.get();
  
  const resolved_product_id = input.productId ?? ambient?.product_id ?? process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID?.trim() ?? "unknown";
  const resolved_decision_id = input.decision_id ?? ambient?.decision_id ?? null;
  const resolved_tenant_id = input.tenant_id ?? ambient?.tenant_id ?? null;
  
  // Ambil parent invocation IDs dari ambient context jika tersedia
  const resolved_parentInvocationIds = input.parentInvocationIds ?? 
    (ambient?.last_invocation_digest ? [ambient.last_invocation_digest] : []);

  // Authorization check: enforce cross-decision/cross-tenant isolation
  const authCheck = validateArtifactAccess(input.inputRefs, resolved_decision_id, resolved_tenant_id);
  if (!authCheck.valid) {
    // Log unauthorized attempt sebelum throw error
    try {
      const unauthEvent = {
        timestamp_utc: new Date().toISOString(),
        product_id: resolved_product_id,
        plan_instance_id: process.env.EOS_RUNTIME_PLAN_INSTANCE_ID?.trim() ?? null,
        plan_id: process.env.EOS_RUNTIME_PLAN_ID?.trim() ?? null,
        plan_digest: process.env.EOS_RUNTIME_PLAN_DIGEST?.trim() ?? null,
        capability_id: input.capabilityId,
        operation_id: input.operationId,
        source_ref: input.sourceRef,
        success: false,
        input_digest: digest(input.input),
        result_digest: digest({ error: "UNAUTHORIZED_ARTIFACT_ACCESS", invalid_refs: authCheck.invalidRefs }),
        invocation_digest: crypto.randomUUID(),
        input: canonicalize(input.input),
        result: canonicalize({ error: "UNAUTHORIZED_ARTIFACT_ACCESS", invalid_refs: authCheck.invalidRefs }),
        decision_id: resolved_decision_id,
        tenant_id: resolved_tenant_id,
        inputRefs: input.inputRefs,
        outputRefs: input.outputRefs,
        parentInvocationIds: resolved_parentInvocationIds,
      } satisfies RuntimeInvocationEvent;
      appendFileSync(evidencePath, `${JSON.stringify(unauthEvent)}\n`, "utf8");
    } catch (logError) {
      console.error("[PRD-001 Authorization] Failed to log unauthorized attempt:", logError);
    }
    // PASTIKAN SELALU throw error, tidak peduli apakah logging berhasil atau tidak!
    const errorMessage = `Unauthorized artifact access: Attempted to consume artifacts from other decision/tenant: ${authCheck.invalidRefs.join(", ")}`;
    console.log("[PRD-001 Authorization]", errorMessage);
    throw new Error(errorMessage);
  }

  const invocation_digest = digest({
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
    tenant_id: resolved_tenant_id,
    inputRefs: input.inputRefs,
    outputRefs: input.outputRefs,
    parentInvocationIds: resolved_parentInvocationIds,
  });

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
    invocation_digest,
    input: canonicalize(input.input),
    result: canonicalize(input.result),
    decision_id: resolved_decision_id,
    tenant_id: resolved_tenant_id,
    inputRefs: input.inputRefs,
    outputRefs: input.outputRefs,
    parentInvocationIds: resolved_parentInvocationIds,
  } satisfies RuntimeInvocationEvent;

  appendFileSync(evidencePath, `${JSON.stringify(event)}\n`, "utf8");
  
  // Update ambient context dengan invocation digest terbaru untuk child executions
  // Jangan pernah mutate store asli - buat clone untuk mencegah race condition antar sibling async stacks
  executionContext.setLastInvocationDigest(invocation_digest);
}

export function traceExecutionByDecision(decisionId: string, tenantId?: string | null): {
  readonly matchingExecutions: ReadonlyArray<{
    readonly runId: string | null;
    readonly timestamp_utc: string;
    readonly capability_id: string;
    readonly operation_id: string;
    readonly success: boolean;
    readonly decision_id: string | null;
    readonly tenant_id: string | null;
    readonly product_id: string;
    readonly inputRefs?: readonly string[];
    readonly outputRefs?: readonly string[];
    readonly parentInvocationIds?: readonly string[];
    readonly invocation_digest: string;
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
        if (event === null || event.decision_id !== decisionId) return false;
        // If tenantId is provided, only match events with the same tenant_id
        if (tenantId !== undefined && event.tenant_id !== tenantId) return false;
        return true;
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
          tenant_id: event.tenant_id,
          product_id: event.product_id,
          inputRefs: event.inputRefs,
          outputRefs: event.outputRefs,
          parentInvocationIds: event.parentInvocationIds,
          invocation_digest: event.invocation_digest,
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