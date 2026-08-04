import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { EOS_ROOT } from "../../state.js";
import {
  captureExecutionTimestampUtc,
  uniqueStrings,
  writeJsonArtifact,
} from "../../governance-runtime.js";

const ENTERPRISE_ROOT = resolve(EOS_ROOT, "enterprise");
const VOCABULARY_AUDIT_DIRECTORIES = [
  resolve(ENTERPRISE_ROOT, "constitution"),
  resolve(ENTERPRISE_ROOT, "models"),
  resolve(ENTERPRISE_ROOT, "schema"),
  resolve(ENTERPRISE_ROOT, "specifications"),
] as const;

const VOCABULARY_AUDIT_FILE_EXTENSIONS = new Set([".md", ".yaml", ".yml"]);

export const SPECIFICATION_VOCABULARY_AUDIT_PATH = resolve(
  EOS_ROOT,
  "workspace/foundation/evidence/verification/specification-vocabulary-audit.json",
);

type VocabularyLayer = "constitution" | "models" | "schema" | "specifications";

type CanonicalVocabularyTerm = {
  readonly term: string;
  readonly anchor_paths: readonly string[];
};

type VocabularyDefinitionSurface = {
  readonly source_ref: string;
  readonly line: number;
  readonly line_text: string;
  readonly layer: VocabularyLayer;
};

export type CanonicalVocabularyAuditEntry = {
  readonly term: string;
  readonly anchor_paths: readonly string[];
  readonly anchor_surfaces: readonly string[];
  readonly definition_surfaces: readonly string[];
  readonly definition_surface_count_by_layer: Record<VocabularyLayer, number>;
  readonly unauthorized_definition_surfaces: readonly string[];
  readonly drift_status: "PASS" | "WARN" | "FAIL";
  readonly findings: readonly string[];
};

export type SpecificationVocabularyAuditReport = {
  readonly report_id: "specification-vocabulary-audit";
  readonly generated_at: string;
  readonly summary: {
    readonly term_count: number;
    readonly pass_count: number;
    readonly warn_count: number;
    readonly fail_count: number;
    readonly duplicated_definition_count: number;
    readonly drift_status: "PASS" | "WARN" | "FAIL";
  };
  readonly entries: readonly CanonicalVocabularyAuditEntry[];
};

const CANONICAL_VOCABULARY_TERMS: readonly CanonicalVocabularyTerm[] = [
  {
    term: "Canonical Identity",
    anchor_paths: [
      "enterprise/constitution/lexicon.yaml",
      "enterprise/specifications/rfc/RFC-0001-specification-meta-model.md",
    ],
  },
  {
    term: "Identity",
    anchor_paths: [
      "enterprise/constitution/lexicon.yaml",
      "enterprise/specifications/rfc/RFC-0001-specification-meta-model.md",
    ],
  },
  {
    term: "Reference",
    anchor_paths: [
      "enterprise/constitution/meta-model.md",
      "enterprise/specifications/rfc/RFC-0001-specification-meta-model.md",
    ],
  },
  {
    term: "Digest",
    anchor_paths: ["enterprise/specifications/rfc/RFC-0001-specification-meta-model.md"],
  },
  {
    term: "Snapshot",
    anchor_paths: ["enterprise/specifications/rfc/RFC-0001-specification-meta-model.md"],
  },
  {
    term: "Artifact",
    anchor_paths: [
      "enterprise/constitution/meta-model.md",
      "enterprise/specifications/rfc/RFC-0001-specification-meta-model.md",
    ],
  },
  {
    term: "Evidence",
    anchor_paths: [
      "enterprise/constitution/lexicon.yaml",
      "enterprise/specifications/rfc/RFC-0001-specification-meta-model.md",
    ],
  },
  {
    term: "Evaluation",
    anchor_paths: ["enterprise/specifications/rfc/RFC-0001-specification-meta-model.md"],
  },
  {
    term: "Decision",
    anchor_paths: ["enterprise/specifications/rfc/RFC-0001-specification-meta-model.md"],
  },
  {
    term: "Action",
    anchor_paths: ["enterprise/specifications/rfc/RFC-0001-specification-meta-model.md"],
  },
];

