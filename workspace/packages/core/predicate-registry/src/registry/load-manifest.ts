import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import type { PredicateDeclaration } from "../interfaces.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REGISTRY_ROOT = resolve(__dirname, "predicates");

type ManifestPredicateItem = {
  readonly predicate_id: string;
  readonly name: string;
  readonly description: string;
  readonly phase: "PRE_EXECUTION" | "POST_EXECUTION_VERIFICATION" | "POST_EXECUTION";
  readonly transformation_id: string;
  readonly applies_to: string;
  readonly failure_mode: string;
  readonly severity: string;
  readonly schema_ref?: string;
  readonly order: number;
};

type ManifestRoot = {
  readonly for_transformation_id: string;
  readonly predicate_declarations: readonly ManifestPredicateItem[];
};

export function loadPredicateManifestGroup(
  transformationId: string,
): readonly PredicateDeclaration[] | { readonly loadError: string } {
  const lower = transformationId.toLowerCase();
  const manifestPath = join(REGISTRY_ROOT, lower, "manifest.yaml");
  if (!existsSync(manifestPath)) {
    return { loadError: `manifest.yaml not found for predicates of ${transformationId} at ${manifestPath}` };
  }
  try {
    const raw = readFileSync(manifestPath, "utf8");
    const parsed = YAML.parse(raw) as unknown;
    if (
      parsed === null ||
      typeof parsed !== "object" ||
      !("predicate_declarations" in (parsed as ManifestRoot))
    ) {
      return { loadError: `manifest root missing predicate_declarations for ${transformationId}` };
    }
    const m = parsed as ManifestRoot;
    return m.predicate_declarations.map((p) => ({
      predicate_id: p.predicate_id,
      name: p.name,
      description: p.description,
      phase: p.phase,
      transformation_id: p.transformation_id,
      applies_to: p.applies_to,
      failure_mode: p.failure_mode,
      severity: p.severity,
      schema_ref: p.schema_ref,
      order: p.order,
    })) as readonly PredicateDeclaration[];
  } catch (err) {
    return { loadError: `YAML parse error predicate manifest ${transformationId}: ${(err as Error).message}` };
  }
}

export function loadAllPredicateManifests(): readonly PredicateDeclaration[] {
  const out: PredicateDeclaration[] = [];
  const KNOWN: readonly string[] = ["T001"];
  for (const id of KNOWN) {
    const loaded = loadPredicateManifestGroup(id);
    if ("loadError" in loaded) continue;
    for (const p of loaded) out.push(p);
  }
  return out;
}
