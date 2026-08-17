import type {
  GovernanceEvidenceArtifactKind,
  GovernanceEvidenceProvider,
  JsonArtifact,
  JsonRecord,
} from "../../../governance-evidence/implementation/service.js";
import { governanceEvidenceService } from "../../../governance-evidence/implementation/service.js";

export class GovernanceEvidenceGatewayService {
  constructor(
    private readonly provider: GovernanceEvidenceProvider = governanceEvidenceService,
  ) {}

  getReport(): JsonRecord {
    return this.provider.getAuditReport();
  }

  getGovernanceSession(): JsonRecord {
    return this.provider.getGovernanceSession();
  }

  getAttestationPolicy(): JsonRecord {
    return this.provider.getAttestationPolicy();
  }

  getLawResults(): JsonArtifact {
    return this.provider.getLawResults();
  }

  getEvidencePackages(): JsonArtifact {
    return this.provider.getEvidencePackages();
  }

  getCertificates(): JsonArtifact {
    return this.provider.getCertificates();
  }

  getAttestations(): JsonArtifact {
    return this.provider.getAttestations();
  }

  getProofBundle(): JsonRecord {
    return this.provider.getProofBundle();
  }

  selectArtifact(artifact: GovernanceEvidenceArtifactKind): JsonArtifact {
    switch (artifact) {
      case "report":
        return this.getReport();
      case "session":
        return this.getGovernanceSession();
      case "attestationPolicy":
        return this.getAttestationPolicy();
      case "lawResults":
        return this.getLawResults();
      case "evidencePackages":
        return this.getEvidencePackages();
      case "certificates":
        return this.getCertificates();
      case "attestations":
        return this.getAttestations();
      case "proofBundle":
        return this.getProofBundle();
    }
  }
}

export const governanceEvidenceGatewayService =
  new GovernanceEvidenceGatewayService();
