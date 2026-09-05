// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import type { ConstitutionLawCertificate } from "./certificate-runtime.js";
import { materializeLocalTrustSignatureReference } from "./local-trust-signature-runtime.js";
import {
  resolveTrustFrameworkReference,
  type TrustFrameworkReference,
} from "./trust-framework-runtime.js";

export type ConstitutionAttestationProfile =
  | "local_signed"
  | "local_unsigned"
  | "production_pending_signature"
  | "cross_org_pending_signature";

export type ConstitutionAttestationPolicy = {
  readonly policy_id: string;
  readonly policy_digest: string;
  readonly profile: ConstitutionAttestationProfile;
  readonly trust_framework: TrustFrameworkReference;
  readonly issuer: {
    readonly issuer_id: string;
    readonly display_name: string;
  };
  readonly trust_chain: string;
  readonly signature:
    | {
        readonly status: "UNSIGNED";
        readonly scheme: null;
        readonly value: null;
        readonly key_id: null;
        readonly reason: string;
      }
    | {
        readonly status: "SIGNED";
        readonly scheme: "LOCAL_DIGEST_V1";
        readonly value: "MATERIALIZED_PER_ATTESTATION";
        readonly key_id: "local-development-key";
        readonly reason: string;
      };
  readonly policy_boundary: string;
};

export type ConstitutionAttestationEventType =
  | "AttestationCreated"
  | "AttestationVerified"
  | "AttestationExpired"
  | "AttestationRevoked"
  | "AttestationSuperseded";

export type ConstitutionAttestationTerminalEventType =
  | "AttestationExpired"
  | "AttestationRevoked"
  | "AttestationSuperseded";

export const SUPPORTED_CONSTITUTION_ATTESTATION_EVENT_TYPES = [
  "AttestationCreated",
  "AttestationVerified",
  "AttestationExpired",
  "AttestationRevoked",
  "AttestationSuperseded",
] as const satisfies readonly ConstitutionAttestationEventType[];

export const SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES = [
  "AttestationExpired",
  "AttestationRevoked",
  "AttestationSuperseded",
] as const satisfies readonly ConstitutionAttestationTerminalEventType[];

export type ConstitutionLawAttestation = {
  readonly attestation_id: string;
  readonly attestation_reference: string;
  readonly event_id: string;
  readonly event_digest: string;
  readonly event_type: ConstitutionAttestationEventType;
  readonly event_index: number;
  readonly policy_id: string;
  readonly policy_digest: string;
  readonly trust_framework_id: string;
  readonly verification_profile_id: string;
  readonly certificate_id: string;
  readonly certificate_digest: string;
  readonly occurred_at_utc: null;
  readonly attestation_status:
    | "ACTIVE"
    | "VERIFIED"
    | "EXPIRED"
    | "REVOKED"
    | "SUPERSEDED";
  readonly signature_reference: string | null;
  readonly event_boundary: string;
};

const TERMINAL_ATTESTATION_STATUS_BY_EVENT_TYPE: Record<
  ConstitutionAttestationTerminalEventType,
  ConstitutionLawAttestation["attestation_status"]
> = {
  AttestationExpired: "EXPIRED",
  AttestationRevoked: "REVOKED",
  AttestationSuperseded: "SUPERSEDED",
};

const TERMINAL_ATTESTATION_BOUNDARY_BY_EVENT_TYPE: Record<
  ConstitutionAttestationTerminalEventType,
  string
> = {
  AttestationExpired:
    "Attestation events remain append-only when trust assertions expire. Expired records preserve provenance while marking that a previously verified attestation is no longer current for active trust decisions.",
  AttestationRevoked:
    "Attestation events remain append-only when trust assertions are revoked. Revoked records preserve the historical verification trail while marking that the attestation must no longer be relied upon.",
  AttestationSuperseded:
    "Attestation events remain append-only when a trust assertion is superseded. Superseded records preserve provenance while allowing a newer attestation lifecycle to become the active trust reference.",
};

type ConstitutionAttestationPolicyDefinition = Omit<
  ConstitutionAttestationPolicy,
  "policy_digest"
>;

const ATTESTATION_POLICIES: Record<
  ConstitutionAttestationProfile,
  ConstitutionAttestationPolicyDefinition
