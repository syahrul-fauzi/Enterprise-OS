import { mkdirSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import { DigestEngine } from "@repo/core-kernel";
import { materializeCapabilityGraphProjection } from "../src/capability-graph-runtime.js";
import type { CapabilityGovernanceProjection } from "../src/capability-governance-runtime.js";
import { EOS_ROOT } from "../src/state.js";

function createDependencyConstitutionSummaryFixture(input?: {
  readonly boundaryViolations?: number;
  readonly dependencyPolicyViolations?: number;
  readonly apiRuntimeViolations?: number;
  readonly consumerMismatches?: number;
}) {
  return {
    boundary_violations: input?.boundaryViolations ?? 0,
    dependency_policy_violations: input?.dependencyPolicyViolations ?? 0,
    api_runtime_violations: input?.apiRuntimeViolations ?? 0,
    consumer_mismatches: input?.consumerMismatches ?? 0,
  };
}

function createCapabilityGovernanceProjection(): CapabilityGovernanceProjection {
  return {
    index: {
      projection_version: "1.0.0",
      projection_digest: "digest-capability-governance-index",
      summary: {
        capability_count: 3,
        capabilities_with_manifest_ref: 3,
        capabilities_with_dependency_surface: 3,
        capabilities_with_contract_surface: 3,
        overall_status: "PASS",
      },
      capabilities: [
        {
          capability_id: "api-platform",
          manifest_ref: "workspace/capabilities/api-platform/definition/capability.yaml",
          governance_status: "PASS",
          artifact_directory: "workspace/foundation/evidence/verification/capability-governance/api-platform",
          manifest_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-manifest.yaml",
          manifest_projection_json_ref:
            "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-manifest.json",
          dependencies_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-dependencies.json",
          version_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-version.json",
          contracts_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-contracts.json",
        },
        {
          capability_id: "governance-read-model",
          manifest_ref:
            "workspace/capabilities/governance-read-model/definition/capability.yaml",
          governance_status: "PASS",
          artifact_directory:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model",
          manifest_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model/capability-manifest.yaml",
          manifest_projection_json_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model/capability-manifest.json",
          dependencies_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model/capability-dependencies.json",
          version_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model/capability-version.json",
          contracts_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-read-model/capability-contracts.json",
        },
        {
          capability_id: "governance-evidence",
          manifest_ref:
            "workspace/capabilities/governance-evidence/definition/capability.yaml",
          governance_status: "PASS",
          artifact_directory:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence",
          manifest_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence/capability-manifest.yaml",
          manifest_projection_json_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence/capability-manifest.json",
          dependencies_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence/capability-dependencies.json",
          version_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence/capability-version.json",
          contracts_projection_ref:
            "workspace/foundation/evidence/verification/capability-governance/governance-evidence/capability-contracts.json",
        },
      ],
      claim_boundary: "Capability governance index fixture.",
    },
    verification: {
      report_version: "1.0.0",
      report_digest: "digest-capability-governance-verification",
      summary: {
        manifest_projection_status: "PASS",
        dependency_projection_status: "PASS",
        dependency_class_policy_status: "PASS",
        contract_projection_status: "PASS",
        compatibility_governance_status: "PASS",
        compatibility_score: 100,
        system_dependency_count: 1,
        unknown_dependency_class_count: 0,
        unresolved_dependency_count: 0,
        unresolved_contract_requirement_count: 0,
        contract_drift_count: 0,
        migration_required_count: 0,
        overall_status: "PASS",
      },
      capability_count: 3,
      claim_boundary: "Capability governance verification fixture.",
    },
    capabilities: [
      {
        capability_id: "api-platform",
        directory_name: "api-platform",
        manifest_file:
          "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-manifest.yaml",
        manifest_json_file:
          "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-manifest.json",
        dependencies_file:
          "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-dependencies.json",
        version_file:
          "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-version.json",
        contracts_file:
          "workspace/foundation/evidence/verification/capability-governance/api-platform/capability-contracts.json",
        manifest: {
          capability_id: "api-platform",
          manifest_ref:
            "workspace/capabilities/api-platform/definition/capability.yaml",
          manifest_version: "1.0.0",
          capability_version: "1.2.0",
          stability: "stable",
          lifecycle_stage: "active",
          governance_status: "PASS",
          owner: "architecture",
          owner_requirement_status: "PASS",
          runtime_ref: null,
          planner_ref: null,
          composer_ref: null,
          verification_ref:
            "workspace/.tmp/capability-graph-governance-fixture/api-platform/verification.json",
          declared_exports: ["ApiPlatformService"],
          artifact_boundary: "fixture",
        },
        dependencies: {
          capability_id: "api-platform",
          declared_dependencies: [
            {
              capability_id: "governance-read-model",
              version: "1.0.0",
              manifest_ref:
                "workspace/capabilities/governance-read-model/definition/capability.yaml",
              governance_status: "PASS",
              stability: "stable",
              lifecycle_stage: "active",
            },
          ],
          system_dependencies: [
            {
              dependency_id: "core-runtime",
              dependency_kind: "system_runtime",
              rationale: "fixture",
            },
          ],
          dependency_classification: {
            policy_version: "1.0.0",
            entries: [
              {
                dependency_id: "governance-read-model",
                dependency_class: "bounded_context_capability",
                resolution_status: "RESOLVED_CAPABILITY",
                rationale: "fixture",
              },
              {
                dependency_id: "core-runtime",
                dependency_class: "system_runtime",
                resolution_status: "SYSTEM_DEPENDENCY",
                rationale: "fixture",
              },
            ],
          },
          unresolved_dependencies: [],
          dependency_policy: {
            allowed_dependencies: ["governance-read-model", "core-runtime"],
            forbidden_dependencies: [],
          },
          declared_consumers: [],
          consumers: [],
          empirically_verified_products: [],
          product_reach_ratio: 1,
          reachable_from_products: ["lawyershub"],
          reachability_status: "PASS",
          artifact_boundary: "fixture",
        },
        version: {
          capability_id: "api-platform",
          manifest_version: "1.0.0",
          capability_version: "1.2.0",
          stability: "stable",
          lifecycle_stage: "active",
          introduced: "1.0.0",
          deprecated: null,
          artifact_boundary: "fixture",
        },
        contracts: {
          capability_id: "api-platform",
          provided_contract_versions: [],
          required_contract_ranges: [],
          compatibility: {
            total_required_contract_count: 0,
            compatible_required_contract_count: 0,
            unresolved_required_contract_count: 0,
            ambiguous_required_contract_count: 0,
            unbounded_required_contract_count: 0,
            compatibility_status: "PASS",
            contract_drift_status: "NONE",
            migration_required: false,
          },
          artifact_boundary: "fixture",
        },
      },
      {
        capability_id: "governance-read-model",
        directory_name: "governance-read-model",
        manifest_file: "manifest.yaml",
        manifest_json_file: "manifest.json",
        dependencies_file: "dependencies.json",
        version_file: "version.json",
        contracts_file: "contracts.json",
        manifest: {
          capability_id: "governance-read-model",
          manifest_ref:
            "workspace/capabilities/governance-read-model/definition/capability.yaml",
          manifest_version: "1.0.0",
          capability_version: "1.1.0",
          stability: "stable",
          lifecycle_stage: "active",
          governance_status: "PASS",
          owner: "architecture",
          owner_requirement_status: "PASS",
          runtime_ref: null,
          planner_ref: null,
          composer_ref: null,
          verification_ref:
            "workspace/.tmp/capability-graph-governance-fixture/governance-read-model/verification.json",
          declared_exports: ["GovernanceReadModelService"],
          artifact_boundary: "fixture",
        },
        dependencies: {
          capability_id: "governance-read-model",
          declared_dependencies: [
            {
              capability_id: "governance-evidence",
              version: "1.0.0",
              manifest_ref:
                "workspace/capabilities/governance-evidence/definition/capability.yaml",
              governance_status: "PASS",
              stability: "stable",
              lifecycle_stage: "active",
            },
          ],
          system_dependencies: [],
          dependency_classification: {
            policy_version: "1.0.0",
            entries: [
              {
                dependency_id: "governance-evidence",
                dependency_class: "bounded_context_capability",
                resolution_status: "RESOLVED_CAPABILITY",
                rationale: "fixture",
              },
            ],
          },
          unresolved_dependencies: [],
          dependency_policy: {
            allowed_dependencies: ["governance-evidence"],
            forbidden_dependencies: [],
          },
          declared_consumers: ["api-platform"],
          consumers: ["api-platform"],
          empirically_verified_products: [],
          product_reach_ratio: 1,
          reachable_from_products: ["lawyershub"],
          reachability_status: "PASS",
          artifact_boundary: "fixture",
        },
        version: {
          capability_id: "governance-read-model",
          manifest_version: "1.0.0",
          capability_version: "1.1.0",
          stability: "stable",
          lifecycle_stage: "active",
          introduced: "1.0.0",
          deprecated: null,
          artifact_boundary: "fixture",
        },
        contracts: {
          capability_id: "governance-read-model",
          provided_contract_versions: [],
          required_contract_ranges: [],
          compatibility: {
            total_required_contract_count: 0,
            compatible_required_contract_count: 0,
            unresolved_required_contract_count: 0,
            ambiguous_required_contract_count: 0,
            unbounded_required_contract_count: 0,
            compatibility_status: "PASS",
            contract_drift_status: "NONE",
            migration_required: false,
          },
          artifact_boundary: "fixture",
        },
      },
      {
        capability_id: "governance-evidence",
        directory_name: "governance-evidence",
        manifest_file: "manifest.yaml",
        manifest_json_file: "manifest.json",
        dependencies_file: "dependencies.json",
        version_file: "version.json",
        contracts_file: "contracts.json",
        manifest: {
          capability_id: "governance-evidence",
          manifest_ref:
            "workspace/capabilities/governance-evidence/definition/capability.yaml",
          manifest_version: "1.0.0",
          capability_version: "1.0.0",
          stability: "stable",
          lifecycle_stage: "active",
          governance_status: "PASS",
          owner: "architecture",
          owner_requirement_status: "PASS",
          runtime_ref: null,
          planner_ref: null,
          composer_ref: null,
          verification_ref:
            "workspace/.tmp/capability-graph-governance-fixture/governance-evidence/verification.json",
          declared_exports: ["GovernanceEvidenceService"],
          artifact_boundary: "fixture",
        },
        dependencies: {
          capability_id: "governance-evidence",
          declared_dependencies: [],
          system_dependencies: [],
          dependency_classification: {
            policy_version: "1.0.0",
            entries: [],
          },
          unresolved_dependencies: [],
          dependency_policy: {
            allowed_dependencies: [],
            forbidden_dependencies: [],
          },
          declared_consumers: ["governance-read-model"],
          consumers: ["governance-read-model"],
          empirically_verified_products: [],
          product_reach_ratio: 1,
          reachable_from_products: ["lawyershub"],
          reachability_status: "PASS",
          artifact_boundary: "fixture",
        },
        version: {
          capability_id: "governance-evidence",
          manifest_version: "1.0.0",
          capability_version: "1.0.0",
          stability: "stable",
          lifecycle_stage: "active",
          introduced: "1.0.0",
          deprecated: null,
          artifact_boundary: "fixture",
        },
        contracts: {
          capability_id: "governance-evidence",
          provided_contract_versions: [],
          required_contract_ranges: [],
          compatibility: {
            total_required_contract_count: 0,
            compatible_required_contract_count: 0,
            unresolved_required_contract_count: 0,
            ambiguous_required_contract_count: 0,
            unbounded_required_contract_count: 0,
            compatibility_status: "PASS",
            contract_drift_status: "NONE",
            migration_required: false,
          },
          artifact_boundary: "fixture",
        },
      },
    ],
  };
}

function createCanonicalEvidenceFixture(input: {
  readonly artifactType?: string;
  readonly generatedAtUtc?: string;
  readonly subjectRef: string;
  readonly subjectType?: string;
  readonly subjectDigest?: string | null;
  readonly projectionRef?: string | null;
  readonly projectionId?: string;
  readonly projectionType?: string;
  readonly projectionDigest?: string;
  readonly summary?: Record<string, unknown>;
  readonly findings?: readonly string[];
  readonly evidence?: Record<string, unknown>;
  readonly claimBoundary?: string;
  readonly tampered?: boolean;
}) {
  const artifact = {
    artifact_id: "capability-evidence:fixture",
    artifact_type: input.artifactType ?? "capability-verification-evidence",
    schema_version: "1.0.0" as const,
    generated_at_utc: input.generatedAtUtc ?? "2026-08-03T10:00:00.000Z",
    subject: {
      subject_ref: input.subjectRef,
      subject_type: input.subjectType ?? "capability_manifest",
      subject_digest: input.subjectDigest ?? null,
    },
    projection: {
      projection_ref: input.projectionRef ?? null,
      projection_id: input.projectionId ?? "projection:fixture",
      projection_type: input.projectionType ?? "CapabilityVerificationProjection",
      projection_digest: input.projectionDigest ?? "projection-digest-fixture",
    },
    summary: input.summary ?? {
      status: "PASS",
    },
    findings: input.findings ?? [],
    evidence: input.evidence ?? {
      verification: "fixture",
    },
    digest: "",
    signature: {
      status: "UNSIGNED",
      key_id: null,
      value: null,
      reason: "Signing is not materialized in fixture.",
    },
    claim_boundary:
      input.claimBoundary ??
      "Fixture evidence claims only capability verification traceability.",
  };

  const digest = DigestEngine.digest({
    artifact_type: artifact.artifact_type,
    schema_version: artifact.schema_version,
    generated_at_utc: artifact.generated_at_utc,
    subject: artifact.subject,
    projection: artifact.projection,
    summary: artifact.summary,
    findings: artifact.findings,
    evidence: artifact.evidence,
    claim_boundary: artifact.claim_boundary,
  });

  return {
    ...artifact,
    digest: input.tampered ? "tampered-digest" : digest,
  };
}

test("capability graph projection stays healthy for a clean dependency chain", () => {
  const projection = materializeCapabilityGraphProjection({
    capabilityGovernance: createCapabilityGovernanceProjection(),
    dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
  });

  assert.equal(projection.graph.summary.capability_count, 3);
  assert.equal(projection.graph.summary.circular_dependency_count, 0);
  assert.equal(projection.graph.summary.forbidden_dependency_count, 0);
  assert.equal(projection.graph.summary.unknown_dependency_count, 0);
  assert.equal(projection.graph.summary.health_status, "PASS");
  assert.equal(projection.graph.summary.governance_health_status, "PASS");
  assert.equal(
    projection.graph.health_domains.structural_health.status,
    "PASS",
  );
  assert.equal(
    projection.graph.health_domains.structural_health.orphan_capability_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.architectural_health.status,
    "PASS",
  );
  assert.equal(
    projection.graph.health_domains.governance_health.status,
    "PASS",
  );
  assert.equal(
    projection.graph.health_domains.evolution_health.status,
    "PASS",
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.status,
    "PASS",
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.capability_without_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.stale_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.unverifiable_capability_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.orphaned_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.inconsistent_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.unsigned_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.tampered_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.partial_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.superseded_evidence_count,
    0,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.expired_evidence_count,
    0,
  );
  assert.equal(projection.graph.summary.pass_capability_count, 3);
  assert.equal(projection.graph.summary.warn_capability_count, 0);
  assert.equal(projection.graph.summary.fail_capability_count, 0);
  assert.deepEqual(
    projection.graph.capability_health.map((capability) => ({
      capability_id: capability.capability_id,
      health_status: capability.health_status,
    })),
    [
      { capability_id: "api-platform", health_status: "PASS" },
      { capability_id: "governance-evidence", health_status: "PASS" },
      { capability_id: "governance-read-model", health_status: "PASS" },
    ],
  );
  assert.equal(projection.verification.summary.health_status, "PASS");
  assert.equal(projection.verification.summary.governance_health_status, "PASS");
});

test("capability graph verification detects cycle and forbidden dependency drift", () => {
  const governance = createCapabilityGovernanceProjection();
  const apiPlatform = governance.capabilities[0];
  const readModel = governance.capabilities[1];

  readModel.dependencies.dependency_classification.entries.push({
    dependency_id: "api-platform",
    dependency_class: "bounded_context_capability",
    resolution_status: "RESOLVED_CAPABILITY",
    rationale: "fixture cycle",
  });
  readModel.dependencies.declared_dependencies.push({
    capability_id: "api-platform",
    version: "1.2.0",
    manifest_ref: "workspace/capabilities/api-platform/definition/capability.yaml",
    governance_status: "PASS",
    stability: "stable",
    lifecycle_stage: "active",
  });
  readModel.dependencies.dependency_policy.forbidden_dependencies.push(
    "api-platform",
  );
  apiPlatform.dependencies.dependency_classification.entries.push({
    dependency_id: "shadow-runtime",
    dependency_class: "unknown_external",
    resolution_status: "UNRESOLVED",
    rationale: "fixture unknown dependency",
  });

  const projection = materializeCapabilityGraphProjection({
    capabilityGovernance: governance,
    dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
  });

  assert.equal(projection.graph.summary.circular_dependency_count, 1);
  assert.equal(projection.graph.summary.forbidden_dependency_count, 1);
  assert.equal(projection.graph.summary.unknown_dependency_count, 1);
  assert.equal(projection.verification.summary.cycle_status, "FAIL");
  assert.equal(
    projection.verification.summary.forbidden_dependency_status,
    "FAIL",
  );
  assert.equal(projection.verification.summary.unknown_dependency_status, "FAIL");
  assert.equal(projection.verification.summary.health_status, "FAIL");
  assert.equal(projection.verification.summary.governance_health_status, "FAIL");
  assert.equal(
    projection.verification.health_domains.structural_health.status,
    "FAIL",
  );
  assert.equal(
    projection.verification.health_domains.architectural_health.status,
    "FAIL",
  );
  const apiPlatformHealth = projection.graph.capability_health.find(
    (capability) => capability.capability_id === "api-platform",
  );
  const readModelHealth = projection.graph.capability_health.find(
    (capability) => capability.capability_id === "governance-read-model",
  );
  assert.ok(apiPlatformHealth);
  assert.ok(readModelHealth);
  assert.equal(apiPlatformHealth.health_status, "FAIL");
  assert.equal(readModelHealth.health_status, "FAIL");
});

test("capability graph surfaces unstable coupling as warning health", () => {
  const governance = createCapabilityGovernanceProjection();
  const evidenceCapability = governance.capabilities[2];

  evidenceCapability.version.stability = "experimental";
  evidenceCapability.version.lifecycle_stage = "planned";

  const projection = materializeCapabilityGraphProjection({
    capabilityGovernance: governance,
    dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
  });

  assert.equal(projection.graph.summary.health_status, "PASS");
  assert.equal(projection.graph.summary.unstable_dependency_count, 1);
  assert.equal(projection.graph.summary.governance_health_status, "WARN");
  assert.equal(
    projection.graph.health_domains.structural_health.status,
    "WARN",
  );
  assert.equal(
    projection.graph.health_domains.architectural_health.status,
    "PASS",
  );
  assert.equal(projection.graph.summary.pass_capability_count, 2);
  assert.equal(projection.graph.summary.warn_capability_count, 1);
  assert.equal(projection.graph.summary.fail_capability_count, 0);
  assert.equal(projection.verification.summary.unstable_dependency_status, "FAIL");
  assert.equal(projection.verification.summary.health_status, "PASS");
  assert.equal(projection.verification.summary.governance_health_status, "WARN");
  assert.equal(
    projection.verification.health_domains.structural_health.status,
    "WARN",
  );
  const readModelHealth = projection.graph.capability_health.find(
    (capability) => capability.capability_id === "governance-read-model",
  );
  assert.ok(readModelHealth);
  assert.equal(readModelHealth.health_status, "WARN");
  assert.equal(readModelHealth.unstable_dependency_count, 1);
});

test("capability graph classifies orphan and missing verification evidence as health warnings", () => {
  const governance = createCapabilityGovernanceProjection();
  const readModel = governance.capabilities[1];
  const evidenceCapability = governance.capabilities[2];

  readModel.dependencies.reachability_status = "UNREACHABLE";
  readModel.dependencies.reachable_from_products = [];
  readModel.dependencies.product_reach_ratio = 0;
  readModel.manifest.verification_ref = null;
  evidenceCapability.manifest.verification_ref = null;

  const projection = materializeCapabilityGraphProjection({
    capabilityGovernance: governance,
    dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
  });

  assert.equal(projection.graph.summary.health_status, "PASS");
  assert.equal(projection.graph.summary.governance_health_status, "WARN");
  assert.equal(
    projection.graph.health_domains.structural_health.status,
    "WARN",
  );
  assert.equal(
    projection.graph.health_domains.structural_health.orphan_capability_count,
    1,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.status,
    "WARN",
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.capability_without_evidence_count,
    2,
  );
  assert.equal(
    projection.graph.health_domains.evidence_health.unverifiable_capability_count,
    1,
  );
});

test("capability graph classifies constitutional architecture violations into architectural health", () => {
  const projection = materializeCapabilityGraphProjection({
    capabilityGovernance: createCapabilityGovernanceProjection(),
    dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture({
      boundaryViolations: 2,
      dependencyPolicyViolations: 1,
      apiRuntimeViolations: 1,
      consumerMismatches: 1,
    }),
  });

  assert.equal(
    projection.graph.health_domains.architectural_health.status,
    "FAIL",
  );
  assert.equal(
    projection.graph.health_domains.architectural_health.layering_violation_count,
    3,
  );
  assert.equal(
    projection.graph.health_domains.architectural_health.abstraction_leak_count,
    2,
  );
  assert.equal(projection.graph.summary.governance_health_status, "FAIL");
});

test("capability graph classifies stale verification evidence as evidence health warning", () => {
  const staleDir = resolve(
    EOS_ROOT,
    "workspace/.tmp/capability-graph-governance-stale-evidence",
  );
  const manifestRef =
    "workspace/.tmp/capability-graph-governance-stale-evidence/manifest.yaml";
  const verificationRef =
    "workspace/.tmp/capability-graph-governance-stale-evidence/verification.json";

  rmSync(staleDir, { force: true, recursive: true });
  mkdirSync(staleDir, { recursive: true });
  writeFileSync(resolve(EOS_ROOT, manifestRef), "manifest");
  writeFileSync(resolve(EOS_ROOT, verificationRef), "verification");
  utimesSync(
    resolve(EOS_ROOT, verificationRef),
    new Date("2026-01-01T00:00:00.000Z"),
    new Date("2026-01-01T00:00:00.000Z"),
  );
  utimesSync(
    resolve(EOS_ROOT, manifestRef),
    new Date("2026-02-01T00:00:00.000Z"),
    new Date("2026-02-01T00:00:00.000Z"),
  );

  const governance = createCapabilityGovernanceProjection();
  governance.capabilities[0].manifest.manifest_ref = manifestRef;
  governance.capabilities[0].manifest.verification_ref = verificationRef;

  try {
    const projection = materializeCapabilityGraphProjection({
      capabilityGovernance: governance,
      dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
    });

    assert.equal(
      projection.graph.health_domains.evidence_health.status,
      "WARN",
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.stale_evidence_count,
      1,
    );
  } finally {
    rmSync(staleDir, { force: true, recursive: true });
  }
});

test("capability graph classifies canonical evidence quality issues into evidence health v2", () => {
  const evidenceDir = resolve(
    EOS_ROOT,
    "workspace/.tmp/capability-graph-governance-evidence-health-v2",
  );
  rmSync(evidenceDir, { force: true, recursive: true });
  mkdirSync(evidenceDir, { recursive: true });

  const governance = createCapabilityGovernanceProjection();
  const apiPlatform = governance.capabilities[0];
  const readModel = governance.capabilities[1];
  const evidenceCapability = governance.capabilities[2];

  const apiManifestRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/api-platform-manifest.yaml";
  const readModelManifestRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/governance-read-model-manifest.yaml";
  const evidenceManifestRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/governance-evidence-manifest.yaml";

  apiPlatform.manifest.manifest_ref = apiManifestRef;
  readModel.manifest.manifest_ref = readModelManifestRef;
  evidenceCapability.manifest.manifest_ref = evidenceManifestRef;

  writeFileSync(resolve(EOS_ROOT, apiManifestRef), "api-platform-manifest");
  writeFileSync(
    resolve(EOS_ROOT, readModelManifestRef),
    "governance-read-model-manifest",
  );
  writeFileSync(
    resolve(EOS_ROOT, evidenceManifestRef),
    "governance-evidence-manifest",
  );

  const canonicalEvidenceRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/api-platform-evidence.json";
  const partialEvidenceRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/governance-read-model-evidence.json";
  const tamperedEvidenceRef =
    "workspace/.tmp/capability-graph-governance-evidence-health-v2/governance-evidence.json";

  apiPlatform.manifest.verification_ref = canonicalEvidenceRef;
  readModel.manifest.verification_ref = partialEvidenceRef;
  evidenceCapability.manifest.verification_ref = tamperedEvidenceRef;

  writeFileSync(
    resolve(EOS_ROOT, canonicalEvidenceRef),
    `${JSON.stringify(
      createCanonicalEvidenceFixture({
        subjectRef: "workspace/capabilities/other-capability/definition/capability.yaml",
        subjectDigest: "digest-mismatch",
      }),
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    resolve(EOS_ROOT, partialEvidenceRef),
    `${JSON.stringify({ artifact_type: "broken-evidence" }, null, 2)}\n`,
  );
  writeFileSync(
    resolve(EOS_ROOT, tamperedEvidenceRef),
    `${JSON.stringify(
      createCanonicalEvidenceFixture({
        subjectRef: evidenceManifestRef,
        subjectDigest: null,
        tampered: true,
      }),
      null,
      2,
    )}\n`,
  );

  try {
    const projection = materializeCapabilityGraphProjection({
      capabilityGovernance: governance,
      dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
    });

    assert.equal(
      projection.graph.health_domains.evidence_health.status,
      "WARN",
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.orphaned_evidence_count,
      1,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.inconsistent_evidence_count,
      1,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.unsigned_evidence_count,
      2,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.tampered_evidence_count,
      1,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.partial_evidence_count,
      1,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.superseded_evidence_count,
      0,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.expired_evidence_count,
      0,
    );
  } finally {
    rmSync(evidenceDir, { force: true, recursive: true });
  }
});

test("capability graph classifies superseded canonical evidence when a newer claim record exists", () => {
  const evidenceDir = resolve(
    EOS_ROOT,
    "workspace/.tmp/capability-graph-governance-superseded-evidence",
  );
  rmSync(evidenceDir, { force: true, recursive: true });
  mkdirSync(evidenceDir, { recursive: true });

  const governance = createCapabilityGovernanceProjection();
  const apiPlatform = governance.capabilities[0];
  const apiManifestRef =
    "workspace/.tmp/capability-graph-governance-superseded-evidence/api-platform-manifest.yaml";
  const artifactDirectoryRef =
    "workspace/.tmp/capability-graph-governance-superseded-evidence";
  const olderEvidenceRef =
    "workspace/.tmp/capability-graph-governance-superseded-evidence/api-platform-evidence-old.json";
  const newerEvidenceRef =
    "workspace/.tmp/capability-graph-governance-superseded-evidence/api-platform-evidence-new.json";

  apiPlatform.manifest.manifest_ref = apiManifestRef;
  apiPlatform.manifest.verification_ref = olderEvidenceRef;
  governance.index.capabilities[0].artifact_directory = artifactDirectoryRef;

  writeFileSync(resolve(EOS_ROOT, apiManifestRef), "api-platform-manifest");
  const manifestDigest = DigestEngine.digest("api-platform-manifest");
  writeFileSync(
    resolve(EOS_ROOT, olderEvidenceRef),
    `${JSON.stringify(
      createCanonicalEvidenceFixture({
        generatedAtUtc: "2026-08-03T10:00:00.000Z",
        subjectRef: apiManifestRef,
        subjectDigest: manifestDigest,
      }),
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    resolve(EOS_ROOT, newerEvidenceRef),
    `${JSON.stringify(
      createCanonicalEvidenceFixture({
        generatedAtUtc: "2026-08-03T11:00:00.000Z",
        subjectRef: apiManifestRef,
        subjectDigest: manifestDigest,
        summary: { status: "PASS", freshness: "newer" },
      }),
      null,
      2,
    )}\n`,
  );

  try {
    const projection = materializeCapabilityGraphProjection({
      capabilityGovernance: governance,
      dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
    });

    assert.equal(
      projection.graph.health_domains.evidence_health.status,
      "WARN",
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.superseded_evidence_count,
      1,
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.expired_evidence_count,
      0,
    );
  } finally {
    rmSync(evidenceDir, { force: true, recursive: true });
  }
});

test("capability graph classifies canonical evidence as expired when validity window is exceeded", () => {
  const evidenceDir = resolve(
    EOS_ROOT,
    "workspace/.tmp/capability-graph-governance-expired-evidence",
  );
  rmSync(evidenceDir, { force: true, recursive: true });
  mkdirSync(evidenceDir, { recursive: true });

  const governance = createCapabilityGovernanceProjection();
  const apiPlatform = governance.capabilities[0];
  const artifactDirectoryRef =
    "workspace/.tmp/capability-graph-governance-expired-evidence";
  const apiManifestRef =
    "workspace/.tmp/capability-graph-governance-expired-evidence/api-platform-manifest.yaml";
  const verificationRef =
    "workspace/.tmp/capability-graph-governance-expired-evidence/api-platform-evidence.json";

  apiPlatform.manifest.manifest_ref = apiManifestRef;
  apiPlatform.manifest.verification_ref = verificationRef;
  governance.index.capabilities[0].artifact_directory = artifactDirectoryRef;

  writeFileSync(resolve(EOS_ROOT, apiManifestRef), "api-platform-manifest");
  const manifestDigest = DigestEngine.digest("api-platform-manifest");
  writeFileSync(
    resolve(EOS_ROOT, verificationRef),
    `${JSON.stringify(
      createCanonicalEvidenceFixture({
        artifactType: "capability-verification-evidence",
        generatedAtUtc: "2026-07-20T00:00:00.000Z",
        subjectRef: apiManifestRef,
        subjectDigest: manifestDigest,
      }),
      null,
      2,
    )}\n`,
  );

  try {
    const projection = materializeCapabilityGraphProjection({
      capabilityGovernance: governance,
      dependencyConstitutionSummary: createDependencyConstitutionSummaryFixture(),
      nowUtc: "2026-08-03T12:00:00.000Z",
    });

    assert.equal(
      projection.graph.health_domains.evidence_health.status,
      "WARN",
    );
    assert.equal(
      projection.graph.health_domains.evidence_health.expired_evidence_count,
      1,
    );
  } finally {
    rmSync(evidenceDir, { force: true, recursive: true });
  }
});
