import fs from "node:fs";
import path from "node:path";
import type {
  EvidenceRecord,
  EvidenceRecordDetail,
  EvidenceRecordKind,
  EvidenceRecordScope,
  EvidenceRegistryRepository,
} from "../contracts";

const SCAN_ROOTS = [
  "enterprise/science/gate-c/execution",
  "enterprise/science/gate-c/specification/fixtures/evidence",
  "workspace/examples/vertical-slice/REQ-0001",
  "workspace/examples/vertical-slice/REQ-011",
  "workspace/examples/vertical-slice/REQ-010",
  "examples/vertical-slice/REQ-0001",
  "examples/vertical-slice/REQ-011",
  "examples/vertical-slice/REQ-010",
  "workspace/.eos/evidence/",
  "products",
] as const;

function resolveExternalEvidenceRoot(): string | undefined {
  const raw = process.env.EOS_EVIDENCE_STORAGE_ROOT?.trim();
  return raw && raw.length > 0 ? raw : undefined;
}

function resolveRepoRoot(): string {
  const candidates = [
    "/app",
    process.cwd(),
    path.resolve(process.cwd(), ".."),
    path.resolve(process.cwd(), "../.."),
    "/root/Enterprise-OS/workspace",
  ];

  for (const candidate of Array.from(new Set(candidates))) {
    const hasWorkspaceShape =
      fs.existsSync(path.join(candidate, "capabilities")) &&
      fs.existsSync(path.join(candidate, "products")) &&
      fs.existsSync(path.join(candidate, "package.json"));

    const hasLegacyMarker = fs.existsSync(
      path.join(candidate, "enterprise", "execution", "CAPABILITY-REGISTRY.yaml"),
    );

    if (hasWorkspaceShape || hasLegacyMarker) {
      return candidate;
    }
  }

  throw new Error("Unable to resolve repository root for evidence registry.");
}

function walkFiles(directoryPath: string): string[] {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  const entries = fs.readdirSync(directoryPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(fullPath);
    }
    return entry.isFile() ? [fullPath] : [];
  });
}

function shouldInclude(relativePath: string): boolean {
  return (
    relativePath.endsWith("proof-ledger.yaml") ||
    relativePath.endsWith("coverage-matrix.yaml") ||
    relativePath.endsWith("gate-c-status.yaml") ||
    relativePath.endsWith("acceptance-contract.yaml") ||
    relativePath.endsWith("acceptance-decisions.yaml") ||
    relativePath.includes("/acceptance/") ||
    relativePath.includes("/metrics/canonical-evidence-") ||
    relativePath.endsWith(".els.yaml") ||
    relativePath.endsWith(".eir.json") ||
    relativePath.endsWith("runtime-invocations.jsonl") ||
    (relativePath.includes("/evidence/delivery/") &&
      (relativePath.endsWith(".json") || relativePath.endsWith(".jsonl")))
  );
}

function detectKind(relativePath: string): EvidenceRecordKind {
  if (relativePath.includes("/evidence/delivery/")) {
    return "record";
  }
  if (relativePath.endsWith("proof-ledger.yaml")) {
    return "ledger";
  }
  if (relativePath.endsWith("coverage-matrix.yaml")) {
    return "matrix";
  }
  if (relativePath.endsWith("gate-c-status.yaml")) {
    return "status";
  }
  if (
    relativePath.endsWith("acceptance-contract.yaml") ||
    relativePath.endsWith("acceptance-decisions.yaml")
  ) {
    return "contract";
  }
  if (relativePath.includes("/acceptance/")) {
    return "acceptance";
  }
  if (relativePath.includes("/metrics/canonical-evidence-")) {
    return "metrics";
  }
  if (relativePath.endsWith(".els.yaml")) {
    return "specification";
  }
  return "record";
}

function detectScope(relativePath: string): EvidenceRecordScope {
  return relativePath.startsWith("workspace/examples/") || relativePath.startsWith("products/")
    ? "requirement"
    : "science";
}

