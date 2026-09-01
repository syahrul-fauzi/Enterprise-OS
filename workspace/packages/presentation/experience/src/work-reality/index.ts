/**
 * Work Reality Surface Barrel File
 * Expose semua komponen atomic dan type contract untuk WorkRealitySurface
 * Single entry point untuk semua yang membutuhkan Work Reality components
 * Reusable oleh SEMUA domain: LawyersHub, ILC, Services.ID
 *
 * ARCHITECTURAL BOUNDARY (MyReality golden pattern):
 * Experience = composition only, Controller = runtime/client state, Features = semantic blocks
 * presentation-only — NO ontology redefinition, NO runtime reality reconstruction
 */

// Core experience components (follows MyReality golden pattern)
export { WorkRealityExperience } from './WorkRealityExperience';
export { useWorkRealityController } from './WorkRealityController';

// Surface component (legacy composition layer - will be deprecated)
export { WorkRealitySurface } from './WorkRealitySurface';

// All atomic sub-components now moved to @repo/presentation-features (follows MyReality golden pattern)
// All atomic reality components (RealityNow, RealityActivity, etc.) are now imported directly from @repo/presentation-features
// New code should never use the legacy local component files - they have been fully migrated to features package

// Legacy re-export for backward compatibility only - new code uses WorkRealityExperience directly
export { WorkRealityExperience as WorkSection } from './WorkRealityExperience';

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