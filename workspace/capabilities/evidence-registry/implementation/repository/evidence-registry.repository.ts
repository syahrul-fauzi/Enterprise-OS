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
  "examples/vertical-slice/REQ-0001",
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
    (relativePath.includes("/evidence/delivery/") && relativePath.endsWith(".json"))
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
  const requirementRefs = extractRequirementRefs(relativePath);

  return {
    id: normalizeId(relativePath),
    name: path.basename(relativePath),
    kind,
    scope,
    path: relativePath,
    sizeBytes: stat.size,
    updatedAt: stat.mtime.toISOString(),
    ...(runId !== undefined ? { runId } : {}),
    requirementRefs,
    tags: buildTags(kind, scope, runId, requirementRefs, relativePath),
  };
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
