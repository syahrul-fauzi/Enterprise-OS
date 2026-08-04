import { DigestEngine } from "@repo/core-kernel";
import type {
  CapabilityRegistryReport,
  ContractVersionRegistryReport,
} from "@repo/core-capability-registry";

type CapabilityGovernanceManifestArtifact = {
  readonly capability_id: string;
  readonly manifest_ref: string;
  readonly manifest_version: string;
  readonly capability_version: string;
  readonly stability: string;
  readonly lifecycle_stage: string;
  readonly governance_status: string;
  readonly owner: string | null;
  readonly owner_requirement_status: string;
  readonly runtime_ref: string | null;
  readonly planner_ref: string | null;
  readonly composer_ref: string | null;
  readonly verification_ref: string | null;
  readonly declared_exports: readonly string[];
  readonly artifact_boundary: string;
};

type CapabilityGovernanceDependenciesArtifact = {
  readonly capability_id: string;
  readonly declared_dependencies: readonly {
    readonly capability_id: string;
    readonly version: string;
    readonly manifest_ref: string;
    readonly governance_status: string;
    readonly stability: string;
    readonly lifecycle_stage: string;
  }[];
  readonly system_dependencies: readonly {
    readonly dependency_id: string;
    readonly dependency_kind: "system_runtime";
    readonly rationale: string;
  }[];
  readonly dependency_classification: {
    readonly policy_version: "1.0.0";
    readonly entries: readonly {
      readonly dependency_id: string;
      readonly dependency_class:
        | "bounded_context_capability"
        | "system_runtime"
        | "unknown_external";
      readonly resolution_status:
        | "RESOLVED_CAPABILITY"
        | "SYSTEM_DEPENDENCY"
        | "UNRESOLVED";
      readonly rationale: string;
    }[];
  };
  readonly unresolved_dependencies: readonly string[];
  readonly dependency_policy: {
    readonly allowed_dependencies: readonly string[];
    readonly forbidden_dependencies: readonly string[];
  };
  readonly declared_consumers: readonly string[];
  readonly consumers: readonly string[];
  readonly empirically_verified_products: readonly string[];
  readonly product_reach_ratio: number;
  readonly reachable_from_products: readonly string[];
  readonly reachability_status: string;
  readonly artifact_boundary: string;
};

type CapabilityGovernanceVersionArtifact = {
  readonly capability_id: string;
  readonly manifest_version: string;
  readonly capability_version: string;
  readonly stability: string;
  readonly lifecycle_stage: string;
  readonly introduced: string | null;
  readonly deprecated: string | null;
  readonly artifact_boundary: string;
};

type CapabilityGovernanceContractsArtifact = {
  readonly capability_id: string;
  readonly provided_contract_versions: readonly {
    readonly contract_name: string;
    readonly version: string;
  }[];
  readonly required_contract_ranges: readonly {
    readonly contract_name: string;
    readonly range: string;
    readonly compatible_providers: readonly {
      readonly capability_id: string;
      readonly version: string;
    }[];
    readonly provider_resolution_status: string;
    readonly range_policy_status: string;
    readonly status: string;
  }[];
  readonly compatibility: {
    readonly total_required_contract_count: number;
    readonly compatible_required_contract_count: number;
    readonly unresolved_required_contract_count: number;
    readonly ambiguous_required_contract_count: number;
    readonly unbounded_required_contract_count: number;
    readonly compatibility_status: "PASS" | "WARN" | "FAIL";
    readonly contract_drift_status:
      | "NONE"
      | "COMPATIBILITY_DRIFT"
      | "MIGRATION_REQUIRED";
    readonly migration_required: boolean;
  };
  readonly artifact_boundary: string;
};

type CapabilityGovernanceCapabilityArtifactSet = {
  readonly capability_id: string;
  readonly directory_name: string;
  readonly manifest_file: string;
  readonly manifest_json_file: string;
  readonly dependencies_file: string;
  readonly version_file: string;
  readonly contracts_file: string;
  readonly manifest: CapabilityGovernanceManifestArtifact;
  readonly dependencies: CapabilityGovernanceDependenciesArtifact;
  readonly version: CapabilityGovernanceVersionArtifact;
  readonly contracts: CapabilityGovernanceContractsArtifact;
};

