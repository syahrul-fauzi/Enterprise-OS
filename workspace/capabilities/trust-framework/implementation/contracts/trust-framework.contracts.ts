export type JsonRecord = Record<string, unknown>;

export type TrustVerificationProfile = JsonRecord & {
  readonly verification_profile_id: string;
  readonly verification_profile_digest: string;
};

export type TrustSignatureProvider = JsonRecord & {
  readonly provider_id: string;
  readonly provider_kind: string;
  readonly provider_status: "DECLARED";
  readonly spi_contract: "TrustSignatureProviderSPI";
};

export type TrustSignatureReference = JsonRecord & {
  readonly signature_reference: string;
  readonly provider_id: string;
  readonly provider_kind: string;
  readonly signature_status: "DECLARED" | "SIGNED";
};

export type TrustVerificationResult = JsonRecord & {
  readonly provider_id: string;
  readonly verification_status: "DECLARED" | "VERIFIED" | "FAILED";
};

export type TrustFramework = JsonRecord & {
  readonly framework_id: string;
  readonly framework_digest: string;
  readonly status: "DECLARED";
  readonly verification_profiles: readonly TrustVerificationProfile[];
  readonly signature_providers: readonly TrustSignatureProvider[];
};

export type TrustFrameworkCatalog = JsonRecord & {
  readonly catalog_id: string;
  readonly catalog_digest: string;
  readonly frameworks: readonly TrustFramework[];
};

export interface TrustFrameworkProvider {
  getFrameworkCatalog(): TrustFrameworkCatalog;
  getFramework(frameworkId: string): TrustFramework;
}

export interface TrustSignatureProviderSPI {
  sign(input: {
    readonly certificate_id: string;
    readonly attestation_reference: string;
    readonly payload_digest: string;
  }): TrustSignatureReference;
  verify(input: {
    readonly signature_reference: string;
    readonly payload_digest: string;
  }): TrustVerificationResult;
}
