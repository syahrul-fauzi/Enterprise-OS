import fs from "node:fs";
import path from "node:path";

import { runAllIndependentProducers } from "./src/certification/producers/correlate.js";
import {
  buildEmptyProvenanceRegistry,
  mergeProvenanceChainIntoRegistry,
  computeExperimentDefinitionIdSync,
  computeRawObservationIdSync,
} from "./src/certification/evidence.js";
import type { ProvenanceRegistryCollection } from "./src/certification/evidence.js";

function nowIso(offsetMs: number = 0): string { return new Date(Date.now() + offsetMs).toISOString(); }

function execGitOrFallback(args: readonly string[], fallback: string): string {
  try {
    const { execSync } = require("node:child_process") as typeof import("node:child_process");
    const REPO_ROOT = path.resolve(__dirname, "..", "..");
    const buf = execSync(`git ${args.join(" ")}`, { cwd: REPO_ROOT, timeout: 5000, stdio: ["ignore", "pipe", "ignore"] }) as Buffer;
    return buf.toString("utf8").trim();
  } catch { return fallback; }
}

const EXECUTOR_TAG = process.env.ALPHA11_EXECUTOR_TAG ?? "default";
const OFFSET_MS = Number(process.env.ALPHA11_OFFSET_MS ?? String(0));
const OUTPUT_JSON = process.env.ALPHA11_OUTPUT_JSON;

function buildSingleRegistry(): ProvenanceRegistryCollection {
  const REPO_ROOT = path.resolve(__dirname, "..", "..");
  const gitCommit = execGitOrFallback(["rev-parse", "HEAD"], "0000000000000000000000000000000000000000");
  const porcelain = execGitOrFallback(["status", "--porcelain"], "");
  const dirty = porcelain === "" ? 0 : Math.max(1, porcelain.split("\n").filter(Boolean).length);
  const execId = `alpha11:audi-run=${EXECUTOR_TAG}:pid=${process.pid}:startTs=${Date.now() + OFFSET_MS}:user=${process.env.USER ?? "u"}:harness=cold-start-single`;
  const ctx = Object.freeze({
    repoRoot: REPO_ROOT,
    generatedAt: nowIso(OFFSET_MS),
    commonSources: Object.freeze([`repository-local-filesystem-scan:workspace-packages`] as const),
    runner: Object.freeze({ os: process.platform, arch: process.arch, runtime: "node", runtimeVersion: process.version }),
    gitCommit, workingTreeDirtyCount: dirty,
    executorIdentity: execId,
  });

  const corr = runAllIndependentProducers(ctx);
  let reg: ProvenanceRegistryCollection = buildEmptyProvenanceRegistry();
  for (const extPkg of Object.values(corr.extendedPackages)) {
    if (extPkg.__provenanceChain) reg = mergeProvenanceChainIntoRegistry(reg, extPkg.__provenanceChain);
  }
  const mutDefs = { ...reg.experimentDefinitions };
  for (const [da, db] of corr.definitionVersionPairs) {
    const idA = computeExperimentDefinitionIdSync(da);
    const idB = computeExperimentDefinitionIdSync(db);
    if (!mutDefs[String(idA.id)]) mutDefs[String(idA.id)] = Object.freeze({ id: idA.id, algorithm: "sha-256" as const, provenanceVersion: da.provenanceVersion, canonicalBundleLength: idA.canonicalBundleLength, def: da });
    if (!mutDefs[String(idB.id)]) mutDefs[String(idB.id)] = Object.freeze({ id: idB.id, algorithm: "sha-256" as const, provenanceVersion: db.provenanceVersion, canonicalBundleLength: idB.canonicalBundleLength, def: db });
  }
  return Object.freeze({ ...reg, experimentDefinitions: Object.freeze(mutDefs) });
}

function main(): number {
  const reg = buildSingleRegistry();
  // Structural self-check: verify each rawObservation identity matches registry entry.id (catch silent corruption)
  let identityMismatches = 0;
  let totalObs = 0;
  for (const entry of Object.values(reg.rawObservations)) {
    totalObs++;
    const recomputed = computeRawObservationIdSync(entry.obs);
    if (String(recomputed.id) !== String(entry.id)) identityMismatches++;
  }
  console.log(JSON.stringify({
    executorTag: EXECUTOR_TAG,
    offsetMs: OFFSET_MS,
    generatedAt: nowIso(),
    registry: {
      defs: Object.keys(reg.experimentDefinitions).length,
      exes: Object.keys(reg.experimentExecutions).length,
      obs: Object.keys(reg.rawObservations).length,
    },
    identityVerification: { totalObs, identityMismatches, passed: identityMismatches === 0 },
  }, null, 2));

  if (OUTPUT_JSON) {
    const out: any = {
      __schemaVersion: "alpha11:registry-snapshot:v1",
      executorTag: EXECUTOR_TAG,
      generatedAt: nowIso(),
      registry: {
        // Write as plain objects (brands serialize as strings automatically)
        experimentDefinitions: reg.experimentDefinitions,
        experimentExecutions: reg.experimentExecutions,
        rawObservations: reg.rawObservations,
      },
    };
    fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), "utf8");
    process.stderr.write(`[alpha11-exporter] wrote registry snapshot → ${OUTPUT_JSON}\n`);
  }
  return identityMismatches === 0 ? 0 : 1;
}

process.exit(main());
