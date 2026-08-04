import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import test from "node:test";

import {
  loadSpecificationRegistry,
  materializeSpecificationArtifactGraph,
  materializeSpecificationConformanceReport,
  persistSpecificationArtifactGraph,
  persistSpecificationConformanceReport,
} from "../src/specification-conformance-runtime.js";
import {
  materializeSpecificationVocabularyAuditReport,
  persistSpecificationVocabularyAuditReport,
} from "../src/specification-vocabulary-audit-runtime.js";

test("specification registry enumerates active RFC entries", () => {
  const registry = loadSpecificationRegistry();

  assert.equal(registry.registry_version, "2.2.0");
  assert.equal(registry.artifact_entries.length, 50);
  assert.equal(registry.artifact_edges.length, 125);
  assert.equal(registry.rfc_entries.length, 8);
  assert.equal(registry.conf_entries.length, 8);
  assert.equal(registry.spec_entries.length, 9);
  assert.deepEqual(
    registry.rfc_entries.map((entry) => entry.rfc_id),
    [
      "RFC-0001",
      "RFC-0002",
      "RFC-0003",
      "RFC-0004",
      "RFC-0005",
      "RFC-0006",
      "RFC-0007",
      "RFC-0010",
    ],
  );
  assert.deepEqual(
    registry.conf_entries.map((entry) => entry.conf_id),
    [
      "CONF-0001",
      "CONF-0002",
      "CONF-0003",
      "CONF-0004",
      "CONF-0005",
      "CONF-0006",
      "CONF-0007",
      "CONF-0010",
    ],
  );
  assert.deepEqual(
    registry.rfc_entries.map((entry) => entry.conformance_ref),
    registry.conf_entries.map((entry) => entry.source_ref),
  );
  assert.ok(
    registry.artifact_edges.some(
      (edge) =>
        edge.from === "CONTRACT-policy-engine-spi" &&
        edge.to === "RFC-0004" &&
        edge.edge_kind === "implements",
    ),
  );
  assert.ok(
    registry.artifact_edges.some(
      (edge) =>
        edge.from === "PROJ-specification-conformance-projection" &&
        edge.to === "CONF-0006" &&
        edge.edge_kind === "references",
    ),
  );
  assert.ok(
    registry.artifact_edges.some(
      (edge) =>
        edge.from === "EVIDENCE-specification-conformance-evidence" &&
        edge.to === "PROJ-specification-conformance-projection" &&
        edge.edge_kind === "references",
    ),
  );
  assert.ok(
    registry.artifact_edges.some(
      (edge) =>
        edge.from === "EVIDENCE-specification-vocabulary-audit" &&
        edge.to === "CONF-0001" &&
        edge.edge_kind === "references",
    ),
  );
  assert.deepEqual(
    registry.spec_entries.map((entry) => entry.spec_id),
    [
      "SPEC-0101",
      "SPEC-0102",
      "SPEC-0103",
      "SPEC-0104",
      "SPEC-0105",
      "SPEC-0106",
      "SPEC-0107",
      "SPEC-0108",
      "SPEC-0109",
    ],
  );
  const evaluatorInputSpec = registry.spec_entries.find(
    (entry) => entry.spec_id === "SPEC-0101",
  );
  assert.ok(evaluatorInputSpec);
  assert.deepEqual(evaluatorInputSpec.governed_by, ["RFC-0001", "RFC-0003"]);
  assert.ok(
    evaluatorInputSpec.implemented_by.includes(
      "workspace/packages/tooling/eos-cli/src/runtime-contracts/models/evaluation.ts",
    ),
  );

  const decisionOutputSpec = registry.spec_entries.find(
    (entry) => entry.spec_id === "SPEC-0107",
  );
  assert.ok(decisionOutputSpec);
  assert.deepEqual(decisionOutputSpec.governed_by, ["RFC-0001", "RFC-0010"]);
  assert.ok(
    decisionOutputSpec.implemented_by.includes(
      "workspace/packages/tooling/eos-cli/src/runtime-contracts/models/decision.ts",
    ),
  );
});

