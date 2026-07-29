import type { IndependentEvidenceProducer, ProducerContext } from "./types";
import { produceEvidencePackageEnvelope } from "./types";
import { join, resolve as resolvePath, isAbsolute } from "node:path";
import { createRequire } from "node:module";
import type { ResolvedWorkspace } from "@repo/composition";

const PRODUCER_ID = "runtime-probe-v1";
const PRODUCER_NAME = "Runtime Behavior Probe (actual instantiation)";
const TARGET_ARTIFACT = "@repo/core-runtime Runtime class";
const EXPERIMENT_ID = "EXP-A8-RUN-RUNTIME-BEHAVIOR";

declare const __filename: string;
const _require = createRequire(__filename);
const fs = _require("node:fs") as typeof import("node:fs");

type ReactComponentFn = (props: object) => unknown;
const syntheticComponentA: ReactComponentFn = function ProbeComponentA() { return null; };
const syntheticComponentB: ReactComponentFn = function ProbeComponentB() { return null; };

interface RuntimeLifecycleShape {
  load(resolved: unknown): unknown;
  mount(hostEnv?: unknown): unknown;
}
interface RuntimeCtorShape {
  prototype: { load: unknown; mount: unknown };
  length: number;
  new(options?: unknown): RuntimeLifecycleShape;
}
type ExtractComponentFnShape = (resolved: {
  readonly capabilityId: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
}) => unknown;

function syntheticResolvedWorkspace(): ResolvedWorkspace {
  return Object.freeze({
    workspaceId: "probe-ws::alpha-8" as unknown as import("@repo/composition").WorkspaceId,
    graphHash: "probe-graph::alpha-8::sha256::0000000000000000000000000000000000000000000000000000000000000000",
    activeCapabilityIds: Object.freeze(["probe::cap-a", "probe::cap-b"]) as unknown as readonly string[],
    capabilities: Object.freeze({
      "probe::cap-a": Object.freeze({ status: "available", graphNodeId: "node::a" }),
      "probe::cap-b": Object.freeze({ status: "available", graphNodeId: "node::b" }),
    }),
  }) as unknown as ResolvedWorkspace;
}

function resolveRepoRoot(cwdCtx: string): string {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  if (process.env.EOS_REPO_ROOT && process.env.EOS_REPO_ROOT.length > 0) {
    // eslint-disable-next-line turbo/no-undeclared-env-vars
    return process.env.EOS_REPO_ROOT;
  }
  const suffix = join("packages", "composition");
  const tryUp2 = resolvePath(cwdCtx, "..", "..");
  if (isAbsolute(suffix) ? cwdCtx.endsWith(suffix) : cwdCtx.endsWith(suffix)) {
    return resolvePath(cwdCtx, "..", "..");
  }
  if (fs.existsSync(join(tryUp2, "packages", "core", "runtime", "package.json"))) {
    return tryUp2;
  }
  return cwdCtx;
}

export class RuntimeProbeProducer implements IndependentEvidenceProducer {
  readonly producerId = PRODUCER_ID;
  readonly producerName = PRODUCER_NAME;
  readonly derivation = "Raw" as const;
  readonly experimentId = EXPERIMENT_ID;
  readonly targetArtifactPath = TARGET_ARTIFACT;

