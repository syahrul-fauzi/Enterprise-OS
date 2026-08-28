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
  // Work Reality Types (existing entities)
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
  // Community & Publication Types (formerly in @repo/presentation-types)
  Member,
  Requirement,
  // Presentation Route Types (formerly in @repo/presentation-types)
  PresentationRoutes,
  CapabilityExperienceRoutes
} from './work-reality/work-reality';

export { WORK_PERSPECTIVES } from './work-reality/work-reality';