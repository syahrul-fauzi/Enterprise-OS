/**
 * Work Reality Surface Barrel File
 * Expose semua komponen atomic dan type contract untuk WorkRealitySurface
 * Single entry point untuk semua yang membutuhkan Work Reality components
 * Reusable oleh SEMUA domain: LawyersHub, ILC, Services.ID
 */

// Core surface component
export { WorkRealitySurface } from './WorkRealitySurface';

// Atomic sub-components
export { WorkSection } from './WorkSection';
export { NowSection } from './NowSection';
export { NextSection } from './NextSection';
export { PeopleSection } from './PeopleSection';
export { CommunicationSection } from './CommunicationSection';
export { InspectionSection } from './InspectionSection';
export { CoordinationSection } from './CoordinationSection';
export { EvidenceSection } from './EvidenceSection';
export { ActivitySection } from './ActivitySection';
export { WorkRealityHeader } from './WorkRealityHeader';

// Type contracts
export type {
  WorkRealityModel,
  WorkRealityPerspective,
  WorkIdentity,
  WorkState,
  WorkParticipant,
  CommunicationEvent,
  WorkInspection,
  WorkCoordinationAction,
  EvidenceArtifact,
  ActivityEntry
} from '@repo/presentation-entities';