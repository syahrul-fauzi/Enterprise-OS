// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type { TrustFrameworkCatalog } from "./trust-framework-runtime.js";

const REQUIRED_PROVIDER_KINDS = [
  "Local",
  "KMS",
  "HSM",
  "Sigstore",
  "Cosign",
  "Remote",
] as const;

export type TrustFrameworkVerificationFramework = {
  readonly framework_id: string;
  readonly attestation_profile: string;
  readonly topology_status: "PASS" | "FAIL";
  readonly verification_profile_status: "PASS" | "FAIL";
  readonly spi_coverage_status: "PASS" | "FAIL";
  readonly policy_count: number;
  readonly root_count: number;
  readonly trust_store_count: number;
  readonly keyset_count: number;
  readonly verification_profile_count: number;
  readonly signature_provider_count: number;
  readonly provider_kinds_present: readonly string[];
  readonly missing_provider_kinds: readonly string[];
  readonly status: "PASS" | "FAIL";
};

export type TrustFrameworkVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly framework_count: number;
    readonly attestation_profile_count: number;
    readonly policy_count: number;
    readonly root_count: number;
    readonly trust_store_count: number;
    readonly keyset_count: number;
    readonly verification_profile_count: number;
    readonly signature_provider_count: number;
    readonly frameworks_with_complete_topology: number;
    readonly frameworks_with_verification_profile: number;
    readonly frameworks_with_full_spi_coverage: number;
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly frameworks: readonly TrustFrameworkVerificationFramework[];
  readonly claim_boundary: string;
};

export function materializeTrustFrameworkVerificationReport(
  catalog: TrustFrameworkCatalog,
): TrustFrameworkVerificationReport {
  const frameworks = catalog.frameworks.map((framework) => {
    const providerKindsPresent = Array.from(
      new Set(framework.signature_providers.map((provider) => provider.provider_kind)),
    ).sort((left, right) => left.localeCompare(right));
    const missingProviderKinds = REQUIRED_PROVIDER_KINDS.filter(
      (kind) => !providerKindsPresent.includes(kind),
    );
    const topologyStatus =
      framework.policies.length > 0 &&
      framework.roots.length > 0 &&
      framework.trust_stores.length > 0 &&
      framework.keysets.length > 0
        ? ("PASS" as const)
        : ("FAIL" as const);
    const verificationProfileStatus =
      framework.verification_profiles.length > 0 ? ("PASS" as const) : ("FAIL" as const);
    const spiCoverageStatus =
      missingProviderKinds.length === 0 &&
      framework.signature_providers.every(
        (provider) =>
          provider.provider_status === "DECLARED" &&
          provider.spi_contract === "TrustSignatureProviderSPI",
      )
        ? ("PASS" as const)
        : ("FAIL" as const);
    const status =
      topologyStatus === "PASS" &&
      verificationProfileStatus === "PASS" &&
      spiCoverageStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const);

    return {
      framework_id: framework.framework_id,
      attestation_profile: framework.attestation_profile,
      topology_status: topologyStatus,
      verification_profile_status: verificationProfileStatus,
      spi_coverage_status: spiCoverageStatus,
      policy_count: framework.policies.length,
      root_count: framework.roots.length,
      trust_store_count: framework.trust_stores.length,
      keyset_count: framework.keysets.length,
      verification_profile_count: framework.verification_profiles.length,
      signature_provider_count: framework.signature_providers.length,
      provider_kinds_present: providerKindsPresent,
      missing_provider_kinds: missingProviderKinds,
      status,
    };
  });

  const summary = {
    framework_count: frameworks.length,
    attestation_profile_count: new Set(
      frameworks.map((framework) => framework.attestation_profile),
    ).size,
    policy_count: frameworks.reduce((sum, framework) => sum + framework.policy_count, 0),
    root_count: frameworks.reduce((sum, framework) => sum + framework.root_count, 0),
    trust_store_count: frameworks.reduce(
      (sum, framework) => sum + framework.trust_store_count,
      0,
    ),
    keyset_count: frameworks.reduce((sum, framework) => sum + framework.keyset_count, 0),
    verification_profile_count: frameworks.reduce(
      (sum, framework) => sum + framework.verification_profile_count,
      0,
    ),
    signature_provider_count: frameworks.reduce(
      (sum, framework) => sum + framework.signature_provider_count,
      0,
    ),
    frameworks_with_complete_topology: frameworks.filter(
      (framework) => framework.topology_status === "PASS",
    ).length,
    frameworks_with_verification_profile: frameworks.filter(
      (framework) => framework.verification_profile_status === "PASS",
    ).length,
    frameworks_with_full_spi_coverage: frameworks.filter(
      (framework) => framework.spi_coverage_status === "PASS",
    ).length,
    overall_status: frameworks.every((framework) => framework.status === "PASS")
      ? ("PASS" as const)
      : ("FAIL" as const),
  };
  const payload = {
    summary,
    frameworks,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Trust framework verification proves that each declared trust framework carries a minimally complete trust topology and full signature-provider SPI coverage before cryptographic adapters are activated. This measures trust-platform maturity without embedding signer implementations into governance evidence.",
  };
}
