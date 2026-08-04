import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import { materializeProjection } from "../src/projection-runtime.js";
import {
  materializeCanonicalEvidenceArtifact,
  writeCanonicalEvidenceArtifact,
} from "../src/evidence-artifact-runtime.js";

test("canonical evidence artifact materializes deterministic governed envelope", () => {
  const projection = materializeProjection({
    projectionType: "SpecificationConformanceProjection",
    generatedAtUtc: "2026-08-03T10:00:00.000Z",
    generatedFrom: [
      {
        source_type: "specification_registry",
        source_ref: "enterprise/specifications/specification-registry.yaml",
        source_digest: "digest:registry",
      },
    ],
    payload: {
      report_id: "specification-conformance-report",
      status: "PASS",
    },
  });

  const artifactA = materializeCanonicalEvidenceArtifact({
    artifactType: "specification-conformance-evidence",
    generatedAtUtc: "2026-08-03T10:01:00.000Z",
    subject: {
      subjectRef: "enterprise/specifications/specification-registry.yaml",
      subjectType: "specification-registry",
    },
    projection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    summary: {
      status: "PASS",
      clause_count: 4,
    },
    findings: [],
    evidence: {
      coverage_percent: 100,
    },
    claimBoundary:
      "Projection presents evaluable conformance results. Evidence freezes the projection as an auditable canonical artifact.",
  });

  const artifactB = materializeCanonicalEvidenceArtifact({
    artifactType: "specification-conformance-evidence",
    generatedAtUtc: "2026-08-03T10:01:00.000Z",
    subject: {
      subjectRef: "enterprise/specifications/specification-registry.yaml",
      subjectType: "specification-registry",
    },
    projection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    summary: {
      status: "PASS",
      clause_count: 4,
    },
    findings: [],
    evidence: {
      coverage_percent: 100,
    },
    claimBoundary:
      "Projection presents evaluable conformance results. Evidence freezes the projection as an auditable canonical artifact.",
  });

  assert.equal(artifactA.digest, artifactB.digest);
  assert.equal(artifactA.artifact_id, artifactB.artifact_id);
  assert.equal(artifactA.schema_version, "1.0.0");
  assert.equal(artifactA.subject.subject_ref, "enterprise/specifications/specification-registry.yaml");
  assert.equal(artifactA.subject.subject_digest === null, false);
  assert.equal(artifactA.projection.projection_type, "SpecificationConformanceProjection");
  assert.equal(artifactA.signature.status, "UNSIGNED");
  assert.match(artifactA.signature.reason, /not materialized yet/i);
});

test("canonical evidence artifact can be persisted as auditable json", () => {
  const projection = materializeProjection({
    projectionType: "SpecificationConformanceProjection",
    generatedAtUtc: "2026-08-03T10:00:00.000Z",
    generatedFrom: [
      {
        source_type: "specification_registry",
        source_ref: "enterprise/specifications/specification-registry.yaml",
        source_digest: "digest:registry",
      },
    ],
    payload: {
      report_id: "specification-conformance-report",
      status: "PASS",
    },
  });

  const artifact = materializeCanonicalEvidenceArtifact({
    artifactType: "specification-conformance-evidence",
    generatedAtUtc: "2026-08-03T10:01:00.000Z",
    subject: {
      subjectRef: "enterprise/specifications/specification-registry.yaml",
      subjectType: "specification-registry",
    },
    projection,
    projectionRef:
      "workspace/foundation/evidence/verification/specification-conformance-projection.json",
    summary: {
      status: "PASS",
    },
    findings: [],
    evidence: {
      coverage_percent: 100,
    },
    claimBoundary:
      "Projection presents evaluable conformance results. Evidence freezes the projection as an auditable canonical artifact.",
  });

  const outputPath = resolve(
    tmpdir(),
    `canonical-evidence-artifact-${process.pid}.json`,
  );
  writeCanonicalEvidenceArtifact(outputPath, artifact);

  assert.ok(existsSync(outputPath));
  const persisted = JSON.parse(readFileSync(outputPath, "utf8")) as {
    readonly digest: string;
    readonly artifact_type: string;
    readonly projection: { readonly projection_id: string };
  };

  assert.equal(persisted.digest, artifact.digest);
  assert.equal(
    persisted.artifact_type,
    "specification-conformance-evidence",
  );
  assert.equal(persisted.projection.projection_id, projection.projection_id);
});
