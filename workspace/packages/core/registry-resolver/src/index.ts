import { readFileSync } from "node:fs";
import { resolve as pathResolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  TRANSFORMATIONS,
  TRANSFORMATION_COUNT_SPRINT0_REQUIRED,
  getTransformationById as regGetT,
  TRANSFORMATION_REGISTRY_DOCUMENT,
  type TransformationId,
} from "@repo/core-transformation-registry";
import {
  ALL_PREDICATES,
  PREDICATE_COUNT_T001_REQUIRED,
  getPredicateById as regGetP,
} from "@repo/core-predicate-registry";
import type { TransformationDeclaration } from "@repo/core-transformation-registry";
import type { PredicateDeclaration } from "@repo/core-predicate-registry";
import {
  RESOLVER_CONTRACT_KIND,
  KBE_MIN_PREDICATE_COUNT,
  ROOT_OF_TRUST_TRANSFORMATION_ID,
  RESOLVER_VERSION,
  RESOLVER_ID,
  type ResolverResolutionBundle,
  type BlockedStatus,
  type RetryConfig,
} from "./types.js";
import type {
  ResolverDagSpec,
  ResolverProofSpec,
  ResolverStrategySpec,
  ResolverContractRef,
  CompatibilityMatrix,
} from "./interfaces.js";

export * from "./types.js";
export type * from "./interfaces.js";
export * from "./schema.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = pathResolve(join(__dirname, "..", "..", "..", ".."));
const REPO_ROOT = pathResolve(join(WORKSPACE_ROOT, ".."));
const CATALOG_PATH = join(
  REPO_ROOT,
  "enterprise",
  "execution",
  "transformation-catalog.yaml",
);

type CatalogTransformationEntry = {
  id: string;
  contract_ref: string;
  implementation_ref?: string;
  proof_schema_ref?: string;
  predecessor_id?: string | null;
  successor_id?: string | null;
  failure_strategy?: string;
  rollback_strategy?: string;
  semver?: string;
  compatibility_matrix?: {
    requires?: Record<string, string>;
    provides?: Record<string, string>;
  };
  retry_config?: RetryConfig;
  evidence_output_id?: string;
  evidence_output_id_pattern?: string;
  evidence_output_kind?: string;
  predicate_refs?: readonly string[];
  golden_reference_input?: string;
  blocked_until_predecessor_verified?: boolean;
  blocked_until_t001_verified?: boolean;
  blocked_until_t002_verified?: boolean;
  blocked_until_t003_verified?: boolean;
  blocked_until_t004_verified?: boolean;
};

type CatalogRoot = {
  catalog?: unknown;
  transformations?: readonly CatalogTransformationEntry[];
};

const _loadCatalogOnce = (): CatalogRoot => {
  try {
    const raw = readFileSync(CATALOG_PATH, "utf8");
    return YAML.parse(raw) as CatalogRoot;
  } catch {
    return { transformations: [] };
  }
};

const CATALOG: CatalogRoot = _loadCatalogOnce();
const CATALOG_BY_ID: ReadonlyMap<string, CatalogTransformationEntry> = new Map(
  (CATALOG.transformations ?? []).map((e) => [e.id, e]),
);

const DEFAULT_PROOF_SCHEMA =
  "/root/Enterprise-OS/workspace/packages/core/proof-ledger/src/schema.ts::TransformationProofEntrySchema";

const PROOF_SCHEMA_MAP = {
  TRANSFORMATION_PROOF: DEFAULT_PROOF_SCHEMA,
  EXECUTION_PROOF:
    "/root/Enterprise-OS/workspace/packages/core/proof-ledger/src/schema.ts::ExecutionProofEntrySchema",
  REPOSITORY_PROOF:
    "/root/Enterprise-OS/workspace/packages/core/proof-ledger/src/schema.ts::RepositoryProofEntrySchema",
} as const;

const PREDICATE_ORDER: Readonly<Record<string, number>> = {
  PRE_EXECUTION: 1,
  POST_EXECUTION_VERIFICATION: 2,
  POST_EXECUTION: 3,
};

