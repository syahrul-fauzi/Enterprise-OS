import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
import { produceEvidencePackageEnvelope } from "./types.js";
import { buildGraph, normalizeWorkspace, buildCompositionPlan } from "@repo/composition";
import type { DescriptorSource } from "@repo/composition";
import { canonicalSerialize } from "@repo/composition";
import { createRequire } from "node:module";

declare const __filename: string;
const _require = createRequire(__filename);
const crypto = _require("node:crypto") as typeof import("node:crypto");

const PRODUCER_ID = "compiler-compare-v1";
const PRODUCER_NAME = "Compiler Determinism & Cross-Path IEP";
const TARGET_ARTIFACT = "@repo/composition compiler: buildGraph";
const EXPERIMENT_ID = "EXP-A9-CMP-COMPILER-DETERMINISM";

function sha256(s: string): string {
  return crypto.createHash("sha256").update(s, "utf-8").digest("hex");
}

function syntheticCompilerSource(): DescriptorSource {
  return Object.freeze({
    workspace: Object.freeze({
      id: "probe-ws::alpha-9-compiler",
      name: "Alpha.9 Compiler Determinism Probe",
      version: "0.9.0",
      description: "Used only for buildGraph() determinism cross-path comparison IEP.",
      regions: Object.freeze([
        Object.freeze({ id: "r::north", name: "North", slots: Object.freeze(["s::top"]) }),
        Object.freeze({ id: "r::south", name: "South", slots: Object.freeze(["s::bottom"]) }),
      ]),
      slots: Object.freeze([
        Object.freeze({ id: "s::top", name: "Top", defaultExperience: "cap-a::exp-main" }),
        Object.freeze({ id: "s::bottom", name: "Bottom", defaultExperience: "cap-b::exp-main" }),
      ]),
      capabilities: Object.freeze([
        Object.freeze({
          id: "cap-a",
          name: "Cap A",
          version: "0.2.0",
          regions: Object.freeze(["r::north"]),
          slots: Object.freeze(["s::top"]),
          experiences: Object.freeze([Object.freeze({ id: "cap-a::exp-main", name: "Exp A", component: "a-comp" })]),
        }),
        Object.freeze({
          id: "cap-b",
          name: "Cap B",
          version: "1.3.0",
          regions: Object.freeze(["r::south"]),
          slots: Object.freeze(["s::bottom"]),
          experiences: Object.freeze([Object.freeze({ id: "cap-b::exp-main", name: "Exp B", component: "b-comp" })]),
        }),
        Object.freeze({
          id: "cap-c",
          name: "Cap C",
          version: "2.0.0",
          regions: Object.freeze(["r::north"]),
          slots: Object.freeze(["s::top"]),
          experiences: Object.freeze([Object.freeze({ id: "cap-c::exp-main", name: "Exp C", component: "c-comp" })]),
        }),
      ]),
      layout: Object.freeze({
        id: "probe::2col",
        name: "Probe TwoColumn",
        structure: "two-pane" as const,
        regions: Object.freeze(["r::north", "r::south"]),
      }),
      navigation: Object.freeze({
        primary: Object.freeze([
          Object.freeze({ id: "nav::home", label: "Home", targetRegion: "r::north" }),
          Object.freeze({ id: "nav::list", label: "List", targetRegion: "r::south" }),
        ]),
      }),
    }),
  }) as unknown as DescriptorSource;
}

export class CompilerCompareProducer implements IndependentEvidenceProducer {
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
      const src = syntheticCompilerSource();

      assertions.push("CMP-1: buildGraph determinism — N=3 independent invocations with identical DescriptorSource input produce identical SHA-256 WorkspaceGraph");
      const srcCasted = src as unknown as Parameters<typeof buildGraph>[0];
      const runs: Array<{ graphHash: string; edgeCount: number; nodeCount: number }> = [];
      for (let i = 0; i < 3; i++) {
        const g = buildGraph(srcCasted);
        const gNodes = (g as unknown as { nodes?: Readonly<Record<string, unknown>> }).nodes ?? {};
        const gEdges = (g as unknown as { edges?: readonly unknown[] }).edges ?? [];
        runs.push({
          graphHash: sha256(canonicalSerialize(g) as unknown as string),
          nodeCount: Object.keys(gNodes).length,
          edgeCount: Array.isArray(gEdges) ? gEdges.length : 0,
        });
      }
      observations.push(`CMP-1 buildGraph x3 nodeCounts=[${runs.map(r => r.nodeCount).join(",")}] edgeCounts=[${runs.map(r => r.edgeCount).join(",")}]`);
      observations.push(`CMP-1 buildGraph hashes A=${runs[0].graphHash.slice(0, 16)}... B=${runs[1].graphHash.slice(0, 16)}... C=${runs[2].graphHash.slice(0, 16)}...`);
      const graphDet = runs[0].graphHash === runs[1].graphHash && runs[1].graphHash === runs[2].graphHash;
      observations.push(`CMP-1 buildGraph 3x deterministic = ${graphDet}`);
      if (!graphDet) exitCode = 1;

