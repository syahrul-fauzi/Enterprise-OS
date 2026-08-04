import type { GateCGovernancePlatformSnapshot } from "../read-models/status-snapshot.js";

export type GateCTrustBundle = Readonly<{
  framework: Readonly<{
    hash: string | null;
    verificationHash: string | null;
    status: string;
    frameworkCount: number | null;
    fullSpiCoverageCount: number | null;
  }>;
  attestationLifecycle: Readonly<{
    verificationHash: string | null;
    status: string;
    terminalEventReadinessStatus: string;
    terminalEventCount: number | null;
    materializationHash: string | null;
    materializationStatus: string;
    materializedSampleCount: number | null;
  }>;
  signatures: Readonly<{
    providerRegistryHash: string | null;
    providerVerificationHash: string | null;
    providerStatus: string;
    providerAdapterCount: number | null;
    providerSpi: string | null;
    materializationHash: string | null;
    materializationStatus: string;
    materializedAttestationCount: number | null;
  }>;
}>;

export function materializeGateCTrustBundle(
  snapshot: GateCGovernancePlatformSnapshot,
): GateCTrustBundle {
  return {
    framework: {
      hash: snapshot.trust_framework_hash,
      verificationHash: snapshot.trust_framework_verification_hash,
      status: snapshot.trust_framework_status,
      frameworkCount: snapshot.trust_framework_count,
      fullSpiCoverageCount: snapshot.trust_frameworks_with_full_spi_coverage,
    },
    attestationLifecycle: {
      verificationHash: snapshot.attestation_lifecycle_verification_hash,
      status: snapshot.attestation_lifecycle_status,
      terminalEventReadinessStatus:
        snapshot.attestation_lifecycle_terminal_event_readiness_status,
      terminalEventCount: snapshot.attestation_lifecycle_terminal_event_count,
      materializationHash: snapshot.attestation_lifecycle_materialization_hash,
      materializationStatus:
        snapshot.attestation_lifecycle_materialization_status,
      materializedSampleCount:
        snapshot.attestation_lifecycle_materialized_sample_count,
    },
    signatures: {
      providerRegistryHash: snapshot.trust_signature_provider_registry_hash,
      providerVerificationHash:
        snapshot.trust_signature_provider_verification_hash,
      providerStatus: snapshot.trust_signature_provider_status,
      providerAdapterCount: snapshot.trust_signature_provider_adapter_count,
      providerSpi: snapshot.trust_signature_provider_spi,
      materializationHash: snapshot.trust_signature_materialization_hash,
      materializationStatus: snapshot.trust_signature_materialization_status,
      materializedAttestationCount:
        snapshot.trust_signature_materialized_attestation_count,
    },
  };
}
