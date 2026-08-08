export type JsonRecord = Record<string, unknown>;
export type JsonArtifact = JsonRecord | readonly JsonRecord[];

export type GovernanceEvidenceArtifactKind =
  | "report"
  | "session"
  | "attestationPolicy"
  | "lawResults"
  | "evidencePackages"
  | "certificates"
  | "attestations"
  | "proofBundle";

export type GovernanceEvidenceArtifactLocation = {
  readonly kind: GovernanceEvidenceArtifactKind;
  readonly path: string;
};

export type GovernanceSession = JsonRecord & {
  readonly session_id: string;
  readonly session_digest: string;
  readonly session_status: "COMPLETED";
};

export interface GovernanceEvidenceArtifactCatalog {
  resolve(
    kind: GovernanceEvidenceArtifactKind,
  ): GovernanceEvidenceArtifactLocation;
}

export interface RuntimeInvocation {
  readonly timestamp_utc: string;
  readonly product_id: string;
  readonly capability_id: string;
  readonly operation_id: string;
  readonly source_ref: string;
  readonly success: boolean;
  readonly input_digest: string;
  readonly result_digest: string;
  readonly invocation_digest: string;
  readonly input: Record<string, unknown>;
  readonly result: Record<string, unknown>;
}

export type AggregatedEvidence = {
  readonly total_invocations: number;
  readonly by_product: Record<string, number>;
  readonly by_capability: Record<string, number>;
  readonly success_rate: number;
  readonly top_operations: Array<{ id: string; count: number }>;
  readonly all_invocations: readonly RuntimeInvocation[];
};

export type GovernanceConfidenceVerdict = {
  readonly capability_id: string;
  readonly owner: string;
  readonly evidence_met: string[];
  readonly evidence_missing: string[];
  readonly confidence_score: number; // 0.0 - 1.0
  readonly decision: "PASS" | "HOLD" | "FAIL";
  readonly rationale: string;
  readonly calculated_at_utc: string;
};

export type CapabilityEvidenceRequirements = {
  readonly capability_id: string;
  readonly owner: string;
  readonly evidence_required: string[];
  readonly consumers: string[];
  readonly maturity_level: string;
};

export interface GovernanceEvidenceProvider {
  getAuditReport(): JsonRecord;
  getGovernanceSession(): GovernanceSession;
  getAttestationPolicy(): JsonRecord;
  getLawResults(): JsonArtifact;
  getEvidencePackages(): JsonArtifact;
  getCertificates(): JsonArtifact;
  getAttestations(): JsonArtifact;
  getProofBundle(): JsonRecord;
  getAggregatedRuntimeEvidence(): AggregatedEvidence;
  loadAllCapabilityMetadata(): CapabilityEvidenceRequirements[];
  calculateCapabilityConfidence(capability: CapabilityEvidenceRequirements): GovernanceConfidenceVerdict;
  getGovernanceDecisions(): GovernanceConfidenceVerdict[];
}