function extractRunId(relativePath: string): string | undefined {
  const match = relativePath.match(/\/(run-[^/]+)\//);
  return match?.[1];
}

function extractRequirementRefs(relativePath: string): readonly string[] {
  const matches = relativePath.match(/REQ-\d+/gi) ?? [];
  return Array.from(new Set(matches.map((value) => value.toUpperCase())));
}

function extractDecisionIdsFromJson(
  value: unknown,
  collector: { decisionIds: Set<string>; requirementIds: Set<string> },
): void {
  if (value === null || value === undefined) return;
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (typeof rec.decision_id === "string" && rec.decision_id.length > 0) {
      collector.decisionIds.add(rec.decision_id);
    }
    if (typeof rec.decisionId === "string" && rec.decisionId.length > 0) {
      collector.decisionIds.add(rec.decisionId);
    }
    if (typeof rec.requirement_id === "string" && rec.requirement_id.length > 0) {
      collector.requirementIds.add(rec.requirement_id);
    }
    if (typeof rec.requirementId === "string" && rec.requirementId.length > 0) {
      collector.requirementIds.add(rec.requirementId);
    }
    if (typeof rec.requirementRef === "string" && rec.requirementRef.length > 0) {
      collector.requirementIds.add(rec.requirementRef);
    }
    if (Array.isArray(rec.requirementRefs)) {
      for (const ref of rec.requirementRefs) {
        if (typeof ref === "string" && ref.length > 0) {
          collector.requirementIds.add(ref);
        }
      }
    }
    if (Array.isArray(value)) {
      for (const entry of value as readonly unknown[]) {
        extractDecisionIdsFromJson(entry, collector);
      }
    } else {
      for (const child of Object.values(rec)) {
        extractDecisionIdsFromJson(child, collector);
      }
    }
  }
}