> = {
  local_signed: {
    policy_id: "attestation-policy:local-signed",
    profile: "local_signed",
    trust_framework: resolveTrustFrameworkReference("local_signed"),
    issuer: {
      issuer_id: "LOCAL_SIGNER_ACTIVE",
      display_name: "Local Signed Runtime",
    },
    trust_chain: "LOCAL_TRUST_WITH_ACTIVE_SIGNER",
    signature: {
      status: "SIGNED",
      scheme: "LOCAL_DIGEST_V1",
      value: "MATERIALIZED_PER_ATTESTATION",
      key_id: "local-development-key",
      reason:
        "Local trust signing is active for workstation and CI verification. Signature references are materialized per attestation event through the Local trust adapter.",
    },
    policy_boundary:
      "Local signed attestation is the baseline trust posture for development verification once the Local signer adapter is activated.",
  },
  local_unsigned: {
    policy_id: "attestation-policy:local-unsigned",
    profile: "local_unsigned",
    trust_framework: resolveTrustFrameworkReference("local_unsigned"),
    issuer: {
      issuer_id: "UNATTESTED",
      display_name: "Local Unsigned Runtime",
    },
    trust_chain: "UNATTESTED_LOCAL",
    signature: {
      status: "UNSIGNED",
      scheme: null,
      value: null,
      key_id: null,
      reason:
        "Cryptographic attestation is not materialized yet. This policy records local unsigned verification for CI and workstation execution.",
    },
    policy_boundary:
      "Local unsigned attestation is the default trust posture for non-distributed runtime verification.",
  },
  production_pending_signature: {
    policy_id: "attestation-policy:production-pending-signature",
    profile: "production_pending_signature",
    trust_framework: resolveTrustFrameworkReference("production_pending_signature"),
    issuer: {
      issuer_id: "PRODUCTION_SIGNER_PENDING",
      display_name: "Production Signer Pending Activation",
    },
    trust_chain: "PRODUCTION_TRUST_PENDING_SIGNATURE",
    signature: {
      status: "UNSIGNED",
      scheme: null,
      value: null,
      key_id: null,
      reason:
        "This policy reserves the production attestation boundary before cryptographic signing is enabled.",
    },
    policy_boundary:
      "Production pending signature captures the intended production trust chain without mutating certificate identity.",
  },
  cross_org_pending_signature: {
    policy_id: "attestation-policy:cross-org-pending-signature",
    profile: "cross_org_pending_signature",
    trust_framework: resolveTrustFrameworkReference("cross_org_pending_signature"),
    issuer: {
      issuer_id: "CROSS_ORG_SIGNER_PENDING",
      display_name: "Cross-Organization Signer Pending Activation",
    },
    trust_chain: "FEDERATED_TRUST_PENDING_SIGNATURE",
    signature: {
      status: "UNSIGNED",
      scheme: null,
      value: null,
      key_id: null,
      reason:
        "This policy reserves the federated attestation boundary before cross-organization signing is enabled.",
    },
    policy_boundary:
      "Cross-organization pending signature models federated trust evolution independently from certificate and law-result identity.",
  },
};

export function resolveConstitutionAttestationPolicy(
  profile: ConstitutionAttestationProfile = "local_signed",
): ConstitutionAttestationPolicy {
  const basePolicy = ATTESTATION_POLICIES[profile];
  const policyDigest = DigestEngine.digest({
    profile: basePolicy.profile,
    trust_framework: basePolicy.trust_framework,
    issuer: basePolicy.issuer,
    trust_chain: basePolicy.trust_chain,
    signature: basePolicy.signature,
  });

  return {
    ...basePolicy,
    policy_digest: policyDigest,
  };
}

export function resolveConstitutionAttestationProfile(
  rawProfile = process.env.EOS_CONSTITUTION_ATTESTATION_PROFILE,
): ConstitutionAttestationProfile {
  switch (rawProfile?.trim()) {
    case undefined:
    case "":
      return "local_signed";
    case "local_signed":
    case "local_unsigned":
    case "production_pending_signature":
    case "cross_org_pending_signature":
      return rawProfile as ConstitutionAttestationProfile;
    default:
      throw new Error(
        `Unsupported attestation profile: ${rawProfile}. Expected local_signed, local_unsigned, production_pending_signature, or cross_org_pending_signature.`,
      );
  }
}

