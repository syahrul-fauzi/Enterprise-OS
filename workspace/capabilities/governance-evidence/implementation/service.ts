export type {
  GovernanceEvidenceArtifactCatalog,
  GovernanceEvidenceArtifactKind,
  GovernanceEvidenceArtifactLocation,
  GovernanceEvidenceProvider,
  JsonArtifact,
  JsonRecord,
} from "./contracts/index.js";
// Canonical governed-delivery-seam exports - B7.11 extraction
export type {
  GovernanceDecisionRecord,
} from "./services/governed-delivery-seam/index.js";
export {
  DeliveryDecisionGatewayService,
} from "./services/governed-delivery-seam/index.js";

export type {
  GovernanceDecisionRecord as LegacyGovernanceDecisionRecord,
} from "./services/governed-delivery-seam/index.js";
export {
  DeliveryDecisionGatewayService as LegacyDeliveryDecisionGatewayService,
} from "./services/governed-delivery-seam/index.js";

export {
  GovernanceEvidenceService,
  governanceEvidenceArtifactCatalog,
  governanceEvidenceService,
} from "./services/governance-evidence.service.js";