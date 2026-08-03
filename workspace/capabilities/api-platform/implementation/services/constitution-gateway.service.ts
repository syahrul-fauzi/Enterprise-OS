import type {
  ConstitutionArtifactSelector,
  ConstitutionPresentationArtifactSelector,
} from "../contracts";
import type {
  JsonArtifact,
  JsonRecord,
} from "../../../governance-evidence/implementation/service";
import {
  governanceEvidenceGatewayService,
  GovernanceEvidenceGatewayService,
} from "./governance-evidence-gateway.service";
import {
  governanceReadGatewayService,
  GovernanceReadGatewayService,
} from "./governance-read-gateway.service";

export class ConstitutionGatewayService {
  constructor(
    private readonly readGateway: GovernanceReadGatewayService = governanceReadGatewayService,
    private readonly evidenceGateway: GovernanceEvidenceGatewayService = governanceEvidenceGatewayService,
  ) {}

  getReport(): JsonRecord {
    return this.evidenceGateway.getReport();
  }

  getClaims(): JsonRecord {
    return this.readGateway.getClaims();
  }

  getLawResults(): JsonArtifact {
    return this.evidenceGateway.getLawResults();
  }

  getEvidencePackages(): JsonArtifact {
    return this.evidenceGateway.getEvidencePackages();
  }

  getAttestationPolicy(): JsonRecord {
    return this.evidenceGateway.getAttestationPolicy();
  }

  getCertificates(): JsonArtifact {
    return this.evidenceGateway.getCertificates();
  }

  getAttestations(): JsonArtifact {
    return this.evidenceGateway.getAttestations();
  }

  getSummary(): JsonRecord {
    return this.readGateway.getSummary();
  }

  getProofBundle(): JsonRecord {
    return this.evidenceGateway.getProofBundle();
  }

  selectArtifact(artifact: ConstitutionArtifactSelector): JsonArtifact {
    return this.evidenceGateway.selectArtifact(artifact);
  }

  selectPresentationArtifact(
    artifact: ConstitutionPresentationArtifactSelector,
  ): JsonArtifact {
    return this.readGateway.selectReadModel(artifact);
  }
}

export const constitutionGatewayService = new ConstitutionGatewayService();
