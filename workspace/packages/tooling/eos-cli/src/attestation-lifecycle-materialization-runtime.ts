// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine.js";
import {
  materializeConstitutionAttestationTerminalEvent,
  type ConstitutionAttestationTerminalEventType,
  type ConstitutionLawAttestation,
  SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES,
} from "./attestation-runtime.js";

const TERMINAL_EVENT_TYPES =
  SUPPORTED_CONSTITUTION_TERMINAL_ATTESTATION_EVENT_TYPES;

const EXPECTED_STATUS_BY_EVENT_TYPE: Record<
  ConstitutionAttestationTerminalEventType,
  ConstitutionLawAttestation["attestation_status"]
> = {
  AttestationExpired: "EXPIRED",
  AttestationRevoked: "REVOKED",
  AttestationSuperseded: "SUPERSEDED",
};

export type AttestationLifecycleMaterializationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly eligible_attestation_count: number;
    readonly terminal_transition_sample_count: number;
    readonly terminal_transition_coverage_status: "PASS" | "FAIL";
    readonly terminal_transition_integrity_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly samples: readonly {
    readonly transition_type: ConstitutionAttestationTerminalEventType;
    readonly attestation_reference: string;
    readonly prior_event_count: number;
    readonly materialized_event_index: number;
    readonly materialized_attestation_status:
      | "EXPIRED"
      | "REVOKED"
      | "SUPERSEDED";
    readonly signature_reference: null;
    readonly transition_integrity_status: "PASS" | "FAIL";
    readonly event_digest: string;
  }[];
  readonly claim_boundary: string;
};

type AttestationLifecycleMaterializationSample =
  AttestationLifecycleMaterializationReport["samples"][number];

function groupAttestationsByReference(
  attestations: readonly ConstitutionLawAttestation[],
): readonly (readonly ConstitutionLawAttestation[])[] {
  const byReference = new Map<string, ConstitutionLawAttestation[]>();

  for (const attestation of attestations) {
    const current = byReference.get(attestation.attestation_reference) ?? [];
    current.push(attestation);
    byReference.set(attestation.attestation_reference, current);
  }

  return Array.from(byReference.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, events]) =>
      [...events].sort((left, right) => left.event_index - right.event_index),
    );
}

export function materializeAttestationLifecycleMaterializationReport(
  attestations: readonly ConstitutionLawAttestation[],
): AttestationLifecycleMaterializationReport {
  const eligibleStreams = groupAttestationsByReference(attestations).filter((events) =>
    events.some((event) => event.event_type === "AttestationVerified"),
  );

  const samples = TERMINAL_EVENT_TYPES.map((eventType, index) => {
    const sourceStream = eligibleStreams[index] ?? null;
    if (!sourceStream) {
      return null;
    }

    const materializedEvent = materializeConstitutionAttestationTerminalEvent({
      attestationEvents: sourceStream,
      eventType,
    });
    const lastEvent = sourceStream[sourceStream.length - 1];
    const transitionIntegrityStatus =
      lastEvent &&
      materializedEvent.event_index === lastEvent.event_index + 1 &&
      materializedEvent.attestation_reference ===
        sourceStream[0]?.attestation_reference &&
      materializedEvent.attestation_status === EXPECTED_STATUS_BY_EVENT_TYPE[eventType] &&
      materializedEvent.signature_reference === null
        ? ("PASS" as const)
        : ("FAIL" as const);

    return {
      transition_type: eventType,
      attestation_reference: materializedEvent.attestation_reference,
      prior_event_count: sourceStream.length,
      materialized_event_index: materializedEvent.event_index,
      materialized_attestation_status:
        materializedEvent.attestation_status as AttestationLifecycleMaterializationSample["materialized_attestation_status"],
      signature_reference: null,
      transition_integrity_status: transitionIntegrityStatus,
      event_digest: materializedEvent.event_digest,
    } satisfies AttestationLifecycleMaterializationSample;
  }).filter(
    (
      sample,
    ): sample is AttestationLifecycleMaterializationSample => sample !== null,
  );

  const terminalTransitionCoverageStatus =
    samples.length === TERMINAL_EVENT_TYPES.length
      ? ("PASS" as const)
      : ("FAIL" as const);
  const terminalTransitionIntegrityStatus = samples.every(
    (sample) => sample.transition_integrity_status === "PASS",
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const summary = {
    eligible_attestation_count: eligibleStreams.length,
    terminal_transition_sample_count: samples.length,
    terminal_transition_coverage_status: terminalTransitionCoverageStatus,
    terminal_transition_integrity_status: terminalTransitionIntegrityStatus,
    overall_status:
      terminalTransitionCoverageStatus === "PASS" &&
      terminalTransitionIntegrityStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const payload = {
    summary,
    samples,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Attestation lifecycle materialization proves that terminal trust events can be materialized deterministically from an existing verified attestation stream. It operationalizes Expired, Revoked, and Superseded transitions without refactoring the governance core model.",
  };
}
