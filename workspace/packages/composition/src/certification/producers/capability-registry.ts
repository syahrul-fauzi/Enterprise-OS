import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
import { produceEvidencePackageEnvelope } from "./types.js";
import { join, isAbsolute, resolve as resolvePath } from "node:path";
import { createRequire } from "node:module";
import type { CapabilityDescriptor } from "@repo/core-kernel";

declare const __filename: string;
const _require = createRequire(__filename);
const fs = _require("node:fs") as typeof import("node:fs");

const PRODUCER_ID = "capability-registry-v1";
const PRODUCER_NAME = "Capability Registry Structure & Boundary IEP";
const TARGET_ARTIFACT = "packages/core/capability-registry";
const EXPERIMENT_ID = "EXP-A9-REG-STRUCTURE-BOUNDARY";

function resolveRepoRoot(ctxRepoRoot: string): string {
  if (ctxRepoRoot && isAbsolute(ctxRepoRoot)) return ctxRepoRoot;
  const suffix = join("packages", "composition");
  const cwd = process.cwd();
  const tryUp2 = resolvePath(cwd, "..", "..");
  if (cwd.endsWith(suffix)) return resolvePath(cwd, "..", "..");
  if (fs.existsSync(join(tryUp2, "packages", "core", "capability-registry", "package.json"))) {
    return tryUp2;
  }
  return cwd;
}

export class CapabilityRegistryProducer implements IndependentEvidenceProducer {
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
      const repoRoot = resolveRepoRoot(ctx.repoRoot);
      const regRoot = join(repoRoot, "packages", "core", "capability-registry");

      assertions.push("REG-1: capability-registry package.json exists & parseable fresh bytes");
      const pkgPath = join(regRoot, "package.json");
      if (!fs.existsSync(pkgPath)) { exitCode = 1; observations.push("REG-1 package.json missing"); }
      const pkgRaw = fs.readFileSync(pkgPath);
      const pkgJson = JSON.parse(pkgRaw.toString("utf-8")) as Record<string, unknown>;
      observations.push(`REG-1 pkg name=${String(pkgJson.name ?? null)} version=${String(pkgJson.version ?? null)}`);
      if (pkgJson.name !== "@repo/core-capability-registry") exitCode = 1;

      assertions.push("REG-2: Dependencies = ONLY @repo/core-kernel + zod (NO runtime, NO ui-system, NO foundation, NO composition)");
      const deps = typeof pkgJson.dependencies === "object" && pkgJson.dependencies !== null
        ? Object.keys(pkgJson.dependencies as Record<string, unknown>).sort()
        : [];
      observations.push(`REG-2 deps list=${JSON.stringify(deps)}`);
      const expected = ["@repo/core-kernel", "zod"].sort();
      const match = deps.length === expected.length && deps.every((k, i) => k === expected[i]);
      observations.push(`REG-2 expected deps only [@repo/core-kernel,zod] match=${match}`);
      if (!match) exitCode = 1;

      assertions.push("REG-3: Exports field single entry '.' (no internal submodule leak)");
      const exportsVal = pkgJson.exports as Record<string, unknown> | undefined;
      const exportsKeys = exportsVal ? Object.keys(exportsVal).sort() : [];
      observations.push(`REG-3 exports keys=${JSON.stringify(exportsKeys)}`);
      if (!(exportsKeys.length === 1 && exportsKeys[0] === ".")) exitCode = 1;

      assertions.push("REG-4: src/ contains index.ts + registry.ts + types.ts (registry contract triad)");
      const srcDir = join(regRoot, "src");
      const srcList = fs.existsSync(srcDir)
        ? fs.readdirSync(srcDir).filter(n => n.endsWith(".ts") && !n.endsWith(".d.ts")).sort()
        : [];
      observations.push(`REG-4 src list=${JSON.stringify(srcList)}`);
      const requiredTs = ["index.ts", "registry.ts", "types.ts"].sort();
      const requiredOk = srcList.length >= requiredTs.length && requiredTs.every(r => srcList.includes(r));
      observations.push(`REG-4 required files present=${requiredOk}`);
      if (!requiredOk) exitCode = 1;

