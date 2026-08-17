import { join, isAbsolute, relative } from "node:path";
import { readdirSync, statSync, readFileSync, existsSync } from "node:fs";
import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
import { produceEvidencePackageEnvelope } from "./types.js";

const PRODUCER_ID = "filesystem-audit-v1";
const PRODUCER_NAME = "Filesystem Structure & Manifest Scanner";
const TARGET_ARTIFACT = "packages/core/runtime";
const EXPERIMENT_ID = "EXP-A8-FS-RUNTIME-MANIFEST";

export class FilesystemScannerProducer implements IndependentEvidenceProducer {
  readonly producerId = PRODUCER_ID;
  readonly producerName = PRODUCER_NAME;
  readonly derivation = "Raw" as const;
  readonly experimentId = EXPERIMENT_ID;
  readonly targetArtifactPath = TARGET_ARTIFACT;

  produce(ctx: ProducerContext) {
    const repoRoot = isAbsolute(ctx.repoRoot) ? ctx.repoRoot : join(process.cwd(), ctx.repoRoot);
    const runtimeRoot = join(repoRoot, TARGET_ARTIFACT);

    const observations: string[] = [];
    const assertions: string[] = [];
    let exitCode = 0;

    try {
      assertions.push("FS-1: package.json exists");
      const pkgJsonPath = join(runtimeRoot, "package.json");
      const pkgExists = existsSync(pkgJsonPath) && statSync(pkgJsonPath).isFile();
      observations.push(`package.json exists=${pkgExists} at ${relative(repoRoot, pkgJsonPath)}`);
      if (!pkgExists) exitCode = 1;

      let parsedPkg: Record<string, unknown> | null = null;
      if (pkgExists) {
        assertions.push("FS-2: package.json parseable via JSON.parse (fresh read, not require cache)");
        const rawBuf = readFileSync(pkgJsonPath);
        parsedPkg = JSON.parse(rawBuf.toString("utf-8")) as Record<string, unknown>;
        observations.push(`package.json parsed name=${String(parsedPkg.name ?? "null")} version=${String(parsedPkg.version ?? "null")}`);
        if (parsedPkg.name !== "@repo/core-runtime") exitCode = 1;
      }

      assertions.push("FS-3: dependencies field contains ONLY @repo/composition and react (non-dev)");
      if (parsedPkg && typeof parsedPkg.dependencies === "object" && parsedPkg.dependencies !== null) {
        const depKeys = Object.keys(parsedPkg.dependencies as Record<string, unknown>).sort();
        observations.push(`package.json dependencies keys=${JSON.stringify(depKeys)}`);
        const expectedDeps = ["@repo/composition", "react"].sort();
        const depsMatch = depKeys.length === expectedDeps.length && depKeys.every((k, i) => k === expectedDeps[i]);
        observations.push(`FS-3 dependencies only=[@repo/composition, react] match=${depsMatch}`);
        if (!depsMatch) exitCode = 1;

        assertions.push("FS-4: NO direct dependencies on @repo/core-kernel or @repo/core-capability-registry");
        const forbiddenDeps = ["@repo/core-kernel", "@repo/core-capability-registry"];
        const hasForbidden = forbiddenDeps.some(fd => Object.prototype.hasOwnProperty.call(parsedPkg!.dependencies, fd));
        observations.push(`FS-4 forbidden kernel deps present=${hasForbidden}`);
        if (hasForbidden) exitCode = 1;
      } else {
        observations.push("FS-3/FS-4 dependencies field missing in package.json");
        exitCode = 1;
      }

      assertions.push("FS-5: src/ directory exists with .ts source files");
      const srcDir = join(runtimeRoot, "src");
      const srcExists = existsSync(srcDir) && statSync(srcDir).isDirectory();
      observations.push(`src/ directory exists=${srcExists}`);
      if (!srcExists) {
        exitCode = 1;
      } else {
        const tsFiles = readdirSync(srcDir)
          .filter((f: string) => f.endsWith(".ts") && !f.endsWith(".d.ts"))
          .sort();
        observations.push(`src/ .ts files count=${tsFiles.length} list=${JSON.stringify(tsFiles)}`);
        assertions.push("FS-6: src/ contains index.ts, runtime.ts, types.ts (core runtime contract files)");
        const requiredFiles = ["index.ts", "runtime.ts", "types.ts"];
        const hasAllRequired = requiredFiles.every(rf => tsFiles.includes(rf));
        observations.push(`FS-6 required core files present=${hasAllRequired}`);
        if (!hasAllRequired) exitCode = 1;
      }

      assertions.push("FS-7: exports field in package.json restricts to single entrypoint");
      if (parsedPkg && typeof parsedPkg.exports === "object" && parsedPkg.exports !== null) {
        const exportKeys = Object.keys(parsedPkg.exports as Record<string, unknown>).sort();
        observations.push(`package.json exports keys=${JSON.stringify(exportKeys)}`);
        const singleMainEntry = exportKeys.length === 1 && exportKeys[0] === ".";
        observations.push(`FS-7 single entrypoint (.) exports=${singleMainEntry}`);
        if (!singleMainEntry) exitCode = 1;
      }

      assertions.push("FS-8: sideEffects=false marked (ESM pure modules)");
      if (parsedPkg) {
        const sideEffects = parsedPkg.sideEffects;
        observations.push(`package.json sideEffects=${String(sideEffects)}`);
        observations.push(`FS-8 sideEffects=false match=${sideEffects === false}`);
        if (sideEffects !== false) exitCode = 1;
      }
    } catch (err) {
      exitCode = 1;
      observations.push(`FS-FATAL exception during scan: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }

    const protocol = [
      "Resolve absolute repoRoot via join(process.cwd(), ctx.repoRoot).",
      "Locate packages/core/runtime/ subdirectory.",
      "Check package.json existence via fs.existsSync + fs.statSync isFile.",
      "Read package.json via fs.readFileSync Buffer, parse via JSON.parse (NOT require — bypass Node module cache).",
      "Enumerate dependencies keys. Assert only @repo/composition and react present; @repo/core-kernel and @repo/core-capability-registry absent.",
      "Check src/ directory exists. Enumerate .ts (non-.d.ts) entries; assert index.ts/runtime.ts/types.ts present.",
      "Check exports field shape; assert single entry '.'.",
      "Check sideEffects field; assert strict false (not truthy string array).",
      "Any assertion failure sets exitCode=1; entire raw observation list preserved verbatim.",
    ] as const;

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: protocol,
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "fs.existsSync()",
          "fs.statSync().isFile()/.isDirectory()",
          "fs.readFileSync() Buffer.toString('utf-8')",
          "fs.readdirSync()",
          "JSON.parse() fresh parse from Buffer bytes",
          `${TARGET_ARTIFACT}/package.json raw bytes`,
          `${TARGET_ARTIFACT}/src/ directory listing`,
        ]),
        scriptFile: "packages/composition/src/certification/producers/filesystem-scanner.ts",
        functionName: "FilesystemScannerProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "Node.js fs module available",
          "repoRoot directory readable by current process uid",
          "packages/core/runtime present in workspace (not filtered by sparse checkout)",
        ]),
      },
      ctx,
    );
  }
}

export const filesystemScanner = new FilesystemScannerProducer();