      assertions.push("CMP-2: Compose stage ABI cross-path: graph via buildGraph(normalize→plan→graph) matches graph via single buildGraph(input)");
      const normA = normalizeWorkspace(srcCasted);
      const plan = buildCompositionPlan(normA as unknown as Parameters<typeof buildCompositionPlan>[0]);
      const direct = buildGraph(srcCasted);
      const { buildGraphFromPlan, buildGraphFromNormalized } = _require("@repo/composition") as typeof import("@repo/composition");
      const fromPlan = buildGraphFromPlan(plan as unknown as Parameters<typeof buildGraphFromPlan>[0]);
      const fromNorm = buildGraphFromNormalized(normA as unknown as Parameters<typeof buildGraphFromNormalized>[0]);
      const directHash = sha256(canonicalSerialize(direct) as unknown as string);
      const fromPlanHash = sha256(canonicalSerialize(fromPlan) as unknown as string);
      const fromNormHash = sha256(canonicalSerialize(fromNorm) as unknown as string);
      observations.push(`CMP-2 direct graph hash=${directHash.slice(0, 16)}...  buildGraphFromNormalized hash=${fromNormHash.slice(0, 16)}...  buildGraphFromPlan hash=${fromPlanHash.slice(0, 16)}...`);
      const pathAgreement = directHash === fromNormHash && fromNormHash === fromPlanHash;
      observations.push(`CMP-2 three compiler paths all agree graph identity=${pathAgreement}`);
      if (!pathAgreement) exitCode = 1;

      assertions.push("CMP-3: N=3 normalizeWorkspace() + buildCompositionPlan() determinism on identical synthetic input");
      const normHashes: string[] = [];
      const planHashes: string[] = [];
      for (let i = 0; i < 3; i++) {
        normHashes.push(sha256(canonicalSerialize(normalizeWorkspace(srcCasted)) as unknown as string));
        const normI = normalizeWorkspace(srcCasted);
        planHashes.push(sha256(canonicalSerialize(buildCompositionPlan(normI as unknown as Parameters<typeof buildCompositionPlan>[0])) as unknown as string));
      }
      const normDet = normHashes[0] === normHashes[1] && normHashes[1] === normHashes[2];
      const planDet = planHashes[0] === planHashes[1] && planHashes[1] === planHashes[2];
      observations.push(`CMP-3 normalize x3 deterministic=${normDet} hashes=[${normHashes.map(h => h.slice(0, 10)).join(",")}]`);
      observations.push(`CMP-3 buildPlan x3 deterministic=${planDet} hashes=[${planHashes.map(h => h.slice(0, 10)).join(",")}]`);
      if (!normDet || !planDet) exitCode = 1;

      assertions.push("CMP-4: buildGraph output topological invariants: node ids total = capabilities + regions + slots count in synthetic input (≥ 3 caps + 2 regions + 2 slots = ≥ 7)");
      observations.push(`CMP-4 graph node count=${runs[0].nodeCount} expected minimum 7 (3 caps + 2 regions + 2 slots); edge count=${runs[0].edgeCount}`);
      if (runs[0].nodeCount < 7) exitCode = 1;
    } catch (err) {
      exitCode = 1;
      observations.push(`CMP-FATAL exception: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
    }

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: Object.freeze([
          "Construct synthetic 3-capability DescriptorSource (two regions, two slots) — pure frozen input.",
          "Invoke buildGraph(source) N=3 consecutive times. Compute canonicalSerialize SHA-256 per WorkspaceGraph output. Assert all three match.",
          "Verify compiler cross-path agreement: buildGraph(input) direct vs buildGraphFromNormalized(normalizeWorkspace(input)) vs buildGraphFromPlan(buildCompositionPlan(normalizeWorkspace(input))) — three distinct ABI paths, all three canonical graph hash must equal.",
          "Run normalizeWorkspace(source) N=3; buildCompositionPlan(norm) N=3. Assert three identical SHA-256 per layer = per-stage determinism separately.",
          "Sanity topological invariant: graph output node count must be at least minimum derived from input structural element counts.",
        ]),
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "buildGraph(source) call x3",
          "normalizeWorkspace(source) call x6 (3 for CMP-1 prep implicitly, 3 for CMP-3)",
          "buildCompositionPlan x3 for CMP-3 + x1 for CMP-2",
          "buildGraphFromNormalized() call",
          "buildGraphFromPlan() call",
          "canonicalSerialize of WorkspaceGraph, NormalizedWorkspace, CompositionPlan",
          "node:crypto SHA-256 of serialized outputs",
        ]),
        scriptFile: "packages/composition/src/certification/producers/compiler-compare.ts",
        functionName: "CompilerCompareProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "Synthetic DescriptorSource frozen immutable",
          "@repo/composition exports normalizeWorkspace, buildCompositionPlan, buildGraph, buildGraphFromPlan, buildGraphFromNormalized from public surface",
          "node:crypto sha256 available",
        ]),
      },
      ctx,
    );
  }
}

export const compilerCompare = new CompilerCompareProducer();