const _buildPredicateList = (
  t: TransformationDeclaration,
  cat: CatalogTransformationEntry | undefined,
): readonly PredicateDeclaration[] => {
  const orderedById = new Map<string, PredicateDeclaration>();
  const orderedCatalogIds = cat?.predicate_refs ?? [];
  for (const id of orderedCatalogIds) {
    const p = ALL_PREDICATES.find((x) => x.predicate_id === id);
    if (p) orderedById.set(id, p);
  }
  for (const ref of t.predicate_refs) {
    const id =
      typeof ref === "string" ? ref : (ref as { predicate_id?: string }).predicate_id;
    if (id && !orderedById.has(id)) {
      const p = regGetP(id);
      if (p) orderedById.set(id, p);
    }
  }
  const list = [...orderedById.values()];
  list.sort((a, b) => {
    const pa = PREDICATE_ORDER[a.phase] ?? 99;
    const pb = PREDICATE_ORDER[b.phase] ?? 99;
    if (pa !== pb) return pa - pb;
    return a.order - b.order;
  });
  return list;
};

const _buildProof = (
  t: TransformationDeclaration,
  cat: CatalogTransformationEntry | undefined,
  predicateCount: number,
): ResolverProofSpec => {
  const outKind = t.evidence_output_kind as string | undefined;
  let catProofLevel: ResolverProofSpec["proof_level"] = "TRANSFORMATION_PROOF";
  if (outKind === "REPOSITORY_PROOF") catProofLevel = "REPOSITORY_PROOF";
  else if (outKind === "EXECUTION_PROOF") catProofLevel = "EXECUTION_PROOF";
  const schemaRef =
    cat?.proof_schema_ref ??
    PROOF_SCHEMA_MAP[catProofLevel] ??
    PROOF_SCHEMA_MAP.TRANSFORMATION_PROOF;
  const pattern =
    cat?.evidence_output_id_pattern ??
    cat?.evidence_output_id ??
    (t.evidence_output_id as string | undefined) ??
    `TRF-PROOF-${t.transformation_id}`;
  const required_count =
    predicateCount >= KBE_MIN_PREDICATE_COUNT
      ? predicateCount
      : PREDICATE_COUNT_T001_REQUIRED;
  return {
    proof_id_pattern: pattern,
    proof_level: catProofLevel,
    proof_schema_zod_ref_path: schemaRef ?? DEFAULT_PROOF_SCHEMA,
    required_predicate_count: required_count,
  };
};

const _buildStrategy = (
  t: TransformationDeclaration,
  cat: CatalogTransformationEntry | undefined,
): ResolverStrategySpec => {
  const failure =
    (cat?.failure_strategy as ResolverStrategySpec["failure_strategy"]) ??
    "FAIL_FAST";
  const rollback =
    (cat?.rollback_strategy as ResolverStrategySpec["rollback_strategy"]) ??
    "NO_ROLLBACK_PURE_FUNCTION";
  const retry: RetryConfig | null =
    failure === "RETRY_N"
      ? cat?.retry_config ?? { max_attempts: 3, backoff: "none_deterministic" }
      : null;
  return {
    failure_strategy: failure,
    rollback_strategy: rollback,
    retry_config_if_retry_n: retry,
  };
};

const _buildDag = (
  t: TransformationDeclaration,
  cat: CatalogTransformationEntry | undefined,
): ResolverDagSpec => {
  const predecessor =
    ((cat?.predecessor_id ?? t.predecessor_id) as ResolverDagSpec["predecessor_id"]) ??
    null;
  const successor =
    (cat?.successor_id as ResolverDagSpec["successor_id"]) ?? null;
  let blocked = false;
  let reason: string | null = null;
  const blocker_cat_true = Boolean(
    t.blocked_until_predecessor_verified ||
      cat?.blocked_until_predecessor_verified ||
      cat?.blocked_until_t001_verified ||
      cat?.blocked_until_t002_verified ||
      cat?.blocked_until_t003_verified ||
      cat?.blocked_until_t004_verified,
  );
  if (predecessor && blocker_cat_true) {
    const predDecl = regGetT(predecessor);
    if (!predDecl) {
      blocked = true;
      reason = `Predecessor ${predecessor} declaration not found`;
    } else if (predDecl.lifecycle !== "VERIFIED" && predDecl.lifecycle !== "FROZEN") {
      blocked = true;
      reason = `Predecessor ${predecessor} lifecycle = ${predDecl.lifecycle} (VERIFIED/FROZEN required, blocked_until_predecessor_verified true per catalog)`;
    }
  }
  return {
    predecessor_id: predecessor,
    successor_id: successor,
    precedence: t.precedence,
    blocked,
    blocked_reason_if_true: blocked ? reason : null,
  };
};

