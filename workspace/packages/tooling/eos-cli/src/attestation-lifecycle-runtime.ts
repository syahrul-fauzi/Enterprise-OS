// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import {
  SUPPORTED_CONSTITUTION_ATTESTATION_EVENT_TYPES,
  type ConstitutionAttestationEventType,
  type ConstitutionLawAttestation,
} from "./attestation-runtime.js";

const REQUIRED_ATTESTATION_LIFECYCLE_EVENT_TYPES = [
  "AttestationCreated",
  "AttestationVerified",
  "AttestationExpired",
  "AttestationRevoked",
  "AttestationSuperseded",
] as const satisfies readonly ConstitutionAttestationEventType[];

const TERMINAL_ATTESTATION_EVENT_TYPES = [
  "AttestationExpired",
  "AttestationRevoked",
  "AttestationSuperseded",
] as const satisfies readonly ConstitutionAttestationEventType[];

const EVENT_STATUS_BY_TYPE: Record<
  ConstitutionAttestationEventType,
  ConstitutionLawAttestation["attestation_status"]
> = {
  AttestationCreated: "ACTIVE",
  AttestationVerified: "VERIFIED",
  AttestationExpired: "EXPIRED",
  AttestationRevoked: "REVOKED",
  AttestationSuperseded: "SUPERSEDED",
};

export type AttestationLifecycleVerificationReport = {
  readonly report_version: "1.0.0";
  readonly report_digest: string;
  readonly summary: {
    readonly lifecycle_vocabulary_status: "PASS" | "FAIL";
    readonly append_only_status: "PASS" | "FAIL";
    readonly transition_integrity_status: "PASS" | "FAIL";
    readonly terminal_event_readiness_status: "PASS" | "FAIL";
    readonly overall_status: "PASS" | "FAIL";
  };
  readonly stream: {
    readonly attestation_count: number;
    readonly event_count: number;
    readonly observed_event_types: readonly ConstitutionAttestationEventType[];
    readonly supported_event_types: readonly ConstitutionAttestationEventType[];
    readonly missing_supported_event_types: readonly ConstitutionAttestationEventType[];
    readonly attestation_with_created_count: number;
    readonly attestation_with_verified_count: number;
    readonly attestation_with_terminal_event_count: number;
    readonly append_only_sequence_violations: number;
    readonly duplicate_event_index_violations: number;
    readonly transition_integrity_violations: number;
  };
  readonly attestations: readonly {
    readonly attestation_reference: string;
    readonly event_count: number;
    readonly event_types: readonly ConstitutionAttestationEventType[];
    readonly terminal_event_type:
      | "AttestationExpired"
      | "AttestationRevoked"
      | "AttestationSuperseded"
      | null;
    readonly append_only_status: "PASS" | "FAIL";
    readonly transition_integrity_status: "PASS" | "FAIL";
  }[];
  readonly claim_boundary: string;
};

type TerminalAttestationEventType =
  (typeof TERMINAL_ATTESTATION_EVENT_TYPES)[number];

function isTerminalEventType(
  eventType: ConstitutionAttestationEventType,
): eventType is (typeof TERMINAL_ATTESTATION_EVENT_TYPES)[number] {
  return TERMINAL_ATTESTATION_EVENT_TYPES.includes(
    eventType as (typeof TERMINAL_ATTESTATION_EVENT_TYPES)[number],
  );
}

