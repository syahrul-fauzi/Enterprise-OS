import fs from "node:fs";
import path from "node:path";
import {
  buildEmpiricalReplicationGroupsFromMultipleRegistries,
} from "./src/certification/evidence";
import type { ProvenanceRegistryCollection } from "./src/certification/evidence";

function loadRegistry(jsonPath: string): ProvenanceRegistryCollection {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const reg = raw.registry ?? raw;
  return {
    experimentDefinitions: Object.freeze({ ...(reg.experimentDefinitions ?? {}) }),
    experimentExecutions: Object.freeze({ ...(reg.experimentExecutions ?? {}) }),
    rawObservations: Object.freeze({ ...(reg.rawObservations ?? {}) }),
  };
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    process.stderr.write(
      "Usage: npx tsx alpha11-aggregate-registries.ts <output.json> <regA.json> <regB.json> <regC.json> [regD.json ...]\n",
    );
    return 2;
  }
  const [outPath, ...inputs] = args;
  const registries: ProvenanceRegistryCollection[] = inputs.map(loadRegistry);
  const res = buildEmpiricalReplicationGroupsFromMultipleRegistries(registries, {
    classifierId: "alpha11:cold-start-auditor-multi-executor-replication-v1",
  });
  const payload = {
    __schemaVersion: "alpha11:empirical-aggregation:v1",
    aggregatedAt: new Date().toISOString(),
    inputs: inputs.map(p => ({ path: p, defs: Object.keys(loadRegistry(p).experimentDefinitions).length, exes: Object.keys(loadRegistry(p).experimentExecutions).length, obs: Object.keys(loadRegistry(p).rawObservations).length })),
    metrics: res.metrics,
    replicationGroups: res.replicationGroups,
    perDefinitionEmpirical: res.perDefinitionEmpirical,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`[alpha11-aggregate] wrote → ${outPath}`);
  console.log(`[alpha11-aggregate] summary: strong=${res.metrics.definitionsReplicatedStrong} weak=${res.metrics.definitionsReplicatedWeak} fail=${res.metrics.definitionsReplicationFailed} none=${res.metrics.definitionsNotReplicated} regs=${registries.length}`);
  console.log(`[alpha11-aggregate] metrics: reproducibilityRate=${res.metrics.reproducibilityRate01} stability=${res.metrics.observationStability01} disagreement=${res.metrics.disagreementRate01} variance=${res.metrics.executionVariance01}`);
  // Exit code: SUCCESS if >= 2 groups achieved replicated-strong OR registryCount ≥ 3 with reproducibilityRate ≥ 0.90
  const success = res.metrics.definitionsReplicatedStrong >= 2 && res.metrics.reproducibilityRate01 >= 0.90;
  return success ? 0 : 3;
}
process.exit(main());
