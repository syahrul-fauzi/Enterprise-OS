import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type { TransformationDeclaration } from "../interfaces";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REGISTRY_ROOT = resolve(__dirname, "transformations");

type ManifestTransformationDeclaration = {
  readonly transformation_id: string;
  readonly name_long: string;
  readonly description: string;
  readonly input_kind: string;
  readonly output_kind: string;
  readonly lifecycle: "DRAFT" | "REVIEWED" | "VERIFIED" | "FROZEN" | "DEPRECATED";
  readonly contract_ref: string;
  readonly proof_schema_ref?: string;
  readonly evidence_output_kind?: string;
  readonly evidence_output_id?: string;
  readonly golden_reference_input?: string;
  readonly root_of_truth?: boolean;
  readonly standalone_implementation_required?: boolean;
  readonly engine_dependency_forbidden_until_gate_c_verified?: boolean;
  readonly precedence?: string;
  readonly predecessor_id?: string | null;
  readonly successor_id?: string | null;
  readonly failure_strategy?: string;
  readonly rollback_strategy?: string;
  readonly semver?: string;
  readonly semantic?: {
    readonly predicates?: readonly string[];
  };
};

type ManifestRoot = {
  readonly transformation_declaration: ManifestTransformationDeclaration;
};

type PredicateRefPhase = "PRE_EXECUTION" | "POST_EXECUTION_VERIFICATION" | "POST_EXECUTION";
const DEFAULT_PHASE_PER_INDEX: readonly PredicateRefPhase[] = [
  "PRE_EXECUTION",
  "POST_EXECUTION_VERIFICATION",
  "POST_EXECUTION",
];

export function loadTransformationManifest(
  id: string,
): TransformationDeclaration | { readonly loadError: string } {
  const lower = id.toLowerCase();
  const manifestPath = join(REGISTRY_ROOT, lower, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    return { loadError: `manifest.yaml not found for ${id} at ${manifestPath}` };
  }
  try {
    const raw = readFileSync(manifestPath, "utf8");
    const parsed = YAML.parse(raw) as unknown;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("transformation_declaration" in (parsed as ManifestRoot))
    ) {
      return { loadError: `manifest root missing transformation_declaration for ${id}` };
    }
    const m = (parsed as ManifestRoot).transformation_declaration;
    const predicateIds = m.semantic?.predicates ?? [];
    const predicate_refs = predicateIds.map((pid: string, i: number) => ({
      predicate_id: pid,
      phase: (DEFAULT_PHASE_PER_INDEX[i] ?? "POST_EXECUTION") as PredicateRefPhase,
    }));
    return {
      transformation_id: m.transformation_id,
      name_long: m.name_long,
      description: m.description,
      input_kind: m.input_kind,
      output_kind: m.output_kind,
      lifecycle: m.lifecycle,
      contract_ref: m.contract_ref,
      predicate_refs,
      evidence_output_kind: m.evidence_output_kind,
      evidence_output_id: m.evidence_output_id,
      golden_reference_input: m.golden_reference_input,
      root_of_trust: m.root_of_truth ?? false,
      standalone_implementation_required: m.standalone_implementation_required ?? false,
      engine_dependency_forbidden_until_gate_c_verified:
        m.engine_dependency_forbidden_until_gate_c_verified ?? false,
      precedence: m.precedence,
      blocked_until_predecessor_verified: m.predecessor_id !== null && m.predecessor_id !== undefined,
      predecessor_id: m.predecessor_id ?? undefined,
    } as TransformationDeclaration;
  } catch (err) {
    return { loadError: `YAML parse error manifest ${id}: ${(err as Error).message}` };
  }
}

export function loadAllTransformationManifests(): readonly TransformationDeclaration[] {
  const out: TransformationDeclaration[] = [];
  const KNOWN: readonly string[] = ["T001"];
  for (const id of KNOWN) {
    const loaded = loadTransformationManifest(id);
    if ("loadError" in loaded) continue;
    out.push(loaded);
  }
  return out;
}