test("specification conformance report projects RFC and CONF coverage surfaces", () => {
  const report = materializeSpecificationConformanceReport();

  assert.equal(report.report_id, "specification-conformance-report");
  assert.equal(report.summary.rfc_count, 8);
  assert.equal(report.summary.conf_count, 8);
  assert.equal(report.summary.clause_count, 29);
  assert.equal(report.summary.clause_pass_count, 29);
  assert.equal(report.summary.clause_warn_count, 0);
  assert.equal(report.summary.clause_fail_count, 0);
  assert.equal(report.summary.fail_count, 0);
  assert.equal(report.summary.warn_count, 0);
  assert.equal(report.summary.pass_count, 16);
  assert.equal(report.summary.average_coverage_percent, 100);

  const rfc0001 = report.rfc_entries.find((entry) => entry.rfc_id === "RFC-0001");
  assert.ok(rfc0001);
  assert.equal(rfc0001.conformance_status, "PASS");
  assert.equal(rfc0001.required_sections.status, "PASS");
  assert.equal(rfc0001.conformance_surfaces.status, "PASS");
  assert.equal(rfc0001.implemented_surfaces.status, "PASS");
  assert.equal(rfc0001.verification_surfaces.status, "PASS");
  assert.deepEqual(rfc0001.linked_conf_ids, ["CONF-0001"]);
  assert.equal(rfc0001.findings.length, 0);

  const conf0001 = report.conf_entries.find(
    (entry) => entry.conf_id === "CONF-0001",
  );
  assert.ok(conf0001);
  assert.equal(conf0001.conformance_status, "PASS");
  assert.equal(conf0001.required_sections.status, "PASS");
  assert.equal(conf0001.proven_specifications.status, "PASS");
  assert.equal(conf0001.test_surfaces.status, "PASS");
  assert.equal(conf0001.evidence_surfaces.status, "PASS");
  assert.equal(conf0001.clause_summary.clause_count, 3);
  assert.equal(conf0001.clause_summary.pass_count, 3);
  assert.equal(conf0001.clauses.length, 3);
  assert.deepEqual(
    conf0001.clauses.map((clause) => clause.clause_id),
    ["CONF-0001-1", "CONF-0001-2", "CONF-0001-3"],
  );
  assert.equal(conf0001.clauses[0]?.status, "PASS");
  assert.match(
    conf0001.clauses[0]?.reason ?? "",
    /Clause result is derived from current CONF surface coverage/,
  );
  assert.deepEqual(conf0001.proves, ["RFC-0001"]);
  assert.equal(conf0001.findings.length, 0);
  assert.deepEqual(conf0001.evidence_surfaces.missing_paths, []);

  const conf0007 = report.conf_entries.find(
    (entry) => entry.conf_id === "CONF-0007",
  );
  assert.ok(conf0007);
  assert.equal(conf0007.conformance_status, "PASS");
  assert.equal(conf0007.clause_summary.clause_count, 4);
  assert.equal(conf0007.clause_summary.pass_count, 4);
  assert.deepEqual(conf0007.evidence_surfaces.missing_paths, []);
  assert.ok(
    conf0007.evidence_surfaces.declared_count >= 2,
  );

  const conf0010 = report.conf_entries.find(
    (entry) => entry.conf_id === "CONF-0010",
  );
  assert.ok(conf0010);
  assert.equal(conf0010.conformance_status, "PASS");
  assert.equal(conf0010.clause_summary.clause_count, 6);
  assert.equal(conf0010.clause_summary.pass_count, 6);
  assert.deepEqual(conf0010.proves, ["RFC-0010"]);
  assert.deepEqual(conf0010.evidence_surfaces.missing_paths, []);
});

test("specification conformance report can be persisted as evidence artifact", () => {
  const tempPath = resolve(
    tmpdir(),
    `specification-conformance-report-${process.pid}.json`,
  );

  const report = persistSpecificationConformanceReport({
    path: tempPath,
  });

  assert.ok(existsSync(tempPath));
  assert.equal(report.report_id, "specification-conformance-report");
  assert.equal(report.summary.rfc_count, 8);
  assert.equal(report.summary.conf_count, 8);
});

