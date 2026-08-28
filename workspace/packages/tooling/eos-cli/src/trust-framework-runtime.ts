// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import type { ConstitutionAttestationProfile } from "./attestation-runtime.js";

export type TrustVerificationProfile = {
  readonly verification_profile_id: string;
  readonly verification_profile_digest: string;
  readonly attestation_profile: ConstitutionAttestationProfile;
  readonly policy_scope:
    | "local_development"
    | "production"
    | "federated";
  readonly verification_mode: "DECLARED";
};

export type TrustSignatureProvider = {
  readonly provider_id: string;
  readonly provider_kind:
    | "Local"
    | "KMS"
    | "HSM"
    | "Sigstore"
    | "Cosign"
    | "Remote";
  readonly provider_status: "DECLARED";
  readonly spi_contract: "TrustSignatureProviderSPI";
};

export type TrustFrameworkReference = {
  readonly framework_id: string;
  readonly framework_digest: string;
  readonly verification_profile_id: string;
  readonly signature_provider_spi: "DECLARED";
  readonly framework_boundary: string;
};

export type TrustFrameworkDefinition = {
  readonly framework_id: string;
  readonly framework_digest: string;
  readonly status: "DECLARED";
  readonly attestation_profile: ConstitutionAttestationProfile;
  readonly policies: readonly {
    readonly policy_id: string;
    readonly policy_scope: string;
  }[];
  readonly roots: readonly string[];
  readonly trust_stores: readonly string[];
  readonly keysets: readonly string[];
  readonly verification_profiles: readonly TrustVerificationProfile[];
  readonly algorithms: readonly string[];
  readonly signature_providers: readonly TrustSignatureProvider[];
  readonly framework_boundary: string;
};

export type TrustFrameworkCatalog = {
  readonly catalog_id: string;
  readonly catalog_digest: string;
  readonly frameworks: readonly TrustFrameworkDefinition[];
  readonly claim_boundary: string;
};

function buildVerificationProfile(input: {
  readonly verificationProfileId: string;
  readonly attestationProfile: ConstitutionAttestationProfile;
  readonly policyScope: "local_development" | "production" | "federated";
}): TrustVerificationProfile {
  const payload = {
    verification_profile_id: input.verificationProfileId,
    attestation_profile: input.attestationProfile,
    policy_scope: input.policyScope,
    verification_mode: "DECLARED" as const,
  };

  return {
    ...payload,
    verification_profile_digest: DigestEngine.digest(payload),
  };
}

function buildFrameworkDefinition(
  profile: ConstitutionAttestationProfile,
): TrustFrameworkDefinition {
  const base = (() => {
    switch (profile) {
      case "local_signed":
        return {
          framework_id: "trust-framework:local-development-signed",
          policy_scope: "local_development" as const,
          policy_id: "attestation-policy:local-signed",
          roots: ["root:local-development"],
          trust_stores: ["trust-store:local-development"],
          keysets: ["keyset:local-development-signers"],
          algorithms: ["LOCAL_DIGEST_V1"],
          verification_profile_id: "verification-profile:local-development-signed",
        };
      case "production_pending_signature":
        return {
          framework_id: "trust-framework:production",
          policy_scope: "production" as const,
          policy_id: "attestation-policy:production-pending-signature",
          roots: ["root:production-pending"],
          trust_stores: ["trust-store:production"],
          keysets: ["keyset:production-signers"],
          algorithms: ["RS256", "ES256"],
          verification_profile_id: "verification-profile:production",
        };
      case "cross_org_pending_signature":
        return {
          framework_id: "trust-framework:federated",
          policy_scope: "federated" as const,
          policy_id: "attestation-policy:cross-org-pending-signature",
          roots: ["root:federated-pending"],
          trust_stores: ["trust-store:federated"],
          keysets: ["keyset:federated-signers"],
          algorithms: ["Sigstore", "DSSE"],
          verification_profile_id: "verification-profile:federated",
        };
      case "local_unsigned":
      default:
        return {
          framework_id: "trust-framework:local-development",
          policy_scope: "local_development" as const,
          policy_id: "attestation-policy:local-unsigned",
          roots: ["root:local-development"],
          trust_stores: ["trust-store:local-development"],
          keysets: ["keyset:local-development"],
          algorithms: ["UNSIGNED"],
          verification_profile_id: "verification-profile:local-development",
        };
    }
  })();

  const verificationProfile = buildVerificationProfile({
    verificationProfileId: base.verification_profile_id,
    attestationProfile: profile,
    policyScope: base.policy_scope,
  });
  const signatureProviders: readonly TrustSignatureProvider[] = [
    { provider_id: "signature-provider:local", provider_kind: "Local", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
    { provider_id: "signature-provider:kms", provider_kind: "KMS", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
    { provider_id: "signature-provider:hsm", provider_kind: "HSM", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
    { provider_id: "signature-provider:sigstore", provider_kind: "Sigstore", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
    { provider_id: "signature-provider:cosign", provider_kind: "Cosign", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
    { provider_id: "signature-provider:remote", provider_kind: "Remote", provider_status: "DECLARED", spi_contract: "TrustSignatureProviderSPI" },
  ];
  const payload = {
    framework_id: base.framework_id,
    status: "DECLARED" as const,
    attestation_profile: profile,
    policies: [{ policy_id: base.policy_id, policy_scope: base.policy_scope }],
    roots: base.roots,
    trust_stores: base.trust_stores,
    keysets: base.keysets,
    verification_profiles: [verificationProfile],
    algorithms: base.algorithms,
    signature_providers: signatureProviders,
  };

  return {
    ...payload,
    framework_digest: DigestEngine.digest(payload),
    framework_boundary:
      "Trust framework is the trust-domain aggregate that owns attestation policies, roots, trust stores, keysets, verification profiles, algorithms, and signature-provider SPI contracts independently from constitution and certificate identity.",
  };
}

export function materializeTrustFrameworkCatalog(): TrustFrameworkCatalog {
  const frameworks = [
    buildFrameworkDefinition("local_signed"),
    buildFrameworkDefinition("local_unsigned"),
    buildFrameworkDefinition("production_pending_signature"),
    buildFrameworkDefinition("cross_org_pending_signature"),
  ] as const;
  const payload = { frameworks };
  const catalogDigest = DigestEngine.digest(payload);

  return {
    catalog_id: `trust-framework-catalog:${catalogDigest.slice(0, 16)}`,
    catalog_digest: catalogDigest,
    frameworks,
    claim_boundary:
      "Trust framework catalog declares the trust-domain contract surface before cryptographic adapters are activated. It provides stable identities for policies, roots, verification profiles, and signature-provider SPI selection.",
  };
}

export function resolveTrustFrameworkReference(
  profile: ConstitutionAttestationProfile,
): TrustFrameworkReference {
  const framework = materializeTrustFrameworkCatalog().frameworks.find(
    (entry) => entry.attestation_profile === profile,
  );
  if (!framework) {
    throw new Error(`trust_framework_unavailable_for_profile:${profile}`);
  }

  return {
    framework_id: framework.framework_id,
    framework_digest: framework.framework_digest,
    verification_profile_id:
      framework.verification_profiles[0]?.verification_profile_id ??
      "UNVERIFIED",
    signature_provider_spi: "DECLARED",
    framework_boundary:
      "Trust framework reference links governance provenance and attestation policy to a trust-domain aggregate without embedding signer implementation details into certificates.",
  };
}