const GOVERNED_REUSE_PATTERNS: Readonly<
  Partial<Record<string, readonly RegExp[]>>
> = {
  Identity: [
    /^- identity grammar$/i,
    /^- Identity anchor for traceability$/i,
  ],
  Reference: [
    /^## Reference Tests$/i,
  ],
  Evidence: [
    /^## Evidence Surfaces$/i,
    /^## Evidence Rules$/i,
    /^\|\s*Evidence\s*\|/i,
    /^2\.\s*`Evidence`$/i,
  ],
};

export function materializeSpecificationVocabularyAuditReport(): SpecificationVocabularyAuditReport {
  const candidateFiles = VOCABULARY_AUDIT_DIRECTORIES.flatMap((directoryPath) =>
    listVocabularyFiles(directoryPath),
  );
  const entries = CANONICAL_VOCABULARY_TERMS.map((term) =>
    buildCanonicalVocabularyAuditEntry(term, candidateFiles),
  );
  const passCount = entries.filter((entry) => entry.drift_status === "PASS").length;
  const warnCount = entries.filter((entry) => entry.drift_status === "WARN").length;
  const failCount = entries.filter((entry) => entry.drift_status === "FAIL").length;
  const duplicatedDefinitionCount = entries.reduce(
    (sum, entry) => sum + entry.unauthorized_definition_surfaces.length,
    0,
  );

  return {
    report_id: "specification-vocabulary-audit",
    generated_at: captureExecutionTimestampUtc(),
    summary: {
      term_count: entries.length,
      pass_count: passCount,
      warn_count: warnCount,
      fail_count: failCount,
      duplicated_definition_count: duplicatedDefinitionCount,
      drift_status:
        failCount > 0 ? "FAIL" : warnCount > 0 ? "WARN" : "PASS",
    },
    entries,
  };
}

export function persistSpecificationVocabularyAuditReport(input: {
  readonly path?: string;
  readonly report?: SpecificationVocabularyAuditReport;
} = {}): SpecificationVocabularyAuditReport {
  const report = input.report ?? materializeSpecificationVocabularyAuditReport();
  writeJsonArtifact(input.path ?? SPECIFICATION_VOCABULARY_AUDIT_PATH, report);
  return report;
}

function buildCanonicalVocabularyAuditEntry(
  vocabularyTerm: CanonicalVocabularyTerm,
  candidateFiles: readonly string[],
): CanonicalVocabularyAuditEntry {
  const surfaces = candidateFiles.flatMap((filePath) =>
    findDefinitionSurfaces(vocabularyTerm.term, filePath),
  );
  const anchorSurfaces = surfaces.filter((surface) =>
    vocabularyTerm.anchor_paths.includes(surface.source_ref),
  );
  const unauthorizedSurfaces = surfaces.filter(
    (surface) =>
      !vocabularyTerm.anchor_paths.includes(surface.source_ref) &&
      !isGovernedReuseSurface(vocabularyTerm.term, surface.line_text),
  );

  const definitionSurfaceCountByLayer: Record<VocabularyLayer, number> = {
    constitution: 0,
    models: 0,
    schema: 0,
    specifications: 0,
  };
  for (const surface of surfaces) {
    definitionSurfaceCountByLayer[surface.layer] += 1;
  }

  const findings: string[] = [];
  if (anchorSurfaces.length === 0) {
    findings.push(
      `Canonical term ${vocabularyTerm.term} is missing an approved anchor definition surface.`,
    );
  }
  if (unauthorizedSurfaces.length > 0) {
    findings.push(
      `Canonical term ${vocabularyTerm.term} has ${unauthorizedSurfaces.length} duplicate definition surface(s) outside approved anchors.`,
    );
  }
  const hasImplementationLayerDrift = unauthorizedSurfaces.some(
    (surface) => surface.layer === "models" || surface.layer === "schema",
  );
  if (hasImplementationLayerDrift) {
    findings.push(
      `Canonical term ${vocabularyTerm.term} is being defined from implementation-oriented layers (models/schema), which risks vocabulary drift.`,
    );
  }

  return {
    term: vocabularyTerm.term,
    anchor_paths: vocabularyTerm.anchor_paths,
    anchor_surfaces: uniqueStrings(
      anchorSurfaces.map((surface) => serializeSurface(surface)),
    ),
    definition_surfaces: uniqueStrings(
      surfaces.map((surface) => serializeSurface(surface)),
    ),
    definition_surface_count_by_layer: definitionSurfaceCountByLayer,
    unauthorized_definition_surfaces: uniqueStrings(
      unauthorizedSurfaces.map((surface) => serializeSurface(surface)),
    ),
    drift_status:
      anchorSurfaces.length === 0 || hasImplementationLayerDrift
        ? "FAIL"
        : unauthorizedSurfaces.length > 0
          ? "WARN"
          : "PASS",
    findings,
  };
}