function resolveGovernanceDecisionsByDecisionIds(
  decisionIds: readonly string[],
): readonly { readonly requirement_id: string; readonly decision_id: string }[] {
  if (decisionIds.length === 0) return [];
  try {
    const governanceModule = require("../../../governance-evidence/implementation/services/governed-delivery-seam/delivery-decision-gateway.service") as {
      DeliveryDecisionGatewayService: any;
    };
    const Gateway = governanceModule.DeliveryDecisionGatewayService;
    if (typeof Gateway !== "function") return [];
    const instance = new Gateway();
    const out: { requirement_id: string; decision_id: string }[] = [];
    for (const decisionId of decisionIds) {
      const decision = instance.getDecisionById?.(decisionId);
      if (decision && typeof decision.requirement_id === "string") {
        out.push({ requirement_id: decision.requirement_id, decision_id: decision.decision_id });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function extractIdentityFromEvidenceContent(absolutePath: string): {
  readonly requirementRefs: readonly string[];
  readonly decisionIds: readonly string[];
} {
  try {
    if (!absolutePath.endsWith(".json") && !absolutePath.endsWith(".jsonl")) {
      return { requirementRefs: [], decisionIds: [] };
    }
    const raw = fs.readFileSync(absolutePath, "utf8").trim();
    if (raw.length === 0) {
      return { requirementRefs: [], decisionIds: [] };
    }

    const collector = { decisionIds: new Set<string>(), requirementIds: new Set<string>() };

    if (absolutePath.endsWith(".jsonl")) {
      for (const line of raw.split(/\r?\n/g)) {
        const trimmed = line.trim();
        if (trimmed.length === 0) continue;
        try {
          const parsed = JSON.parse(trimmed);
          extractDecisionIdsFromJson(parsed, collector);
        } catch {
          // Skip malformed line
        }
      }
    } else {
      try {
        const parsed = JSON.parse(raw);
        extractDecisionIdsFromJson(parsed, collector);
      } catch {
        // Non-JSON content, skip content parse
      }
    }

    const resolvedFromDecisions = resolveGovernanceDecisionsByDecisionIds([
      ...collector.decisionIds,
    ]);
    for (const resolved of resolvedFromDecisions) {
      if (resolved.requirement_id) {
        collector.requirementIds.add(resolved.requirement_id);
      }
    }

    return {
      requirementRefs: [...collector.requirementIds],
      decisionIds: [...collector.decisionIds],
    };
  } catch {
    return { requirementRefs: [], decisionIds: [] };
  }
}

function normalizeId(relativePath: string): string {
  return Buffer.from(relativePath, "utf8").toString("base64url");
}

function buildTags(
  kind: EvidenceRecordKind,
  scope: EvidenceRecordScope,
  runId: string | undefined,
  requirementRefs: readonly string[],
  relativePath: string,
): readonly string[] {
  const tags = new Set<string>([kind, scope, path.basename(relativePath)]);
  if (runId !== undefined) {
    tags.add(runId);
  }
  for (const ref of requirementRefs) {
    tags.add(ref);
  }
  if (relativePath.includes("/acceptance/")) {
    tags.add("accepted");
  }
  if (relativePath.includes("/metrics/")) {
    tags.add("metrics");
  }
  return [...tags];
}

function buildRecord(relativePath: string, absolutePath: string): EvidenceRecord {
  const stat = fs.statSync(absolutePath);
  const kind = detectKind(relativePath);
  const scope = detectScope(relativePath);
  const runId = extractRunId(relativePath);
  const pathBasedRefs = extractRequirementRefs(relativePath);
  const contentIdentity = extractIdentityFromEvidenceContent(absolutePath);

  const mergedRefs = Array.from(
    new Set<string>([...pathBasedRefs, ...contentIdentity.requirementRefs]),
  );

  return {
    id: normalizeId(relativePath),
    name: path.basename(relativePath),
    kind,
    scope,
    path: relativePath,
    sizeBytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
    ...(runId !== undefined ? { runId } : {}),
    requirementRefs: mergedRefs,
    tags: buildTags(kind, scope, runId, mergedRefs, relativePath),
    ...(contentIdentity.decisionIds.length > 0
      ? { decisionIds: contentIdentity.decisionIds as readonly string[] }
      : {}),
  } as EvidenceRecord & { readonly decisionIds?: readonly string[] };
}

function buildRecordDetail(absolutePath: string, record: EvidenceRecord): EvidenceRecordDetail {
  const content = fs.readFileSync(absolutePath, "utf8");
  const preview = content.slice(0, 400);
  const lineCount = content === "" ? 0 : content.split(/\r?\n/).length;

  return {
    ...record,
    preview,
    lineCount,
  };
}

interface ScannedRecord {
  readonly absolutePath: string;
  readonly relativePath: string;
  readonly record: EvidenceRecord;
}

function scanRecords(repoRoot: string): readonly ScannedRecord[] {
  const scanRootPaths = SCAN_ROOTS.map((scanRoot) => path.join(repoRoot, scanRoot));
  const repoRecords = scanRootPaths.flatMap((scanRootPath) => walkFiles(scanRootPath)).map((absolutePath) => {
    const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join("/");
    return { absolutePath, relativePath };
  });

  const externalEvidenceRoot = resolveExternalEvidenceRoot();
  const externalRecords =
    externalEvidenceRoot && path.resolve(externalEvidenceRoot) !== path.resolve(repoRoot)
      ? walkFiles(externalEvidenceRoot).map((absolutePath) => ({
          absolutePath,
          relativePath: path.relative(externalEvidenceRoot, absolutePath).split(path.sep).join("/"),
        }))
      : [];

  const deduplicated = new Map<string, { absolutePath: string; relativePath: string }>();
  for (const entry of [...repoRecords, ...externalRecords]) {
    if (shouldInclude(entry.relativePath)) {
      deduplicated.set(entry.relativePath, entry);
    }
  }

  return Array.from(deduplicated.values())
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))
    .map((entry) => ({
      absolutePath: entry.absolutePath,
      relativePath: entry.relativePath,
      record: buildRecord(entry.relativePath, entry.absolutePath),
    }));
}

function listRecords(): readonly EvidenceRecord[] {
  const repoRoot = resolveRepoRoot();
  return scanRecords(repoRoot).map((entry) => entry.record);
}

export const EvidenceRegistryRepositoryFileSystem: EvidenceRegistryRepository = {
  kind: "repository",
  entityName: "EvidenceRecord",
  list() {
    return listRecords();
  },
  byId(id) {
    const repoRoot = resolveRepoRoot();
    const match = scanRecords(repoRoot).find((entry) => entry.record.id === id);
    return match === undefined ? undefined : buildRecordDetail(match.absolutePath, match.record);
  },
} as const;