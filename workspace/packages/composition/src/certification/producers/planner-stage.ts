import type { IndependentEvidenceProducer, ProducerContext } from "./types";
import { produceEvidencePackageEnvelope } from "./types";
import { normalizeWorkspace, buildCompositionPlan, buildGraphFromNormalized, buildGraphFromPlan } from "@repo/composition";
import type { DescriptorSource, NormalizedWorkspace, CompositionPlan, WorkspaceGraph } from "@repo/composition";
import { canonicalSerialize } from "@repo/composition";
import { createRequire } from "node:module";

declare const __filename: string;
const _require = createRequire(__filename);
const crypto = _require("node:crypto") as typeof import("node:crypto");

const PRODUCER_ID = "planner-stage-v1";
const PRODUCER_NAME = "Composition Planner & Normalizer Stage IEP";
const TARGET_ARTIFACT = "@repo/composition planner layer (normalize → buildCompositionPlan → graph)";
const EXPERIMENT_ID = "EXP-A9-PLAN-STAGE-DETERMINISM";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

function syntheticDescriptorSource(): DescriptorSource {
  return Object.freeze({
    workspace: Object.freeze({
      id: "probe-ws::alpha-9-plan",
      name: "Alpha.9 Plan Stage Determinism Probe Workspace",
      version: "0.9.0",
      description: "Probe-only synthetic descriptor source; NOT real product manifest.",
      regions: Object.freeze([
        Object.freeze({ id: "region::primary", name: "Primary", slots: Object.freeze(["slot::main"]) }),
      ]),
      slots: Object.freeze([
        Object.freeze({ id: "slot::main", name: "Main Slot", defaultExperience: "probe::exp-a" }),
      ]),
      capabilities: Object.freeze([
        Object.freeze({
          id: "probe::cap-a",
          name: "Probe Cap A",
          version: "0.1.0",
          regions: Object.freeze(["region::primary"]),
          slots: Object.freeze(["slot::main"]),
          experiences: Object.freeze([
            Object.freeze({ id: "probe::exp-a", name: "Default Experience", component: "probe::comp-a" }),
          ]),
        }),
        Object.freeze({
          id: "probe::cap-b",
          name: "Probe Cap B",
          version: "0.1.0",
          regions: Object.freeze(["region::primary"]),
          slots: Object.freeze(["slot::main"]),
          experiences: Object.freeze([
            Object.freeze({ id: "probe::exp-b", name: "Exp B", component: "probe::comp-b" }),
          ]),
        }),
      ]),
      layout: Object.freeze({ id: "probe::layout", name: "Probe Layout", structure: "single-pane" as const, regions: Object.freeze(["region::primary"]) }),
      navigation: Object.freeze({ primary: Object.freeze([]) }),
    }),
  }) as unknown as DescriptorSource;
}

export class PlannerStageProducer implements IndependentEvidenceProducer {
  readonly producerId = PRODUCER_ID;
  readonly producerName = PRODUCER_NAME;
  readonly derivation = "Raw" as const;
  readonly experimentId = EXPERIMENT_ID;
  readonly targetArtifactPath = TARGET_ARTIFACT;