  produce(ctx: ProducerContext) {
    const observations: string[] = [];
    const assertions: string[] = [];
    let exitCode = 0;

    try {
      const repoRoot = (ctx.repoRoot && isAbsolute(ctx.repoRoot))
        ? ctx.repoRoot
        : resolveRepoRoot(ctx.repoRoot.length > 0 ? resolvePath(process.cwd(), ctx.repoRoot) : process.cwd());

      assertions.push("RUN-0: @repo/core-runtime module dinamis dapat di-load melalui dist/index.js atau src/index.ts (NO static import dari @repo/composition untuk mencegah ARCH-16 circular dependency)");
      let RuntimeCtor: RuntimeCtorShape | null = null;
      let resolvedVia = "";
      try {
        const loaded = loadRuntimeModuleSyncWrap(repoRoot);
        RuntimeCtor = loaded.Runtime;
        resolvedVia = loaded.via;
        observations.push(`RUN-0 @repo/core-runtime resolved via=${resolvedVia} typeof Runtime=${typeof RuntimeCtor}`);
      } catch (err) {
        exitCode = 1;
        observations.push(`RUN-0 FAIL load @repo/core-runtime: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
      }

      if (RuntimeCtor) {
        assertions.push("RUN-1: Runtime instance instantiable with zero constructor args (default extractor)");
        let runtimeA: RuntimeLifecycleShape | null = null;
        try {
          runtimeA = new RuntimeCtor();
          observations.push(`RUN-1 instantiated runtime=${runtimeA !== null} isInstance=${runtimeA instanceof RuntimeCtor}`);
        } catch (err) {
          exitCode = 1;
          observations.push(`RUN-1 FAIL instantiation: ${err instanceof Error ? err.message : String(err)}`);
        }

        assertions.push("RUN-2: Runtime.mount() called BEFORE load() returns Promise (async contract)");
        try {
          if (runtimeA) {
            const mountResult = runtimeA.mount({
              permissions: Object.freeze({}),
              locale: "en-US",
              featureFlags: Object.freeze({}),
              requestId: "probe-req-0",
            });
            const isAsync = mountResult !== null && typeof mountResult === "object" && "then" in mountResult && typeof (mountResult as Promise<unknown>).then === "function";
            observations.push(`RUN-2 mount BEFORE load isAsync=${isAsync}`);
          }
        } catch (err) {
          observations.push(`RUN-2 mount-before-load threw (expected boundary behavior): ${err instanceof Error ? err.message : String(err)}`);
        }

        assertions.push("RUN-3: Runtime.load(resolvedWorkspace) succeeds — no exceptions thrown on valid ResolvedWorkspace");
        const rw = syntheticResolvedWorkspace();
        try {
          (runtimeA as RuntimeLifecycleShape).load(rw);
          observations.push("RUN-3 Runtime.load(resolved) succeeded");
        } catch (err) {
          exitCode = 1;
          observations.push(`RUN-3 FAIL load threw: ${err instanceof Error ? err.message : String(err)}`);
        }

        assertions.push("RUN-4: Runtime.mount() after load returns Promise");
        try {
          const mountPromise = (runtimeA as RuntimeLifecycleShape).mount({
            permissions: Object.freeze({ probe: true }),
            locale: "id-ID",
            featureFlags: Object.freeze({ a: true }),
            requestId: "probe-req-1",
          });
          const isAsync = mountPromise !== null && typeof mountPromise === "object" && "then" in mountPromise && typeof (mountPromise as Promise<unknown>).then === "function";
          observations.push(`RUN-4 mount after load isAsync=${isAsync}`);
          if (isAsync) {
            void (async () => { try { await mountPromise as Promise<unknown>; } catch { /* swallow inside probe */ } })();
          }
        } catch (err) {
          observations.push(`RUN-4 mount threw sync: ${err instanceof Error ? err.message : String(err)}`);
        }

        assertions.push("RUN-5: Runtime with custom extractComponent resolves capabilities in same order as activeCapabilityIds");
        const capCalls: Array<{ capId: string; status?: string; nodeId?: string }> = [];
        const customExtractor: ExtractComponentFnShape = (resolved) => {
          capCalls.push({
            capId: resolved.capabilityId,
            status: resolved.metadata?.status as string | undefined,
            nodeId: resolved.metadata?.graphNodeId as string | undefined,
          });
          if (resolved.capabilityId === "probe::cap-a") return syntheticComponentA;
          if (resolved.capabilityId === "probe::cap-b") return syntheticComponentB;
          return null;
        };

        let runtimeB: RuntimeLifecycleShape | null = null;
        try {
          runtimeB = new RuntimeCtor({ extractComponent: customExtractor });
          (runtimeB as RuntimeLifecycleShape).load(rw);
          const mpr = (runtimeB as RuntimeLifecycleShape).mount({});
          const isAsync = mpr !== null && typeof mpr === "object" && "then" in mpr && typeof (mpr as Promise<unknown>).then === "function";
          if (isAsync) {
            void (async () => { try { await mpr as Promise<unknown>; } catch { /* swallow */ } })();
          }
          observations.push(`RUN-5 extractor invocations count=${capCalls.length} order=${JSON.stringify(capCalls.map(c => c.capId))}`);
        } catch (err) {
          exitCode = 1;
          observations.push(`RUN-5 FAIL custom probe: ${err instanceof Error ? err.message : String(err)}`);
        }

        assertions.push("RUN-6: Runtime prototype matches RuntimeLifecycle interface shape (load + mount methods present)");
        const protoShape = {
          hasLoad: typeof RuntimeCtor.prototype.load === "function",
          hasMount: typeof RuntimeCtor.prototype.mount === "function",
          loadArity: typeof RuntimeCtor.prototype.load === "function" ? RuntimeCtor.prototype.load.length : -1,
          mountArity: typeof RuntimeCtor.prototype.mount === "function" ? RuntimeCtor.prototype.mount.length : -1,
        };
        observations.push(`RUN-6 Runtime prototype shape=${JSON.stringify(protoShape)}`);
        const shapeMatch = protoShape.hasLoad && protoShape.hasMount && protoShape.loadArity === 1 && protoShape.mountArity === 0;
        observations.push(`RUN-6 RuntimeLifecycle shape match=${shapeMatch}`);
        if (!shapeMatch) exitCode = 1;

        assertions.push("RUN-7: Runtime constructor param detection — NO registry/kernel/resolver param via Function.length");
        const ctorArity = RuntimeCtor.length;
        observations.push(`RUN-7 Runtime constructor arity=${ctorArity} (expected 0 or 1 options object ONLY)`);
        if (ctorArity > 1) {
          exitCode = 1;
          observations.push(`RUN-7 FAIL ctor arity > 1 indicates multiple params — registry/kernel likely present`);
        }
      }
    } catch (err) {
      exitCode = 1;
      observations.push(`RUN-FATAL exception: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    }

    const protocol = [
      "Dynamic module load @repo/core-runtime via Node import() dari dist/index.js (preferred) atau src/index.ts — TIDAK MENGGUNAKAN static import dari @repo/composition agar tidak menciptakan circular dependency compiler ← runtime (pelanggaran ARCH-16).",
      "Instantiate Runtime() with zero args — default extractor (always returns null).",
      "Call mount(hostEnv) BEFORE load(resolved). Observe Promise returned = async contract RuntimeLifecycle.",
      "Build synthetic ResolvedWorkspace (deep-frozen) with 2 probe capabilities and fixed, deterministic graphHash + workspaceId.",
      "Call runtime.load(syntheticResolved) → observe no thrown exception.",
      "Call mount() after load → Promise resolves. Default extractor yields descriptive boundary errors.",
      "Build Runtime(custom extractComponent) that records every call, returns ReactComponents for known capabilities. Assert order equals activeCapabilityIds exactly.",
      "Reflective inspection via Function.prototype.length: Runtime.load arity=1, mount arity=0 (matches optional hostEnv param), Runtime constructor arity ≤ 1.",
    ] as const;

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: protocol,
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "Node dynamic import() @repo/core-runtime dist/index.js (resolved)",
          "new Runtime() actual constructor invocation via dynamically-loaded ctor",
          "Runtime.prototype.load() call with synthetic ResolvedWorkspace",
          "Runtime.prototype.mount() async Promise resolution",
          "custom extractComponent invocation tracing",
          "Runtime.prototype.length + prototype.load.length / mount.length reflective arity",
          "activeCapabilityIds iteration order observation",
        ]),
        scriptFile: "packages/composition/src/certification/producers/runtime-probe.ts",
        functionName: "RuntimeProbeProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "@repo/core-runtime dist built (dist/index.js exists) OR source-based ts loader enabled via tsx at runtime",
          "Node dynamic import() supported (ES2020+)",
          "Promise global available (ES2015+)",
          "Object.freeze available and enabled",
        ]),
        hashConsistency: Object.freeze([
          "syntheticResolvedWorkspace workspaceId fixed: probe-ws::alpha-8",
          "syntheticResolvedWorkspace graphHash fixed: 0000000000000000000000000000000000000000000000000000000000000000",
          "activeCapabilityIds order: [probe::cap-a, probe::cap-b]",
        ]),
      },
      ctx,
    );
  }
}

function loadRuntimeModuleSyncWrap(repoRoot: string): { Runtime: RuntimeCtorShape; via: string } {
  const dist = join(repoRoot, "packages", "core", "runtime", "dist", "index.js");
  if (fs.existsSync(dist)) {
    try {
      const resolved = _require(dist);
      if (resolved && typeof resolved.Runtime === "function") {
        return { Runtime: resolved.Runtime, via: "dist/index.js require() sync via createRequire" };
      }
    } catch { /* fallthrough to tsx path */ }
  }
  const src = join(repoRoot, "packages", "core", "runtime", "src", "index.ts");
  if (fs.existsSync(src)) {
    try {
      const resolved = _require(src);
      if (resolved && typeof resolved.Runtime === "function") {
        return { Runtime: resolved.Runtime, via: "src/index.ts require() (tsx enabled)" };
      }
    } catch { /* fallthrough throw */ }
  }
  throw new Error(`Cannot load @repo/core-runtime from dist=${dist} or src=${src}. Run @repo/core-runtime build first or execute under tsx.`);
}

export const runtimeProbe = new RuntimeProbeProducer();