export type CapabilityGovernanceIndex = {
  readonly projection_version: "1.0.0";
  readonly projection_digest: string;
  readonly summary: {
    readonly capability_count: number;
    readonly capabilities_with_manifest_ref: number;
    readonly capabilities_with_dependency_surface: number;
    readonly capabilities_with_contract_surface: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly capabilities: readonly {
    readonly capability_id: string;
    readonly manifest_ref: string;
    readonly governance_status: string;
    readonly artifact_directory: string;
    readonly manifest_projection_ref: string;
    readonly manifest_projection_json_ref: string;
    readonly dependencies_projection_ref: string;
    readonly version_projection_ref: string;
    readonly contracts_projection_ref: string;
  }[];
  readonly claim_boundary: string;
};

export type CapabilityGovernanceVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly manifest_projection_status: "PASS" | "FAIL";
    readonly dependency_projection_status: "PASS" | "FAIL";
    readonly dependency_class_policy_status: "PASS" | "FAIL";
    readonly contract_projection_status: "PASS" | "FAIL";
    readonly compatibility_governance_status: "PASS" | "WARN" | "FAIL";
    readonly compatibility_score: number;
    readonly system_dependency_count: number;
    readonly unknown_dependency_class_count: number;
    readonly unresolved_dependency_count: number;
    readonly unresolved_contract_requirement_count: number;
    readonly contract_drift_count: number;
    readonly migration_required_count: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly capability_count: number;
  readonly claim_boundary: string;
};

export type CapabilityGovernanceProjection = {
  readonly index: CapabilityGovernanceIndex;
  readonly verification: CapabilityGovernanceVerificationReport;
  readonly capabilities: readonly CapabilityGovernanceCapabilityArtifactSet[];
};

