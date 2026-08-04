import { DigestEngine } from "@repo/core-kernel";

export const LOCAL_TRUST_SIGNATURE_PROVIDER_ID = "signature-provider:local";
export const LOCAL_TRUST_SIGNATURE_PROVIDER_KIND = "Local";
export const LOCAL_TRUST_SIGNATURE_SCHEME = "LOCAL_DIGEST_V1";
export const LOCAL_TRUST_SIGNATURE_KEY_ID = "local-development-key";

export type LocalTrustSignatureReference = {
  readonly signature_reference: string;
  readonly provider_id: typeof LOCAL_TRUST_SIGNATURE_PROVIDER_ID;
  readonly provider_kind: typeof LOCAL_TRUST_SIGNATURE_PROVIDER_KIND;
  readonly signature_status: "SIGNED";
  readonly signature_scheme: typeof LOCAL_TRUST_SIGNATURE_SCHEME;
  readonly key_id: typeof LOCAL_TRUST_SIGNATURE_KEY_ID;
  readonly signature_digest: string;
};

export type LocalTrustVerificationResult = {
  readonly provider_id: typeof LOCAL_TRUST_SIGNATURE_PROVIDER_ID;
  readonly verification_status: "VERIFIED" | "FAILED";
};

function computeLocalTrustSignatureDigest(payloadDigest: string): string {
  return DigestEngine.digest({
    provider_id: LOCAL_TRUST_SIGNATURE_PROVIDER_ID,
    signature_scheme: LOCAL_TRUST_SIGNATURE_SCHEME,
    payload_digest: payloadDigest,
  });
}

export function materializeLocalTrustSignatureReference(input: {
  readonly certificate_id: string;
  readonly attestation_reference: string;
  readonly payload_digest: string;
}): LocalTrustSignatureReference {
  const signatureDigest = computeLocalTrustSignatureDigest(input.payload_digest);

  return {
    signature_reference: `trust-signature:local:${signatureDigest.slice(0, 16)}`,
    provider_id: LOCAL_TRUST_SIGNATURE_PROVIDER_ID,
    provider_kind: LOCAL_TRUST_SIGNATURE_PROVIDER_KIND,
    signature_status: "SIGNED",
    signature_scheme: LOCAL_TRUST_SIGNATURE_SCHEME,
    key_id: LOCAL_TRUST_SIGNATURE_KEY_ID,
    signature_digest: signatureDigest,
  };
}

export function verifyLocalTrustSignatureReference(input: {
  readonly signature_reference: string;
  readonly payload_digest: string;
}): LocalTrustVerificationResult {
  const expectedSignatureReference = materializeLocalTrustSignatureReference({
    certificate_id: "UNUSED_BY_LOCAL_VERIFIER",
    attestation_reference: "UNUSED_BY_LOCAL_VERIFIER",
    payload_digest: input.payload_digest,
  }).signature_reference;

  return {
    provider_id: LOCAL_TRUST_SIGNATURE_PROVIDER_ID,
    verification_status:
      input.signature_reference === expectedSignatureReference
        ? "VERIFIED"
        : "FAILED",
  };
}
