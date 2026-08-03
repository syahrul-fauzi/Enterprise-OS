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

export interface GovernanceEvidenceProvider {
  getAuditReport(): JsonRecord;
  getGovernanceSession(): GovernanceSession;
  getAttestationPolicy(): JsonRecord;
  getLawResults(): JsonArtifact;
  getEvidencePackages(): JsonArtifact;
  getCertificates(): JsonArtifact;
  getAttestations(): JsonArtifact;
  getProofBundle(): JsonRecord;
}
