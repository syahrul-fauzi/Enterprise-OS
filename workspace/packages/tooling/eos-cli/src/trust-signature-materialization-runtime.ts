import { DigestEngine } from "@repo/core-kernel";
import type {
  ConstitutionAttestationPolicy,
  ConstitutionLawAttestation,
} from "./attestation-runtime.js";
import { verifyLocalTrustSignatureReference } from "./local-trust-signature-runtime.js";

export type TrustSignatureMaterializationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly attestation_profile: string;
  readonly summary: {
    readonly activation_status: "ACTIVE" | "PENDING";
    readonly attestation_count: number;
    readonly verified_attestation_count: number;
    readonly signed_verified_attestation_count: number;
    readonly verification_pass_count: number;
    readonly signature_materialization_status: "PASS" | "FAIL";
    readonly signature_verification_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly claim_boundary: string;
};

function computeVerifiedAttestationSignaturePayloadDigest(
  attestation: ConstitutionLawAttestation,
): string {
  return DigestEngine.digest({
    attestation_reference: attestation.attestation_reference,
    event_type: "AttestationVerified",
    event_index: 1,
    attestation_status: "VERIFIED",
    policy_id: attestation.policy_id,
    policy_digest: attestation.policy_digest,
    trust_framework_id: attestation.trust_framework_id,
    verification_profile_id: attestation.verification_profile_id,
    certificate_id: attestation.certificate_id,
    certificate_digest: attestation.certificate_digest,
  });
}

export function materializeTrustSignatureMaterializationReport(input: {
  readonly attestationProfile: string;
  readonly attestationPolicy: ConstitutionAttestationPolicy;
  readonly lawAttestations: readonly ConstitutionLawAttestation[];
}): TrustSignatureMaterializationReport {
  const verifiedAttestations = input.lawAttestations.filter(
    (attestation) => attestation.event_type === "AttestationVerified",
  );
  const signedVerifiedAttestations = verifiedAttestations.filter(
    (attestation) => attestation.signature_reference !== null,
  );
  const verificationPassCount = signedVerifiedAttestations.filter((attestation) => {
    const signatureReference = attestation.signature_reference;
    if (signatureReference === null) {
      return false;
    }

    return (
      verifyLocalTrustSignatureReference({
        signature_reference: signatureReference,
        payload_digest:
          computeVerifiedAttestationSignaturePayloadDigest(attestation),
      }).verification_status === "VERIFIED"
    );
  }).length;
  const activationStatus =
    input.attestationPolicy.signature.status === "SIGNED"
      ? ("ACTIVE" as const)
      : ("PENDING" as const);
  const signatureMaterializationStatus =
    activationStatus === "ACTIVE" &&
    signedVerifiedAttestations.length === verifiedAttestations.length
      ? ("PASS" as const)
      : ("FAIL" as const);
  const signatureVerificationStatus =
    activationStatus === "ACTIVE" &&
    verificationPassCount === verifiedAttestations.length
      ? ("PASS" as const)
      : ("FAIL" as const);
  const summary = {
    activation_status: activationStatus,
    attestation_count: input.lawAttestations.length,
    verified_attestation_count: verifiedAttestations.length,
    signed_verified_attestation_count: signedVerifiedAttestations.length,
    verification_pass_count: verificationPassCount,
    signature_materialization_status: signatureMaterializationStatus,
    signature_verification_status: signatureVerificationStatus,
    overall_status:
      activationStatus === "ACTIVE" &&
      signatureMaterializationStatus === "PASS" &&
      signatureVerificationStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const payload = {
    attestation_profile: input.attestationProfile,
    summary,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Trust signature materialization proves that the active trust signing profile is not merely declared. It verifies that signed attestation events actually carry signature references and that the Local signer can deterministically re-verify those references from the attestation payload digest.",
  };
}