const _buildContract = (
  t: TransformationDeclaration,
  cat: CatalogTransformationEntry | undefined,
): ResolverContractRef => ({
  ref_path: cat?.contract_ref ?? t.contract_ref,
  contract_kind: RESOLVER_CONTRACT_KIND,
});

const _buildCompat = (
  cat: CatalogTransformationEntry | undefined,
): CompatibilityMatrix => ({
  requires: cat?.compatibility_matrix?.requires ?? {},
  provides: cat?.compatibility_matrix?.provides ?? {},
});

const _buildSemver = (cat: CatalogTransformationEntry | undefined): string =>
  cat?.semver?.trim() && /^\d+\.\d+\.\d+/.test(cat.semver.trim())
    ? cat.semver.trim()
    : "0.1.0-DRAFT";

const _buildOne = (t: TransformationDeclaration): ResolverResolutionBundle => {
  const cat = CATALOG_BY_ID.get(t.transformation_id);
  const predicates = _buildPredicateList(t, cat);
  if (predicates.length < KBE_MIN_PREDICATE_COUNT) {
    throw new Error(
      `[REGISTRY-RESOLVER KBE FAIL] ${t.transformation_id}: predicate count = ${predicates.length} < ${KBE_MIN_PREDICATE_COUNT}. KBE 5-artifact gate NOT open.`,
    );
  }
  const proof = {
    ..._buildProof(t, cat, predicates.length),
    required_predicate_count: predicates.length,
  };
  const contract = _buildContract(t, cat);
  const strategy = _buildStrategy(t, cat);
  const dag = _buildDag(t, cat);
  const compatibility_matrix = _buildCompat(cat);
  const semver = _buildSemver(cat);
  return {
    transformation_id: t.transformation_id,
    name_long: t.name_long,
    lifecycle: t.lifecycle,
    contract,
    predicates_ordered: predicates,
    implementation_ref:
      cat?.implementation_ref ??
      `/root/Enterprise-OS/workspace/packages/tooling/${t.transformation_id.toLowerCase()}-standalone/src/${t.transformation_id.toLowerCase()}.ts::run${t.transformation_id}`,
    proof,
    dag,
    strategy,
    semver,
    compatibility_matrix,
    golden_reference_input_dir:
      cat?.golden_reference_input ??
      (t.golden_reference_input as string | undefined) ??
      "/root/Enterprise-OS/workspace/examples/vertical-slice/REQ-0001",
  };
};

const _ALL_BUNDLES_CACHE: readonly ResolverResolutionBundle[] = TRANSFORMATIONS.map(
  _buildOne,
);

export const RESOLVER_REGISTRY_DOCUMENT = {
  resolver_id: RESOLVER_ID,
  resolver_version: RESOLVER_VERSION,
  bundles: _ALL_BUNDLES_CACHE,
  count: _ALL_BUNDLES_CACHE.length,
};

export const resolve = (id: TransformationId): ResolverResolutionBundle => {
  const found = _ALL_BUNDLES_CACHE.find((b) => b.transformation_id === id);
  if (!found) {
    throw new Error(
      `[REGISTRY-RESOLVER FAIL] Unknown TransformationId = ${id}. Allowed = ${TRANSFORMATIONS.map((t) => t.transformation_id).join(", ")}`,
    );
  }
  return found;
};

export const resolveAll = (): readonly ResolverResolutionBundle[] => _ALL_BUNDLES_CACHE;

export const resolveRootOfTrust = (): ResolverResolutionBundle =>
  resolve(ROOT_OF_TRUST_TRANSFORMATION_ID);

export const isBlocked = (id: TransformationId): BlockedStatus => {
  const b = resolve(id);
  return b.dag.blocked
    ? { blocked: true, reason: b.dag.blocked_reason_if_true ?? "blocked per catalog rule" }
    : { blocked: false };
};

export const getRegistryResolverDocument = () => RESOLVER_REGISTRY_DOCUMENT;
export {
  TRANSFORMATION_COUNT_SPRINT0_REQUIRED,
  TRANSFORMATION_REGISTRY_DOCUMENT,
};
export type { PredicateRegistryDocument } from "@repo/core-predicate-registry";