function isGovernedReuseSurface(term: string, lineText: string): boolean {
  const governedReusePatterns = GOVERNED_REUSE_PATTERNS[term] ?? [];
  return governedReusePatterns.some((pattern) => pattern.test(lineText));
}

function findDefinitionSurfaces(
  term: string,
  filePath: string,
): readonly VocabularyDefinitionSurface[] {
  const fileText = readFileSync(filePath, "utf8");
  const sourceRef = normalizeSourceRef(filePath);
  const layer = inferVocabularyLayer(sourceRef);
  const termMatcher = buildDefinitionMatchers(term);

  return fileText
    .split(/\r?\n/)
    .flatMap((lineText, index): readonly VocabularyDefinitionSurface[] =>
      termMatcher.some((matcher) => matcher.test(lineText))
        ? [
            {
              source_ref: sourceRef,
              line: index + 1,
              line_text: lineText.trim(),
              layer,
            },
          ]
        : [],
    );
}

function buildDefinitionMatchers(term: string): readonly RegExp[] {
  const escapedTerm = escapeRegExp(term);
  return [
    new RegExp(`^#{1,6}\\s+(?:\`?${escapedTerm}\`?)(?:\\b|\\s*[:(-])`, "i"),
    new RegExp(`^\\|\\s*\`?${escapedTerm}\`?\\s*\\|`, "i"),
    new RegExp(`canonical_term:\\s*${escapedTerm}\\s*$`, "i"),
  ];
}

function listVocabularyFiles(directoryPath: string): readonly string[] {
  const entries = readdirSync(directoryPath).sort();
  const discoveredFiles: string[] = [];
  for (const entry of entries) {
    const entryPath = resolve(directoryPath, entry);
    const stats = statSync(entryPath);
    if (stats.isDirectory()) {
      discoveredFiles.push(...listVocabularyFiles(entryPath));
      continue;
    }
    if (VOCABULARY_AUDIT_FILE_EXTENSIONS.has(extname(entryPath))) {
      discoveredFiles.push(entryPath);
    }
  }
  return discoveredFiles;
}

function inferVocabularyLayer(sourceRef: string): VocabularyLayer {
  if (sourceRef.startsWith("enterprise/constitution/")) {
    return "constitution";
  }
  if (sourceRef.startsWith("enterprise/models/")) {
    return "models";
  }
  if (sourceRef.startsWith("enterprise/schema/")) {
    return "schema";
  }
  return "specifications";
}

function serializeSurface(surface: VocabularyDefinitionSurface): string {
  return `${surface.source_ref}#L${surface.line}`;
}

function normalizeSourceRef(filePath: string): string {
  return relative(EOS_ROOT, filePath).replace(/\\/g, "/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