export function materializeAttestationLifecycleVerificationReport(
  attestations: readonly ConstitutionLawAttestation[],
): AttestationLifecycleVerificationReport {
  const byReference = new Map<string, ConstitutionLawAttestation[]>();

  for (const attestation of attestations) {
    const current = byReference.get(attestation.attestation_reference) ?? [];
    current.push(attestation);
    byReference.set(attestation.attestation_reference, current);
  }

  let appendOnlySequenceViolations = 0;
  let duplicateEventIndexViolations = 0;
  let transitionIntegrityViolations = 0;

  const attestationDetails = Array.from(byReference.entries())
    .map(([attestationReference, events]) => {
      const sortedEvents = [...events].sort(
        (left, right) => left.event_index - right.event_index,
      );
      const duplicateEventIndexCount =
        sortedEvents.length - new Set(sortedEvents.map((event) => event.event_index)).size;
      const contiguousIndexes = sortedEvents.every(
        (event, index) => event.event_index === index,
      );
      const firstEvent = sortedEvents[0];
      const createdCount = sortedEvents.filter(
        (event) => event.event_type === "AttestationCreated",
      ).length;
      const verifiedCount = sortedEvents.filter(
        (event) => event.event_type === "AttestationVerified",
      ).length;
      const terminalEvents = sortedEvents.filter((event) =>
        isTerminalEventType(event.event_type),
      );
      const terminalEventTypes = terminalEvents
        .map((event) => event.event_type)
        .filter(isTerminalEventType);
      const terminalEvent: TerminalAttestationEventType | null =
        terminalEventTypes.length > 0
          ? terminalEventTypes[terminalEventTypes.length - 1] ?? null
          : null;
      const terminalEventIsLast =
        terminalEvents.length === 0 ||
        sortedEvents[sortedEvents.length - 1]?.event_type === terminalEvent;
      const statusIntegrity = sortedEvents.every(
        (event) => EVENT_STATUS_BY_TYPE[event.event_type] === event.attestation_status,
      );
      const transitionIntegrity =
        createdCount === 1 &&
        verifiedCount <= 1 &&
        firstEvent?.event_type === "AttestationCreated" &&
        contiguousIndexes &&
        duplicateEventIndexCount === 0 &&
        terminalEvents.length <= 1 &&
        terminalEventIsLast &&
        statusIntegrity;

      if (!contiguousIndexes) {
        appendOnlySequenceViolations += 1;
      }
      if (duplicateEventIndexCount > 0) {
        duplicateEventIndexViolations += 1;
      }
      if (!transitionIntegrity) {
        transitionIntegrityViolations += 1;
      }

      return {
        attestation_reference: attestationReference,
        event_count: sortedEvents.length,
        event_types: sortedEvents.map((event) => event.event_type),
        terminal_event_type: terminalEvent as TerminalAttestationEventType | null,
        append_only_status:
          contiguousIndexes && duplicateEventIndexCount === 0
            ? ("PASS" as const)
            : ("FAIL" as const),
        transition_integrity_status: transitionIntegrity
          ? ("PASS" as const)
          : ("FAIL" as const),
      };
    })
    .sort((left, right) =>
      left.attestation_reference.localeCompare(right.attestation_reference),
    );

  const observedEventTypes = Array.from(
    new Set(attestations.map((attestation) => attestation.event_type)),
  ).sort() as ConstitutionAttestationEventType[];
  const supportedEventTypes = [...SUPPORTED_CONSTITUTION_ATTESTATION_EVENT_TYPES];
  const missingSupportedEventTypes = REQUIRED_ATTESTATION_LIFECYCLE_EVENT_TYPES.filter(
    (eventType) => !supportedEventTypes.includes(eventType),
  );
  const lifecycleVocabularyStatus =
    missingSupportedEventTypes.length === 0 ? ("PASS" as const) : ("FAIL" as const);
  const appendOnlyStatus =
    appendOnlySequenceViolations === 0 && duplicateEventIndexViolations === 0
      ? ("PASS" as const)
      : ("FAIL" as const);
  const transitionIntegrityStatus =
    transitionIntegrityViolations === 0 ? ("PASS" as const) : ("FAIL" as const);
  const terminalEventReadinessStatus = TERMINAL_ATTESTATION_EVENT_TYPES.every(
    (eventType) => supportedEventTypes.includes(eventType),
  )
    ? ("PASS" as const)
    : ("FAIL" as const);
  const stream = {
    attestation_count: attestationDetails.length,
    event_count: attestations.length,
    observed_event_types: observedEventTypes,
    supported_event_types: supportedEventTypes,
    missing_supported_event_types: missingSupportedEventTypes,
    attestation_with_created_count: attestationDetails.filter((attestation) =>
      attestation.event_types.includes("AttestationCreated"),
    ).length,
    attestation_with_verified_count: attestationDetails.filter((attestation) =>
      attestation.event_types.includes("AttestationVerified"),
    ).length,
    attestation_with_terminal_event_count: attestationDetails.filter(
      (attestation) => attestation.terminal_event_type !== null,
    ).length,
    append_only_sequence_violations: appendOnlySequenceViolations,
    duplicate_event_index_violations: duplicateEventIndexViolations,
    transition_integrity_violations: transitionIntegrityViolations,
  };
  const summary = {
    lifecycle_vocabulary_status: lifecycleVocabularyStatus,
    append_only_status: appendOnlyStatus,
    transition_integrity_status: transitionIntegrityStatus,
    terminal_event_readiness_status: terminalEventReadinessStatus,
    overall_status:
      lifecycleVocabularyStatus === "PASS" &&
      appendOnlyStatus === "PASS" &&
      transitionIntegrityStatus === "PASS" &&
      terminalEventReadinessStatus === "PASS"
        ? ("PASS" as const)
        : ("FAIL" as const),
  };
  const payload = {
    summary,
    stream,
    attestations: attestationDetails,
  };

  return {
    report_version: "1.0.0",
    report_digest: DigestEngine.digest(payload),
    ...payload,
    claim_boundary:
      "Attestation lifecycle verification proves that trust attestations are governed as an append-only event stream with stable lifecycle vocabulary and ordered transitions. It hardens provenance and trust operations without changing certificate identity or the core governance domain model.",
  };
}