test("specification artifact graph projects explicit artifact relationships", () => {
  const graph = materializeSpecificationArtifactGraph();

  assert.equal(graph.graph_id, "enterprise-specification-artifact-graph");
  assert.equal(graph.summary.artifact_count, 50);
  assert.equal(graph.summary.edge_count, 125);

  const rfc0003 = graph.artifacts.find((artifact) => artifact.artifact_id === "RFC-0003");
  assert.ok(rfc0003);
  assert.ok(rfc0003.depends_on.includes("RFC-0001"));
  assert.ok(rfc0003.depends_on.includes("ADR-0012"));
  assert.ok(rfc0003.verified_by.includes("CONF-0003"));
  assert.ok(
    rfc0003.evidence.includes(
      "workspace/foundation/evidence/verification/specification-conformance-report.json",
    ),
  );
  assert.ok(
    rfc0003.evidence.includes(
      "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
    ),
  );

  const spec0101 = graph.artifacts.find(
    (artifact) => artifact.artifact_id === "SPEC-0101",
  );
  assert.ok(spec0101);
  assert.ok(spec0101.depends_on.includes("RFC-0003"));
  assert.ok(spec0101.implemented_by.includes("CONTRACT-evaluation-model"));

  const rfc0007 = graph.artifacts.find((artifact) => artifact.artifact_id === "RFC-0007");
  assert.ok(rfc0007);
  assert.ok(rfc0007.verified_by.includes("CONF-0007"));
  assert.ok(
    rfc0007.implemented_by.includes("CONTRACT-canonical-evidence-artifact"),
  );
  assert.ok(
    rfc0007.evidence.includes(
      "workspace/foundation/evidence/verification/specification-conformance-evidence.json",
    ),
  );

  const rfc0010 = graph.artifacts.find((artifact) => artifact.artifact_id === "RFC-0010");
  assert.ok(rfc0010);
  assert.ok(rfc0010.depends_on.includes("RFC-0004"));
  assert.ok(rfc0010.depends_on.includes("RFC-0005"));
  assert.ok(rfc0010.verified_by.includes("CONF-0010"));
  assert.ok(rfc0010.implemented_by.includes("CONTRACT-ledger-model"));
});

test("specification artifact graph can be persisted as evidence artifact", () => {
  const tempPath = resolve(
    tmpdir(),
    `specification-artifact-graph-${process.pid}.json`,
  );

  const graph = persistSpecificationArtifactGraph({
    path: tempPath,
  });

  assert.ok(existsSync(tempPath));
  assert.equal(graph.graph_id, "enterprise-specification-artifact-graph");
  assert.equal(graph.summary.artifact_count, 50);
});

test("specification vocabulary audit detects implementation-layer definition drift", () => {
  const report = materializeSpecificationVocabularyAuditReport();

  assert.equal(report.report_id, "specification-vocabulary-audit");
  assert.equal(report.summary.term_count, 10);
  assert.equal(report.summary.drift_status, "PASS");
  assert.equal(report.summary.fail_count, 0);
  assert.equal(report.summary.warn_count, 0);
  assert.equal(report.summary.duplicated_definition_count, 0);

  const canonicalIdentity = report.entries.find(
    (entry) => entry.term === "Canonical Identity",
  );
  assert.ok(canonicalIdentity);
  assert.equal(canonicalIdentity.drift_status, "PASS");
  assert.equal(canonicalIdentity.unauthorized_definition_surfaces.length, 0);

  const evidence = report.entries.find((entry) => entry.term === "Evidence");
  assert.ok(evidence);
  assert.equal(evidence.drift_status, "PASS");
  assert.equal(evidence.unauthorized_definition_surfaces.length, 0);
});

test("specification vocabulary audit can be persisted as evidence artifact", () => {
  const tempPath = resolve(
    tmpdir(),
    `specification-vocabulary-audit-${process.pid}.json`,
  );

  const report = persistSpecificationVocabularyAuditReport({
    path: tempPath,
  });

  assert.ok(existsSync(tempPath));
  assert.equal(report.report_id, "specification-vocabulary-audit");
  assert.equal(report.summary.term_count, 10);
});