      assertions.push("REG-5: StaticRegistry implements CapabilityRegistry ABI: kind, resolve(id), list(), validate() methods");
      const distPath = join(regRoot, "dist", "index.js");
      let StaticRegistryCtor: ((config: unknown) => {
        kind: unknown; resolve: (id: string) => unknown; list: () => unknown[]; validate: () => unknown;
      }) | null = null;
      try {
        if (fs.existsSync(distPath)) {
          const mod = _require(distPath);
          StaticRegistryCtor = mod.StaticRegistry;
        } else {
          const srcIndex = join(regRoot, "src", "index.ts");
          const mod = _require(srcIndex);
          StaticRegistryCtor = mod.StaticRegistry;
        }
      } catch (err) { observations.push(`REG-5 load err: ${err instanceof Error ? err.message : String(err)}`); }
      observations.push(`REG-5 typeof StaticRegistry=${typeof StaticRegistryCtor}`);
      if (typeof StaticRegistryCtor === "function") {
        const fakeView = function FakeView() { return null; };
        const entries: Record<string, CapabilityDescriptor> = {
          "probe::cap": {
            id: "probe::cap",
            name: "Probe Cap",
            version: "0.1.0",
            experience: Object.freeze({ view: fakeView }),
          } as unknown as CapabilityDescriptor,
        };
        try {
          const StaticRegistryAny = StaticRegistryCtor as unknown as new (opts?: unknown) => {
            readonly kind?: string;
            readonly list: () => readonly unknown[];
            readonly resolve: (id: string) => unknown;
            readonly validate: () => { readonly ok: boolean };
          };
          const inst = new StaticRegistryAny({ entries });
          const kindOk = inst.kind === "static";
          const listLen = (inst.list() ?? []).length;
          const resolveOk = inst.resolve("probe::cap") !== undefined;
          const validateRes = inst.validate();
          observations.push(`REG-5 inst kind=static=${kindOk} list.length=${listLen} resolve(probe::cap) defined=${resolveOk} validate.ok=${validateRes.ok}`);
          if (!(kindOk && listLen === 1 && resolveOk && validateRes.ok)) exitCode = 1;
        } catch (err) {
          exitCode = 1;
          observations.push(`REG-5 FAIL instantiation: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
        }
      } else {
        exitCode = 1;
        observations.push("REG-5 FAIL tidak dapat load StaticRegistry constructor");
      }

      assertions.push("REG-6: registry source imports ONLY @repo/core-kernel (no runtime, no composition) — check source-level import text scan");
      const srcFile = join(srcDir, "registry.ts");
      const typesFile = join(srcDir, "types.ts");
      const srcImports: string[] = [];
      for (const f of [srcFile, typesFile]) {
        if (!fs.existsSync(f)) continue;
        const lines = fs.readFileSync(f).toString("utf-8").split(/\r?\n/);
        for (const line of lines) {
          const m = /^\s*import\s+(?:type\s+)?(?:[^'"]*?from\s+)?['"]([^'"]+)['"]\s*;?\s*$/.exec(line);
          if (m) srcImports.push(m[1]);
        }
      }
      observations.push(`REG-6 src-level external modules imported=${JSON.stringify(srcImports)}`);
      const forbiddenImports = ["@repo/core-runtime", "@repo/composition", "@repo/ui-system", "@repo/foundation"];
      const hitForbidden = forbiddenImports.some(f => srcImports.some(s => s === f || s.startsWith(f + "/")));
      observations.push(`REG-6 forbidden runtime/ui/foundation/composition imports present=${hitForbidden}`);
      if (hitForbidden) exitCode = 1;
    } catch (err) {
      exitCode = 1;
      observations.push(`REG-FATAL exception: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    }

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: Object.freeze([
          "Locate packages/core/capability-registry/package.json via fs.existsSync.",
          "fs.readFileSync Buffer bytes → JSON.parse fresh parse. Assert name=@repo/core-capability-registry.",
          "Enumerate dependencies keys. Assert sorted list exactly = [@repo/core-kernel, zod] NO runtime/composition/ui-system.",
          "Assert exports field single entry '.'.",
          "Assert src/ contains index.ts, registry.ts, types.ts (registry contract ABI triad).",
          "Dynamic load StaticRegistry constructor via createRequire dist/index.js or src/index.ts. Construct with 1 probe capability entry.",
          "Assert kind='static', resolve(probeId) returns object, list() length=1, validate() returns {ok:true}.",
          "Source-level import text scan over registry.ts and types.ts. Forbid any imports of @repo/core-runtime, @repo/composition, @repo/ui-system, @repo/foundation at string level.",
        ]),
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "fs.existsSync() for package.json / src / dist",
          "fs.readFileSync Buffer bytes + JSON.parse FRESH (NOT require cache)",
          "fs.readdirSync src directory listing",
          "Dynamic createRequire of @repo/core-capability-registry dist/index.js OR src/index.ts",
          "StaticRegistry constructor instantiation via new with probe entries config",
          "Kind/resolve/list/validate method calls on constructed registry instance",
          "Regex source-level import scan over registry.ts + types.ts raw source code lines",
          "package.json dependencies object keys enumeration",
        ]),
        scriptFile: "packages/composition/src/certification/producers/capability-registry.ts",
        functionName: "CapabilityRegistryProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "Registry build dist/index.js exists OR tsx loader available for raw src import",
          "createRequire API available (Node 12+)",
          "src files readable by process uid",
        ]),
      },
      ctx,
    );
  }
}

export const capabilityRegistry = new CapabilityRegistryProducer();