function sanitizeCapabilityId(capabilityId: string): string {
  return capabilityId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

export function materializeCapabilityGovernanceProjection(input: {
  readonly registry: CapabilityRegistryReport;
  readonly contractVersionRegistry: ContractVersionRegistryReport;
  readonly artifactRootRef: string;
}): CapabilityGovernanceProjection {
  const KNOWN_SYSTEM_DEPENDENCIES = new Map<string, string>([
    [
      "core-runtime",
      "Shared runtime instrumentation is treated as infrastructure/system dependency rather than bounded-context capability dependency.",
    ],
  ]);
  const capabilitiesById = new Map(
    input.registry.capabilities.map((capability) => [capability.id, capability]),
  );
  const contractRegistryByConsumer = new Map<
    string,
    Map<string, (typeof input.contractVersionRegistry.contracts)[number]["consumers"][number]>
  >();

  for (const contract of input.contractVersionRegistry.contracts) {
    for (const consumer of contract.consumers) {
      const byContract =
        contractRegistryByConsumer.get(consumer.capability_id) ?? new Map();
      byContract.set(contract.contract_name, consumer);
      contractRegistryByConsumer.set(consumer.capability_id, byContract);
    }
  }

  const capabilities = input.registry.capabilities
    .map((capability) => {
      const directoryName = sanitizeCapabilityId(capability.id);
      const manifestFile = `${input.artifactRootRef}/${directoryName}/capability-manifest.yaml`;
      const manifestJsonFile = `${input.artifactRootRef}/${directoryName}/capability-manifest.json`;
      const dependenciesFile = `${input.artifactRootRef}/${directoryName}/capability-dependencies.json`;
      const versionFile = `${input.artifactRootRef}/${directoryName}/capability-version.json`;
      const contractsFile = `${input.artifactRootRef}/${directoryName}/capability-contracts.json`;
      const declaredDependencies = capability.declared_dependencies
        .map((dependencyId) => capabilitiesById.get(dependencyId) ?? null)
        .filter((dependency): dependency is NonNullable<typeof dependency> => dependency !== null)
        .map((dependency) => ({
          capability_id: dependency.id,
          version: dependency.version,
          manifest_ref: dependency.manifest_ref,
          governance_status: dependency.governance_status,
          stability: dependency.stability,
          lifecycle_stage: dependency.lifecycle_stage,
        }));
      const systemDependencies = capability.declared_dependencies
        .filter((dependencyId) => !capabilitiesById.has(dependencyId))
        .filter((dependencyId) => KNOWN_SYSTEM_DEPENDENCIES.has(dependencyId))
        .map((dependencyId) => ({
          dependency_id: dependencyId,
          dependency_kind: "system_runtime" as const,
          rationale: KNOWN_SYSTEM_DEPENDENCIES.get(dependencyId)!,
        }));
      const unresolvedDependencies = capability.declared_dependencies.filter(
        (dependencyId) =>
          !capabilitiesById.has(dependencyId) &&
          !KNOWN_SYSTEM_DEPENDENCIES.has(dependencyId),
      );
      const dependencyClassification = capability.declared_dependencies.map(
        (dependencyId) => {
          const internalCapability = capabilitiesById.get(dependencyId);
          if (internalCapability) {
            return {
              dependency_id: dependencyId,
              dependency_class: "bounded_context_capability" as const,
              resolution_status: "RESOLVED_CAPABILITY" as const,
              rationale:
                "Dependency resolves to a governed capability boundary declared in the repository registry.",
            };
          }
          if (KNOWN_SYSTEM_DEPENDENCIES.has(dependencyId)) {
            return {
              dependency_id: dependencyId,
              dependency_class: "system_runtime" as const,
              resolution_status: "SYSTEM_DEPENDENCY" as const,
              rationale: KNOWN_SYSTEM_DEPENDENCIES.get(dependencyId)!,
            };
          }
          return {
            dependency_id: dependencyId,
            dependency_class: "unknown_external" as const,
            resolution_status: "UNRESOLVED" as const,
            rationale:
              "Dependency does not resolve to a governed capability and is not classified by the current dependency class policy.",
          };
        },
      );
      const contractBindings = capability.required_contract_ranges.map(
        (requirement) => {
          const consumerContract = contractRegistryByConsumer
            .get(capability.id)
            ?.get(requirement.name);

          return {
            contract_name: requirement.name,
            range: requirement.range,
            compatible_providers: consumerContract?.compatible_providers ?? [],
            provider_resolution_status:
              consumerContract?.provider_resolution_status ?? "UNVERIFIED",
            range_policy_status: consumerContract?.range_policy_status ?? "UNVERIFIED",
            status: consumerContract?.status ?? "UNVERIFIED",
          };
        },
        );
        const compatibleRequiredContractCount = contractBindings.filter(
          (requirement) =>
            requirement.status === "PASS" &&
            requirement.provider_resolution_status === "DETERMINISTIC" &&
            (requirement.range_policy_status === "PINNED_MAJOR" ||
              requirement.range_policy_status === "PINNED_VERSION"),
        ).length;
        const unresolvedRequiredContractCount = contractBindings.filter(
          (requirement) => requirement.status !== "PASS",
        ).length;
        const ambiguousRequiredContractCount = contractBindings.filter(
          (requirement) => requirement.provider_resolution_status === "AMBIGUOUS",
        ).length;
        const unboundedRequiredContractCount = contractBindings.filter(
          (requirement) => requirement.range_policy_status === "UNBOUNDED",
        ).length;
        const compatibilityStatus =
          unresolvedRequiredContractCount > 0 ||
          ambiguousRequiredContractCount > 0
            ? ("FAIL" as const)
            : unboundedRequiredContractCount > 0
              ? ("WARN" as const)
              : ("PASS" as const);
        const contractDriftStatus =
          compatibilityStatus === "FAIL"
            ? ("MIGRATION_REQUIRED" as const)
            : compatibilityStatus === "WARN"
              ? ("COMPATIBILITY_DRIFT" as const)
              : ("NONE" as const);

      return {
        capability_id: capability.id,
        directory_name: directoryName,
        manifest_file: manifestFile,
        manifest_json_file: manifestJsonFile,
        dependencies_file: dependenciesFile,
        version_file: versionFile,
        contracts_file: contractsFile,
        manifest: {
          capability_id: capability.id,
          manifest_ref: capability.manifest_ref,
          manifest_version: capability.manifest_version,
          capability_version: capability.version,
          stability: capability.stability,
          lifecycle_stage: capability.lifecycle_stage,
          governance_status: capability.governance_status,
          owner: capability.owner_missing ? null : capability.owner,
          owner_requirement_status: capability.owner_requirement_status,
          runtime_ref: capability.runtime_ref,
          planner_ref: capability.planner_ref,
          composer_ref: capability.composer_ref,
          verification_ref: capability.verification_ref,
          declared_exports: capability.declared_exports,
          artifact_boundary:
            "Capability manifest projection freezes the capability identity, ownership, lifecycle, and implementation entrypoints as governance-readable evidence without changing the canonical capability manifest.",
        },
        dependencies: {
          capability_id: capability.id,
          declared_dependencies: declaredDependencies,
          system_dependencies: systemDependencies,
          dependency_classification: {
            policy_version: "1.0.0",
            entries: dependencyClassification,
          },
          unresolved_dependencies: unresolvedDependencies,
          dependency_policy: capability.dependency_policy,
          declared_consumers: capability.declared_consumers,
          consumers: capability.consumers,
          empirically_verified_products: capability.empirically_verified_products,
          product_reach_ratio: capability.product_reach_ratio,
          reachable_from_products: capability.reachable_from_products,
          reachability_status: capability.reachability_status,
          artifact_boundary:
            "Capability dependency projection freezes dependency intent, consumer relationships, and product reachability so capability evolution can be audited without reading raw manifests directly.",
        },
        version: {
          capability_id: capability.id,
          manifest_version: capability.manifest_version,
          capability_version: capability.version,
          stability: capability.stability,
          lifecycle_stage: capability.lifecycle_stage,
          introduced: capability.introduced,
          deprecated: capability.deprecated,
          artifact_boundary:
            "Capability version projection freezes manifest-level and runtime-level version surfaces used for safe compatibility and lifecycle governance.",
        },
        contracts: {
          capability_id: capability.id,
          provided_contract_versions: capability.provided_contract_versions.map(
            (contract) => ({
              contract_name: contract.name,
              version: contract.version,
            }),
          ),
            required_contract_ranges: contractBindings,
            compatibility: {
              total_required_contract_count: contractBindings.length,
              compatible_required_contract_count: compatibleRequiredContractCount,
              unresolved_required_contract_count: unresolvedRequiredContractCount,
              ambiguous_required_contract_count: ambiguousRequiredContractCount,
              unbounded_required_contract_count: unboundedRequiredContractCount,
              compatibility_status: compatibilityStatus,
              contract_drift_status: contractDriftStatus,
              migration_required: contractDriftStatus !== "NONE",
            },
          artifact_boundary:
            "Capability contracts projection freezes the provided and required contract surface together with resolved provider compatibility so capability evolution remains auditable and deterministic.",
        },
      } satisfies CapabilityGovernanceCapabilityArtifactSet;
    })
    .sort((left, right) => left.capability_id.localeCompare(right.capability_id));

  const unresolvedDependencyCount = capabilities.reduce(
    (sum, capability) => sum + capability.dependencies.unresolved_dependencies.length,
    0,
  );
  const systemDependencyCount = capabilities.reduce(
    (sum, capability) => sum + capability.dependencies.system_dependencies.length,
    0,
  );
  const unknownDependencyClassCount = capabilities.reduce(
    (sum, capability) =>
      sum +
      capability.dependencies.dependency_classification.entries.filter(
        (entry) => entry.dependency_class === "unknown_external",
      ).length,
    0,
  );
  const unresolvedContractRequirementCount = capabilities.reduce(
    (sum, capability) =>
      sum +
      capability.contracts.required_contract_ranges.filter(
        (requirement) => requirement.status !== "PASS",
      ).length,
    0,
  );
  const totalRequiredContractCount = capabilities.reduce(
    (sum, capability) =>
      sum + capability.contracts.compatibility.total_required_contract_count,
    0,
  );
  const compatibleRequiredContractCount = capabilities.reduce(
    (sum, capability) =>
      sum + capability.contracts.compatibility.compatible_required_contract_count,
    0,
  );
  const contractDriftCount = capabilities.filter(
    (capability) =>
      capability.contracts.compatibility.contract_drift_status !== "NONE",
  ).length;
  const migrationRequiredCount = capabilities.filter(
    (capability) => capability.contracts.compatibility.migration_required,
  ).length;
  const compatibilityWarnCount = capabilities.filter(
    (capability) =>
      capability.contracts.compatibility.compatibility_status === "WARN",
  ).length;
  const compatibilityFailCount = capabilities.filter(
    (capability) =>
      capability.contracts.compatibility.compatibility_status === "FAIL",
  ).length;
  const compatibilityGovernanceStatus =
    compatibilityFailCount > 0
      ? ("FAIL" as const)
      : compatibilityWarnCount > 0
        ? ("WARN" as const)
        : ("PASS" as const);
  const indexSummary = {
    capability_count: capabilities.length,
    capabilities_with_manifest_ref: capabilities.filter(
      (capability) => capability.manifest.manifest_ref.length > 0,
    ).length,
    capabilities_with_dependency_surface: capabilities.filter(
      (capability) =>
        capability.dependencies.declared_dependencies.length > 0 ||
        capability.dependencies.unresolved_dependencies.length === 0,
    ).length,
    capabilities_with_contract_surface: capabilities.filter(
      (capability) =>
        capability.contracts.provided_contract_versions.length > 0 ||
        capability.contracts.required_contract_ranges.length > 0 ||
        capability.contracts.capability_id.length > 0,
    ).length,
    overall_status:
      unresolvedDependencyCount === 0 && unresolvedContractRequirementCount === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const indexPayload = {
    summary: indexSummary,
    capabilities: capabilities.map((capability) => ({
      capability_id: capability.capability_id,
      manifest_ref: capability.manifest.manifest_ref,
      governance_status: capability.manifest.governance_status,
      artifact_directory: `${input.artifactRootRef}/${capability.directory_name}`,
      manifest_projection_ref: capability.manifest_file,
      manifest_projection_json_ref: capability.manifest_json_file,
      dependencies_projection_ref: capability.dependencies_file,
      version_projection_ref: capability.version_file,
      contracts_projection_ref: capability.contracts_file,
    })),
  };
  const index: CapabilityGovernanceIndex = {
    projection_version: "1.0.0",
    projection_digest: DigestEngine.digest(indexPayload),
    ...indexPayload,
    claim_boundary:
      "Capability governance index projects every capability into stable governance-readable artifacts for manifest, dependency, version, and contract surfaces. It reduces capability evolution to auditable evidence instead of ad-hoc repository inspection.",
  };
  const verificationSummary = {
    manifest_projection_status:
      indexSummary.capabilities_with_manifest_ref === indexSummary.capability_count
        ? ("PASS" as const)
        : ("FAIL" as const),
    dependency_projection_status:
      unresolvedDependencyCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    dependency_class_policy_status:
      unknownDependencyClassCount === 0 ? ("PASS" as const) : ("FAIL" as const),
    contract_projection_status:
      unresolvedContractRequirementCount === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
    compatibility_governance_status: compatibilityGovernanceStatus,
    compatibility_score:
      totalRequiredContractCount === 0
        ? 100
        : Math.round(
            (compatibleRequiredContractCount / totalRequiredContractCount) * 100,
          ),
    system_dependency_count: systemDependencyCount,
    unknown_dependency_class_count: unknownDependencyClassCount,
    unresolved_dependency_count: unresolvedDependencyCount,
    unresolved_contract_requirement_count: unresolvedContractRequirementCount,
    contract_drift_count: contractDriftCount,
    migration_required_count: migrationRequiredCount,
    overall_status:
      unresolvedDependencyCount === 0 &&
      unknownDependencyClassCount === 0 &&
      unresolvedContractRequirementCount === 0
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const verificationPayload = {
    summary: verificationSummary,
    capability_count: capabilities.length,
  };
  const verification: CapabilityGovernanceVerificationReport = {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(verificationPayload),
    ...verificationPayload,
    claim_boundary:
      "Capability governance verification proves that each capability has a projected manifest, dependency surface, version surface, and contract surface that can be audited without architectural guesswork.",
  };

  return {
    index,
    verification,
    capabilities,
  };
}