export function materializeConstitutionLawAttestations(
  certificates: readonly ConstitutionLawCertificate[],
  input: {
    readonly profile?: ConstitutionAttestationProfile;
  } = {},
): readonly ConstitutionLawAttestation[] {
  const policy = resolveConstitutionAttestationPolicy(input.profile);

  return certificates.flatMap((certificate) => {
    const attestationIdentity = {
      policy_id: policy.policy_id,
      policy_digest: policy.policy_digest,
      trust_framework_id: policy.trust_framework.framework_id,
      verification_profile_id: policy.trust_framework.verification_profile_id,
      certificate_id: certificate.certificate_id,
      certificate_digest: certificate.certificate_digest,
    };
    const attestationDigest = DigestEngine.digest(attestationIdentity);
    const attestationId = `attestation:${certificate.certificate_id}:${attestationDigest.slice(0, 16)}`;

    const createdPayload = {
      attestation_reference: attestationId,
      event_type: "AttestationCreated" as const,
      event_index: 0,
      occurred_at_utc: null,
      attestation_status: "ACTIVE" as const,
      signature_reference: null,
      ...attestationIdentity,
    };
    const createdDigest = DigestEngine.digest(createdPayload);

    const verifiedSignaturePayload = {
      attestation_reference: attestationId,
      event_type: "AttestationVerified" as const,
      event_index: 1,
      attestation_status: "VERIFIED" as const,
      ...attestationIdentity,
    };
    const signatureReference =
      policy.signature.status === "SIGNED"
        ? materializeLocalTrustSignatureReference({
            certificate_id: certificate.certificate_id,
            attestation_reference: attestationId,
            payload_digest: DigestEngine.digest(verifiedSignaturePayload),
          }).signature_reference
        : null;
    const verifiedPayload = {
      ...verifiedSignaturePayload,
      occurred_at_utc: null,
      signature_reference: signatureReference,
    };
    const verifiedDigest = DigestEngine.digest(verifiedPayload);

    return [
      {
        attestation_id: attestationId,
        event_id: `attestation-event:${attestationId}:${createdDigest.slice(0, 16)}`,
        event_digest: createdDigest,
        ...createdPayload,
        event_boundary:
          "Attestation events form an append-only trust history for a certificate. Created records establish the attestation identity without mutating the immutable certificate.",
      } satisfies ConstitutionLawAttestation,
      {
        attestation_id: attestationId,
        event_id: `attestation-event:${attestationId}:${verifiedDigest.slice(0, 16)}`,
        event_digest: verifiedDigest,
        ...verifiedPayload,
        event_boundary:
          "Attestation events form an append-only trust history for a certificate. Verified records confirm the attestation was validated within the current governance verification boundary without embedding cryptographic signer implementation details into the certificate.",
      } satisfies ConstitutionLawAttestation,
    ];
  });
}

export function materializeConstitutionAttestationTerminalEvent(input: {
  readonly attestationEvents: readonly ConstitutionLawAttestation[];
  readonly eventType: ConstitutionAttestationTerminalEventType;
}): ConstitutionLawAttestation {
  if (input.attestationEvents.length === 0) {
    throw new Error("attestation_terminal_event_requires_existing_stream");
  }

  const sortedEvents = [...input.attestationEvents].sort(
    (left, right) => left.event_index - right.event_index,
  );
  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];

  if (!firstEvent || !lastEvent) {
    throw new Error("attestation_terminal_event_requires_existing_stream");
  }

  if (
    !sortedEvents.some((event) => event.event_type === "AttestationVerified")
  ) {
    throw new Error("attestation_terminal_event_requires_verified_attestation");
  }

  if (
    sortedEvents.some((event) =>
      SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES.includes(
        event.event_type as ConstitutionAttestationTerminalEventType,
      ),
    )
  ) {
    throw new Error("attestation_terminal_event_already_materialized");
  }

  const payload = {
    attestation_reference: firstEvent.attestation_reference,
    event_type: input.eventType,
    event_index: lastEvent.event_index + 1,
    policy_id: firstEvent.policy_id,
    policy_digest: firstEvent.policy_digest,
    trust_framework_id: firstEvent.trust_framework_id,
    verification_profile_id: firstEvent.verification_profile_id,
    certificate_id: firstEvent.certificate_id,
    certificate_digest: firstEvent.certificate_digest,
    occurred_at_utc: null,
    attestation_status: TERMINAL_ATTESTATION_STATUS_BY_EVENT_TYPE[input.eventType],
    signature_reference: null,
  };
  const eventDigest = DigestEngine.digest(payload);

  return {
    attestation_id: firstEvent.attestation_id,
    event_id: `attestation-event:${firstEvent.attestation_id}:${eventDigest.slice(0, 16)}`,
    event_digest: eventDigest,
    ...payload,
    event_boundary: TERMINAL_ATTESTATION_BOUNDARY_BY_EVENT_TYPE[input.eventType],
  };
}

export function materializeConstitutionAttestationPolicy(
  profile: ConstitutionAttestationProfile = "local_signed",
): ConstitutionAttestationPolicy {
  return resolveConstitutionAttestationPolicy(profile);
}
