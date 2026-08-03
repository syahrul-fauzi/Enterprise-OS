import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
] as const;

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../",
);
const SCAN_ROOT_PATHS = SCAN_ROOTS.map((scanRoot) => path.join(REPO_ROOT, scanRoot));

function resolveRepoRoot(): string {
  const marker = path.join(REPO_ROOT, "enterprise", "execution", "CAPABILITY-REGISTRY.yaml");
  if (!fs.existsSync(marker)) {
    throw new Error("Unable to resolve repository root for evidence registry.");
  }
  return REPO_ROOT;
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
    relativePath.endsWith(".eir.json")
  );
}

function detectKind(relativePath: string): EvidenceRecordKind {
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
  return relativePath.startsWith("workspace/examples/") ? "requirement" : "science";
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

function buildRecord(repoRoot: string, absolutePath: string): EvidenceRecord {
  const relativePath = path.relative(repoRoot, absolutePath).split(path.sep).join("/");
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

function buildRecordDetail(repoRoot: string, record: EvidenceRecord): EvidenceRecordDetail {
  const absolutePath = path.join(/* turbopackIgnore: true */ repoRoot, record.path);
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
  readonly record: EvidenceRecord;
}

function scanRecords(repoRoot: string): readonly ScannedRecord[] {
  return SCAN_ROOT_PATHS.flatMap((scanRootPath) => walkFiles(scanRootPath))
    .filter((absolutePath) => shouldInclude(path.relative(repoRoot, absolutePath).split(path.sep).join("/")))
    .sort((left, right) => left.localeCompare(right))
    .map((absolutePath) => ({
      absolutePath,
      record: buildRecord(repoRoot, absolutePath),
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
    return match === undefined ? undefined : buildRecordDetail(repoRoot, match.record);
  },
} as const;
