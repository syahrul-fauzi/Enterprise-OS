// Deklarasi tipe untuk EdgeRuntime (hanya untuk type checking)
declare const EdgeRuntime: unknown;

// Edge-compatible imports: Web Crypto API + in-memory storage fallback
import { executionContext } from "./execution-context.js";
import { recordWorkExecutionMetrics } from "./execution-observability.js";

// Detect runtime environment
const isEdgeRuntime = typeof EdgeRuntime !== 'undefined';
// In-memory evidence log storage untuk Edge Runtime (fallback jika tidak ada file system)
declare global {
  var __EOS_INMEMORY_EVIDENCE_LOGS__: string[];
}
globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__ = globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__ || [];

// Node.js fs polyfill: hanya load jika di Node.js environment
let appendFileSync: (path: string, data: string, encoding: string) => void;
let readFileSync: (path: string, encoding: string) => string;
let mkdirSync: (path: string, options: { recursive: boolean }) => void;
let dirname: (path: string) => string;
let createHash: (algorithm: string) => {
  update: (data: string) => void;
  digest: (encoding: string) => string;
};

// Inisialisasi fungsi Node.js secara lazy (hanya saat dibutuhkan) untuk menghindari top-level require yang terdeteksi Next.js
async function initNodeRuntime() {
  if (!isEdgeRuntime && !appendFileSync) {
    const fs = require("node:fs");
    const path = require("node:path");
    const crypto = require("node:crypto");
    appendFileSync = fs.appendFileSync;
    readFileSync = fs.readFileSync;
    mkdirSync = fs.mkdirSync;
    dirname = path.dirname;
    createHash = crypto.createHash;
  }
}

if (isEdgeRuntime) {
  // Edge Runtime: implementasi in-memory
  appendFileSync = (_path: string, data: string) => {
    globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.push(data.trim());
  };
  readFileSync = (_path: string, encoding: string) => {
    return globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.join("\n");
  };
  mkdirSync = () => {}; // No-op di Edge (tidak perlu buat direktori)
  dirname = (p: string) => p; // Passthrough untuk Edge
  createHash = () => {
    // Polyfill sederhana untuk createHash di Edge (gunakan simple hash yang sama)
    let data = "";
    return {
      update: (newData: string) => { data += newData; },
      digest: () => {
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
          const char = data.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(64, '0');
      }
    };
  };
}

// Web Crypto API implementation untuk SHA-256 (menggantikan node:crypto createHash)
async function computeSha256(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Fallback sync version untuk use case yang butuh sync (karena Web Crypto adalah async)
// Untuk kompatibilitas kode lama, kita tetap menyediakan sync digest yang menggunakan cache
const digestCache = new Map<string, string>();
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
  const canonicalized = canonicalize(value);
  const str = JSON.stringify(canonicalized);
  if (digestCache.has(str)) return digestCache.get(str)!;
  
  // Gunakan createHash yang sudah di-polyfill (akan bekerja di Node.js dan Edge)
  const hash = createHash("sha256");
  hash.update(str);
  const result = hash.digest("hex");
  digestCache.set(str, result);
  return result;
}

// randomUUID dari Web Crypto API (universal)
const randomUUID = () => globalThis.crypto.randomUUID();

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
  readonly actor_id: string | null;
  readonly inputRefs?: readonly string[];
  readonly outputRefs?: readonly string[];
  readonly parentInvocationIds?: readonly string[];
};

// Helper untuk validasi authorization: semua inputRefs harus berasal dari decision/tenant yang sama
async function validateArtifactAccess(inputRefs: readonly string[] | undefined, currentDecisionId: string | null | undefined, currentTenantId: string | null | undefined): Promise<{ valid: boolean; invalidRefs: string[] }> {
  if (!inputRefs || inputRefs.length === 0) return { valid: true, invalidRefs: [] };
  
  // Inisialisasi runtime jika di Node.js
  await initNodeRuntime();
  
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

// Track execution start time for metrics
const executionStartTimes = new Map<string, number>();

export function startExecutionTimer(executionId: string): void {
  executionStartTimes.set(executionId, Date.now());
}

// computeDigest dipertahankan untuk backward compatibility, menggunakan digest baru
export function computeDigest(value: unknown): string {
  return digest(value);
}

export async function recordRuntimeInvocation(input: {
  readonly capabilityId: string;
  readonly operationId: string;
  readonly sourceRef: string;
  readonly success: boolean;
  readonly input: unknown;
  readonly result: unknown;
  readonly productId?: string;
  readonly decision_id?: string | null;
  readonly tenant_id?: string | null;
  readonly actor_id?: string | null;
  readonly inputRefs?: readonly string[];
  readonly outputRefs?: readonly string[];
  readonly parentInvocationIds?: readonly string[];
  readonly work_id?: string | null;
  readonly executionId?: string | null;
}): Promise<void> {
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim();
  if (!evidencePath) {
    return;
  }
  
  // Inisialisasi runtime jika di Node.js
  await initNodeRuntime();
  mkdirSync(dirname(evidencePath), { recursive: true });

  const ambient = executionContext.get();
  
  const resolved_product_id = input.productId ?? ambient?.product_id ?? process.env.EOS_RUNTIME_INVOCATION_PRODUCT_ID?.trim() ?? "unknown";
  const resolved_decision_id = input.decision_id ?? ambient?.decision_id ?? null;
  const resolved_tenant_id = input.tenant_id ?? ambient?.tenant_id ?? null;
  const resolved_actor_id = input.actor_id ?? ambient?.actor_id ?? null;
  
  // Ambil parent invocation IDs dari ambient context jika tersedia
  const resolved_parentInvocationIds = input.parentInvocationIds ?? 
    (ambient?.last_invocation_digest ? [ambient.last_invocation_digest] : []);

  // Authorization check: enforce cross-decision/cross-tenant isolation
  const authCheck = await validateArtifactAccess(input.inputRefs, resolved_decision_id, resolved_tenant_id);
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
        actor_id: resolved_actor_id,
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
    actor_id: resolved_actor_id,
    inputRefs: input.inputRefs,
    outputRefs: input.outputRefs,
    parentInvocationIds: resolved_parentInvocationIds,
  } satisfies RuntimeInvocationEvent;

  // WORK-PROD-004: Record execution metrics for observability
  const executionId = input.executionId ?? randomUUID();
  const startTime = executionStartTimes.get(executionId);
  if (startTime) {
    const executionTimeMs = Date.now() - startTime;
    const resolvedWorkId = input.work_id ?? ambient?.logicalWorkId ?? ambient?.workflow_id ?? "unknown-work";
    recordWorkExecutionMetrics(resolvedWorkId, executionTimeMs, input.success);
    executionStartTimes.delete(executionId);
  }

  // Update ambient context dengan invocation digest terbaru untuk child executions
  // Jangan pernah mutate store asli - buat clone untuk mencegah race condition antar sibling async stacks
  executionContext.setLastInvocationDigest(invocation_digest);

  appendFileSync(evidencePath, `${JSON.stringify(event)}\n`, "utf8");
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
    readonly actor_id: string | null;
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
          actor_id: event.actor_id,
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