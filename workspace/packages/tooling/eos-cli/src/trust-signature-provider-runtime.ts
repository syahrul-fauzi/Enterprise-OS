import { DigestEngine } from "@repo/core-kernel";
import type { TrustFrameworkCatalog } from "./trust-framework-runtime.js";

export type TrustSignatureProviderAdapter = {
  readonly adapter_id: string;
  readonly provider_id: string;
  readonly provider_kind:
    | "Local"
    | "KMS"
    | "HSM"
    | "Sigstore"
    | "Cosign"
    | "Remote";
  readonly spi_contract: "TrustSignatureProviderSPI";
  readonly activation_mode:
    | "in_process_runtime"
    | "external_control_plane"
    | "federated_remote";
  readonly implementation_status: "ADAPTER_READY";
  readonly sign_operation_status: "DECLARED";
  readonly verify_operation_status: "DECLARED";
  readonly adapter_boundary: string;
};

export type TrustSignatureProviderRegistry = {
  readonly registry_version: "1.0.0";
  readonly registry_id: string;
  readonly registry_digest: string;
  readonly adapters: readonly TrustSignatureProviderAdapter[];
  readonly claim_boundary: string;
};

export type TrustSignatureProviderVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly adapter_count: number;
    readonly provider_coverage_status: "PASS" | "FAIL";
    readonly spi_binding_status: "PASS" | "FAIL";
    readonly operation_surface_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly adapters: readonly TrustSignatureProviderAdapter[];
  readonly claim_boundary: string;
};

function resolveActivationMode(
  providerKind: TrustSignatureProviderAdapter["provider_kind"],
): TrustSignatureProviderAdapter["activation_mode"] {
  switch (providerKind) {
    case "Local":
      return "in_process_runtime";
    case "KMS":
    case "HSM":
      return "external_control_plane";
    case "Sigstore":
    case "Cosign":
    case "Remote":
      return "federated_remote";
  }
}

export function materializeTrustSignatureProviderRegistry(
  catalog: TrustFrameworkCatalog,
): TrustSignatureProviderRegistry {
  const adapters = Array.from(
    new Map(
      catalog.frameworks.flatMap((framework) =>
        framework.signature_providers.map((provider) => {
          const adapter: TrustSignatureProviderAdapter = {
            adapter_id: `trust-signature-adapter:${provider.provider_kind.toLowerCase()}`,
            provider_id: provider.provider_id,
            provider_kind: provider.provider_kind,
            spi_contract: provider.spi_contract,
            activation_mode: resolveActivationMode(provider.provider_kind),
            implementation_status: "ADAPTER_READY",
            sign_operation_status: "DECLARED",
            verify_operation_status: "DECLARED",
            adapter_boundary:
              "Signature provider adapters are activation surfaces for trust SPI binding. They keep signer implementation choices outside governance evidence and certificate identity while preserving a stable provider selection contract.",
          };

          return [adapter.provider_kind, adapter] as const;
        }),
      ),
    ).values(),
  ).sort((left, right) => left.provider_kind.localeCompare(right.provider_kind));
  const payload = { adapters };
  const registryDigest = DigestEngine.digest(payload);

  return {
    registry_version: "1.0.0",
    registry_id: `trust-signature-provider-registry:${registryDigest.slice(0, 16)}`,
    registry_digest: registryDigest,
    adapters,
    claim_boundary:
      "Trust signature provider registry declares the adapter activation surface behind TrustSignatureProviderSPI. It proves that each provider kind exposed by the trust framework has a stable adapter identity and activation mode before cryptographic signing is enabled.",
  };
}

export function materializeTrustSignatureProviderVerificationReport(input: {
  readonly catalog: TrustFrameworkCatalog;
  readonly registry: TrustSignatureProviderRegistry;
}): TrustSignatureProviderVerificationReport {
  const declaredProviderKinds = Array.from(
    new Set(
      input.catalog.frameworks.flatMap((framework) =>
        framework.signature_providers.map((provider) => provider.provider_kind),
      ),
    ),
  ).sort((left, right) => left.localeCompare(right));
  const adapterKinds = input.registry.adapters.map((adapter) => adapter.provider_kind);
  const providerCoverageStatus = declaredProviderKinds.every((kind) =>
    adapterKinds.includes(kind),
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const spiBindingStatus = input.registry.adapters.every(
    (adapter) =>
      adapter.spi_contract === "TrustSignatureProviderSPI" &&
      adapter.implementation_status === "ADAPTER_READY",
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const operationSurfaceStatus = input.registry.adapters.every(
    (adapter) =>
      adapter.sign_operation_status === "DECLARED" &&
      adapter.verify_operation_status === "DECLARED",
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const summary = {
    adapter_count: input.registry.adapters.length,
    provider_coverage_status: providerCoverageStatus,
    spi_binding_status: spiBindingStatus,
    operation_surface_status: operationSurfaceStatus,
    overall_status:
      providerCoverageStatus === "PASS" &&
      spiBindingStatus === "PASS" &&
      operationSurfaceStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const payload = {
    summary,
    adapters: input.registry.adapters,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Trust signature provider verification proves that the trust framework has a complete adapter activation surface for every declared provider kind. It does not claim cryptographic signing is active yet; it proves the SPI binding path is explicit, covered, and ready for controlled activation.",
  };
}
