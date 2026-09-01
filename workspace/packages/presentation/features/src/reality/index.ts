/**
 * Reality feature building blocks for ALL reality experiences (MyReality, WorkReality, etc.)
 * Follows Presentation Constitution: all components are pure presentation,
 * no business logic, no domain knowledge, only composition of canonical model data.
 * SHARED semantic blocks used by multiple experiences to avoid duplication.
 */

// MyReality-specific reality blocks
export { RealityNow } from "./RealityNow";
export { RealityNext } from "./RealityNext";
export { RealityWatching } from "./RealityWatching";
export { RealityCompanion } from "./RealityCompanion";
export { RealityActivity } from "./RealityActivity";

// WorkReality-specific reality blocks (moved from experience/work-reality/ to share as semantic features)
export { RealityPeople } from "./RealityPeople";
export { RealityCommunication } from "./RealityCommunication";
export { RealityInspection } from "./RealityInspection";
export { RealityCoordination } from "./RealityCoordination";
export { RealityEvidence } from "./RealityEvidence";
export { RealityWorkHeader } from "./RealityWorkHeader";
export { RealityIdentityHeader } from "./RealityIdentityHeader";

// Type exports for all reality features
export type { RealityNowProps } from "./RealityNow";
export type { RealityNextProps } from "./RealityNext";
export type { RealityWatchingProps } from "./RealityWatching";
export type { RealityCompanionProps } from "./RealityCompanion";
export type { RealityActivityProps } from "./RealityActivity";
export type { RealityPeopleProps } from "./RealityPeople";
export type { RealityCommunicationProps } from "./RealityCommunication";
export type { RealityInspectionProps } from "./RealityInspection";
export type { RealityCoordinationProps } from "./RealityCoordination";
export type { RealityEvidenceProps } from "./RealityEvidence";
export type { RealityWorkHeaderProps } from "./RealityWorkHeader";
export type { RealityIdentityHeaderProps } from "./RealityIdentityHeader";