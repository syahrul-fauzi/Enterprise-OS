import assert from "node:assert/strict";
import test from "node:test";
import { materializeCapabilityGovernanceProjection } from "../src/capability-governance-runtime.js";

function createRegistryFixture(range: string = ">=1 <2"): any {
  return {
    capabilities: [
      {
        id: "api-platform",
        manifest_ref: "workspace/capabilities/api-platform/definition/capability.yaml",
        manifest_version: "1.0.0",
        version: "1.2.0",
        stability: "stable",
        lifecycle_stage: "active",
        governance_status: "PASS",
        owner_missing: false,
        owner: "architecture",
        owner_requirement_status: "PASS",
        runtime_ref: null,
        planner_ref: null,
        composer_ref: null,
        verification_ref: null,
        declared_exports: ["ApiPlatformService"],
        declared_dependencies: ["governance-read-model"],
        dependency_policy: {
          allowed_dependencies: ["governance-read-model"],
          forbidden_dependencies: [],
        },
        declared_consumers: [],
        consumers: [],
        empirically_verified_products: [],
        product_reach_ratio: 1,
        reachable_from_products: ["lawyershub"],
        reachability_status: "PASS",
        introduced: "1.0.0",
        deprecated: null,
        provided_contract_versions: [],
        required_contract_ranges: [
          {
            name: "GovernanceReadModelProvider",
            range,
          },
        ],
      },
      {
        id: "governance-read-model",
        manifest_ref:
          "workspace/capabilities/governance-read-model/definition/capability.yaml",
        manifest_version: "1.0.0",
        version: "1.0.0",
        stability: "stable",
        lifecycle_stage: "active",
        governance_status: "PASS",
        owner_missing: false,
        owner: "architecture",
        owner_requirement_status: "PASS",
        runtime_ref: null,
        planner_ref: null,
        composer_ref: null,
        verification_ref: null,
        declared_exports: ["GovernanceReadModelProvider"],
        declared_dependencies: [],
        dependency_policy: {
          allowed_dependencies: [],
          forbidden_dependencies: [],
        },
        declared_consumers: ["api-platform"],
        consumers: ["api-platform"],
        empirically_verified_products: [],
        product_reach_ratio: 1,
        reachable_from_products: ["lawyershub"],
        reachability_status: "PASS",
        introduced: "1.0.0",
        deprecated: null,
        provided_contract_versions: [
          {
            name: "GovernanceReadModelProvider",
            version: "1.0.0",
          },
        ],
        required_contract_ranges: [],
      },
    ],
  };
}

function createContractRegistryFixture(input?: {
  readonly providerResolutionStatus?: string;
  readonly rangePolicyStatus?: string;
  readonly status?: string;
  readonly compatibleProviders?: readonly { readonly capability_id: string; readonly version: string }[];
}): any {
  return {
    contracts: [
      {
        contract_name: "GovernanceReadModelProvider",
        consumers: [
          {
            capability_id: "api-platform",
            range: ">=1 <2",
            declared_dependency_ids: ["governance-read-model"],
            compatible_providers: input?.compatibleProviders ?? [
              {
                capability_id: "governance-read-model",
                version: "1.0.0",
              },
            ],
            compatible_provider_count: (input?.compatibleProviders ?? [
              {
                capability_id: "governance-read-model",
                version: "1.0.0",
              },
            ]).length,
            provider_resolution_status:
              input?.providerResolutionStatus ?? "DETERMINISTIC",
            range_policy_status: input?.rangePolicyStatus ?? "PINNED_MAJOR",
            status: input?.status ?? "PASS",
          },
        ],
      },
    ],
  };
}

test("capability governance marks deterministic pinned compatibility as pass", () => {
  const projection = materializeCapabilityGovernanceProjection({
    registry: createRegistryFixture(),
    contractVersionRegistry: createContractRegistryFixture(),
    artifactRootRef: "workspace/foundation/evidence/verification/capability-governance",
  });

  const apiContracts = projection.capabilities.find(
    (capability) => capability.capability_id === "api-platform",
  )?.contracts;
  assert.ok(apiContracts);
  assert.equal(apiContracts.compatibility.compatibility_status, "PASS");
  assert.equal(apiContracts.compatibility.contract_drift_status, "NONE");
  assert.equal(apiContracts.compatibility.migration_required, false);
  assert.equal(projection.verification.summary.compatibility_governance_status, "PASS");
  assert.equal(projection.verification.summary.compatibility_score, 100);
});

test("capability governance marks unbounded range as compatibility drift", () => {
  const projection = materializeCapabilityGovernanceProjection({
    registry: createRegistryFixture("*"),
    contractVersionRegistry: createContractRegistryFixture({
      rangePolicyStatus: "UNBOUNDED",
      status: "PASS",
    }),
    artifactRootRef: "workspace/foundation/evidence/verification/capability-governance",
  });

  const apiContracts = projection.capabilities.find(
    (capability) => capability.capability_id === "api-platform",
  )?.contracts;
  assert.ok(apiContracts);
  assert.equal(apiContracts.compatibility.compatibility_status, "WARN");
  assert.equal(
    apiContracts.compatibility.contract_drift_status,
    "COMPATIBILITY_DRIFT",
  );
  assert.equal(apiContracts.compatibility.migration_required, true);
  assert.equal(projection.verification.summary.compatibility_governance_status, "WARN");
  assert.equal(projection.verification.summary.contract_drift_count, 1);
  assert.equal(projection.verification.summary.migration_required_count, 1);
  assert.equal(projection.verification.summary.compatibility_score, 0);
});

test("capability governance marks unresolved compatibility as migration required", () => {
  const projection = materializeCapabilityGovernanceProjection({
    registry: createRegistryFixture(),
    contractVersionRegistry: createContractRegistryFixture({
      compatibleProviders: [],
      providerResolutionStatus: "UNRESOLVED",
      status: "FAIL",
    }),
    artifactRootRef: "workspace/foundation/evidence/verification/capability-governance",
  });

  const apiContracts = projection.capabilities.find(
    (capability) => capability.capability_id === "api-platform",
  )?.contracts;
  assert.ok(apiContracts);
  assert.equal(apiContracts.compatibility.compatibility_status, "FAIL");
  assert.equal(
    apiContracts.compatibility.contract_drift_status,
    "MIGRATION_REQUIRED",
  );
  assert.equal(apiContracts.compatibility.migration_required, true);
  assert.equal(projection.verification.summary.compatibility_governance_status, "FAIL");
  assert.equal(projection.verification.summary.unresolved_contract_requirement_count, 1);
  assert.equal(projection.verification.summary.contract_drift_count, 1);
  assert.equal(projection.verification.summary.migration_required_count, 1);
});
