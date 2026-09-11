// Export semua tipe gabungan (work-reality + product experience yang dulunya presentation-types)
export type {
  // Product Experience Types (formerly in @repo/presentation-types)
  ProductIdentity,
  ProductAudience,
  ProductPositioning,
  ProductNavigation,
  ProductNarrative,
  ProductTrustSignal,
  ProductJourneyStep,
  ProductTheme,
  ProductEntry,
  ProductExperience,
  // Work Reality View Contracts (new formalized sub-views with canonical sources)
  WorkIdentityView,
  WorkStateView,
  WorkParticipantView,
  CommunicationEventView,
  WorkInspectionView,
  WorkCoordinationActionView,
  EvidenceArtifactView,
  ActivityEntryView,
  // Work Reality Core Types (composition root + legacy types)
  WorkRealityModel,
  WorkRealityPerspective,
  WorkIdentity,
  WorkState,
  WorkParticipant,
  CommunicationEvent,
  WorkInspection,
  WorkCoordinationAction,
  EvidenceArtifact,
  ActivityEntry,
  // R9 - My Reality Model Types (new for human reality proof)
  MyRealityModel,
  RealityWorkItem,
  PlatformReference,
  CompanionInsight,
  PlatformDistribution,
  // Community & Publication Types (formerly in @repo/presentation-types)
  Member,
  Requirement,
  // Presentation Route Types (formerly in @repo/presentation-types)
  PresentationRoutes,
  CapabilityExperienceRoutes
} from './work-reality/work-reality.js';

export { WORK_PERSPECTIVES } from './work-reality/work-reality.js';