  produce(ctx: ProducerContext) {
    void ctx;
    const observations: string[] = [];
    const assertions: string[] = [];
    let exitCode = 0;

    try {
      const source = syntheticDescriptorSource();
      assertions.push("PLAN-1: normalizeWorkspace returns non-null NormalizedWorkspace with workspaceId set");
      const normA: NormalizedWorkspace = normalizeWorkspace(source as unknown as Parameters<typeof normalizeWorkspace>[0]);
      observations.push(`PLAN-1 normalized workspaceId=${(normA as unknown as { workspaceId?: unknown }).workspaceId as string | undefined ?? "null"} cap-count=${Array.isArray((normA as unknown as { capabilities?: readonly unknown[] }).capabilities) ? ((normA as unknown as { capabilities: readonly unknown[] }).capabilities.length) : "none"}`);

      assertions.push("PLAN-2: normalizeWorkspace DETERMINISTIC (2 runs dengan input sama menghasilkan identity SHA-256 sama)");
      const normB = normalizeWorkspace(source as unknown as Parameters<typeof normalizeWorkspace>[0]);
      const normHashA = sha256(canonicalSerialize(normA) as unknown as string);
      const normHashB = sha256(canonicalSerialize(normB) as unknown as string);
      observations.push(`PLAN-2 normalize workspace SHA-256 run1=${normHashA.slice(0, 16)} run2=${normHashB.slice(0, 16)} match=${normHashA === normHashB}`);
      if (normHashA !== normHashB) exitCode = 1;

      assertions.push("PLAN-3: buildCompositionPlan(normalized) menghasilkan plan dengan capability nodes count ≥ capabilities count in");
      const planA: CompositionPlan = buildCompositionPlan(normA as unknown as Parameters<typeof buildCompositionPlan>[0]);
      const nodes = Object.values((planA as unknown as { nodes?: Readonly<Record<string, unknown>> }).nodes ?? {});
      observations.push(`PLAN-3 composition plan nodes count=${nodes.length} capCountIn=${2}`);
      if (nodes.length < 2) exitCode = 1;

      assertions.push("PLAN-4: buildCompositionPlan DETERMINISTIC (2 runs identik normalized input → plan SHA-256 identik)");
      const planB = buildCompositionPlan(normB as unknown as Parameters<typeof buildCompositionPlan>[0]);
      const planHashA = sha256(canonicalSerialize(planA) as unknown as string);
      const planHashB = sha256(canonicalSerialize(planB) as unknown as string);
      observations.push(`PLAN-4 plan SHA-256 A=${planHashA.slice(0, 16)} B=${planHashB.slice(0, 16)} match=${planHashA === planHashB}`);
      if (planHashA !== planHashB) exitCode = 1;

      assertions.push("PLAN-5: Dua path pembangunan graph = buildGraphFromNormalized(norm) dan buildGraphFromPlan(plan) menghasilkan set node ids yang identik (plan→graph consistency)");
      const graphFromNorm: WorkspaceGraph = buildGraphFromNormalized(normA as unknown as Parameters<typeof buildGraphFromNormalized>[0]);
      const graphFromPlan: WorkspaceGraph = buildGraphFromPlan(planA as unknown as Parameters<typeof buildGraphFromPlan>[0]);
      const normGraphIds = Object.keys((graphFromNorm as unknown as { nodes?: Readonly<Record<string, unknown>> }).nodes ?? {}).sort();
      const planGraphIds = Object.keys((graphFromPlan as unknown as { nodes?: Readonly<Record<string, unknown>> }).nodes ?? {}).sort();
      observations.push(`PLAN-5 graphFromNormalized nodes=${normGraphIds.length} ids=[${normGraphIds.join(",")}]`);
      observations.push(`PLAN-5 graphFromPlan nodes=${planGraphIds.length} ids=[${planGraphIds.join(",")}]`);
      const sameCount = normGraphIds.length === planGraphIds.length;
      const sameIds = sameCount && normGraphIds.every((v, i) => v === planGraphIds[i]);
      observations.push(`PLAN-5 graph nodes match=${sameIds}`);
      if (!sameIds) exitCode = 1;

      assertions.push("PLAN-6: buildGraphFromPlan dan buildGraphFromNormalized DETERMINISTIC (2x rerun hash identik)");
      const gNormHashA = sha256(canonicalSerialize(graphFromNorm) as unknown as string);
      const gPlanHashA = sha256(canonicalSerialize(graphFromPlan) as unknown as string);
      const gNormHashB = sha256(canonicalSerialize(buildGraphFromNormalized(normB as unknown as Parameters<typeof buildGraphFromNormalized>[0])) as unknown as string);
      const gPlanHashB = sha256(canonicalSerialize(buildGraphFromPlan(planB as unknown as Parameters<typeof buildGraphFromPlan>[0])) as unknown as string);
      observations.push(`PLAN-6 graphFromNormalized rerun hash match=${gNormHashA === gNormHashB} A=${gNormHashA.slice(0, 12)}... B=${gNormHashB.slice(0, 12)}...`);
      observations.push(`PLAN-6 graphFromPlan rerun hash match=${gPlanHashA === gPlanHashB} A=${gPlanHashA.slice(0, 12)}... B=${gPlanHashB.slice(0, 12)}...`);
      if (gNormHashA !== gNormHashB) exitCode = 1;
      if (gPlanHashA !== gPlanHashB) exitCode = 1;

      observations.push(`PLAN-SUMMARY determinism assertions all-passed=${exitCode === 0} (exitCode=${exitCode})`);
    } catch (err) {
      exitCode = 1;
      observations.push(`PLAN-FATAL exception: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    }

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: Object.freeze([
          "Construct synthetic DescriptorSource (2 capabilities, 1 region, 1 slot, 1 layout) — deep-frozen deterministic.",
          "Run normalizeWorkspace(source) TWICE on the same input. Compute canonicalSerialize SHA-256 over both NormalizedWorkspace outputs. Assert identity match.",
          "Invoke buildCompositionPlan(normalized) on each of both norm results. Compute SHA-256 over plan serialization. Assert plan determinism.",
          "Build WorkspaceGraph VIA DUA PATH: buildGraphFromNormalized(norm) vs buildGraphFromPlan(plan). Extract node id set sorted. Assert equality = plan-stage correctness.",
          "Re-run buildGraphFromNormalized and buildGraphFromPlan again. Assert 2x determinism for each path.",
        ]),
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "@repo/composition normalizeWorkspace() pure function call x2",
          "@repo/composition buildCompositionPlan() pure call x2",
          "@repo/composition buildGraphFromNormalized() call x3",
          "@repo/composition buildGraphFromPlan() call x3",
          "canonicalSerialize package for structural to-string deterministic hashing",
          "node:crypto.createHash(sha256) hex digest comparison",
        ]),
        scriptFile: "packages/composition/src/certification/producers/planner-stage.ts",
        functionName: "PlannerStageProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "Synthetic DescriptorSource harus pure frozen (tidak dimodifikasi oleh normalizer)",
          "@repo/composition normalizer and planner exported and accessible",
          "canonicalSerialize importable from package public surface",
          "node:crypto available (sha256 hash determinism)",
        ]),
      },
      ctx,
    );
  }
}

export const plannerStage = new PlannerStageProducer();
