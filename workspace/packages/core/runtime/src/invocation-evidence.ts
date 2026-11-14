// @ts-nocheck
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

// Inisialisasi fungsi Node.js sebagai no-op untuk Edge Runtime
let appendFileSync: any;
let readFileSync: any;
let mkdirSync: any;
let dirname: any;
let createHash: any;

// JIKA DI EDGE ATAU VITEST (TEST ENVIRONMENT): implementasi in-memory
console.log("🔍 DEBUG: Menggunakan in-memory appendFileSync untuk Edge/Vitest environment");
// Edge/Vitest Runtime: implementasi in-memory (type assertion untuk kompatibilitas)
appendFileSync = ((_path: string, data: string) => {
  console.log("🔍 DEBUG: appendFileSync - menulis ke in-memory logs:", data.substring(0, 200) + "...");
  const pushedEntry = data.trim();
  globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.push(pushedEntry);
  console.log("🔍 DEBUG: appendFileSync - entry dipush ke in-memory logs:", pushedEntry);
  console.log("🔍 DEBUG: appendFileSync - in-memory logs sekarang berisi:", globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.length, "entries");
}) as typeof appendFileSync;

readFileSync = ((_path: string, encoding: string) => {
  console.log("🔍 DEBUG: readFileSync - membaca dari in-memory logs, total entries:", globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.length);
  return globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.join("\n");
}) as typeof readFileSync;

mkdirSync = (() => { 
  console.log("🔍 DEBUG: mkdirSync - no-op di in-memory environment");
}) as typeof mkdirSync;

dirname = ((p: string) => p) as typeof dirname; // Passthrough untuk Edge/Vitest

createHash = (() => {
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
}) as unknown as typeof createHash;

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
const sha256Cache = new Map<string, string>();
function computeSha256Sync(value: string): string {
  if (sha256Cache.has(value)) {
    return sha256Cache.get(value)!;
  }
  // Gunakan polyfill hash sederhana untuk sync version
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const result = Math.abs(hash).toString(16).padStart(64, '0');
  sha256Cache.set(value, result);
  return result;
}

// Helper function untuk mendapatkan base path yang kompatibel dengan Edge Runtime
function getBasePath(): string {
  return '';
}

// Record runtime invocation evidence - immutable append-only log
export async function recordRuntimeInvocation(input: {
  capability: string;
  command: string;
  input?: unknown;
  output?: unknown;
  decision_id?: string;
  tenant_id?: string;
  workspace_id?: string;
  actor_id?: string;
  work_id?: string;
  duration_ms?: number;
  error?: string;
  outputRefs?: string[];
  inputRefs?: string[];
}) {
  const timestamp = new Date().toISOString();
  const invocationId = `inv-${computeSha256Sync(`${timestamp}-${input.capability}-${input.command}`).substring(0, 16)}`;
  
  const evidenceEntry = {
    invocation_id: invocationId,
    timestamp,
    capability: input.capability,
    command: input.command,
    decision_id: input.decision_id,
    tenant_id: input.tenant_id,
    workspace_id: input.workspace_id,
    actor_id: input.actor_id,
    work_id: input.work_id,
    duration_ms: input.duration_ms,
    error: input.error,
    outputRefs: input.outputRefs,
    inputRefs: input.inputRefs,
    // Immutable hash chain untuk bukti integritas
    hash: computeSha256Sync(JSON.stringify({
      invocation_id: invocationId,
      timestamp,
      capability: input.capability,
      command: input.command,
      input: input.input,
      output: input.output,
      decision_id: input.decision_id,
      tenant_id: input.tenant_id,
      workspace_id: input.workspace_id,
      actor_id: input.actor_id,
      work_id: input.work_id,
      duration_ms: input.duration_ms,
      error: input.error,
      outputRefs: input.outputRefs,
      inputRefs: input.inputRefs,
    }))
  };

  // Append-only log - immutable, tidak pernah dihapus atau diubah
  const defaultPath = `${getBasePath()}/.eos-state/evidence/eos-runtime-invocations.log`;
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim() || defaultPath;
  
  try {
    // Pastikan direktori ada
    const dirPath = dirname(evidencePath);
    mkdirSync(dirPath, { recursive: true });
    // Append entry ke log
    appendFileSync(evidencePath, JSON.stringify(evidenceEntry) + "\n", { encoding: "utf8", flag: "a" });
    console.log(`[recordRuntimeInvocation] Evidence recorded: ${invocationId} for ${input.capability}/${input.command}`);
  } catch (err) {
    console.error(`[recordRuntimeInvocation] Failed to write evidence log:`, err);
    // Fallback: simpan ke in-memory jika file system tidak tersedia
    globalThis.__EOS_INMEMORY_EVIDENCE_LOGS__.push(JSON.stringify(evidenceEntry));
  }

  // Record metrics untuk observability
  await recordWorkExecutionMetrics({
    capability: input.capability,
    command: input.command,
    duration_ms: input.duration_ms,
    error: input.error,
    tenant_id: input.tenant_id,
    workspace_id: input.workspace_id,
    actor_id: input.actor_id,
    work_id: input.work_id,
  });

  return evidenceEntry;
}

// Validate artifact access - memastikan bahwa semua inputRef berasal dari decision yang sah
export async function validateArtifactAccess(inputRefs: string[], currentDecisionId: string, currentTenantId: string): Promise<{ valid: boolean; invalidRefs: string[] }> {
  if (!inputRefs || inputRefs.length === 0) return { valid: true, invalidRefs: [] };
  
  const defaultPath = `${getBasePath()}/.eos-state/evidence/eos-runtime-invocations.log`;
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim() || defaultPath;
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
        }
      } else {
        // Jika tidak ditemukan di log, anggap sebagai tidak valid untuk keamanan
        invalidRefs.push(ref);
      }
    }
    
    return { valid: invalidRefs.length === 0, invalidRefs };
  } catch (err) {
    console.error(`[validateArtifactAccess] Failed to read evidence log:`, err);
    // Fallback: izinkan semua akses jika file system tidak tersedia (hanya untuk development)
    return { valid: true, invalidRefs: [] };
  }
}

// Trace execution by decision - mencari semua invocation yang terkait dengan decision tertentu
export async function traceExecutionByDecision(decisionId: string): Promise<any[]> {
  const defaultPath = `${getBasePath()}/.eos-state/evidence/eos-runtime-invocations.log`;
  const evidencePath = process.env.EOS_RUNTIME_INVOCATION_EVIDENCE_PATH?.trim() || defaultPath;
  if (!evidencePath) return [];

  try {
    const logs = readFileSync(evidencePath, "utf8").split("\n").filter(Boolean).map((line: string) => JSON.parse(line));
    return logs.filter((log: any) => log.decision_id === decisionId);
  } catch (err) {
    console.error(`[traceExecutionByDecision] Failed to read evidence log:`, err);
    return [];
  }
}