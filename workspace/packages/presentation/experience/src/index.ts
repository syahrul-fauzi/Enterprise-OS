// ============================================================
// Product Experience Layer — Canonical Source of Truth for all product experiences
// ============================================================
// Layer ini mendefinisikan semua pengalaman produk yang menggunakan presentation engine.
// Semua produk (Services.ID, LawyersHub, ILC) didefinisikan di sini dengan kontrak
// ProductExperience yang sama, sehingga apps/web hanya perlu menjadi renderer
// yang menerima satu object experience tanpa perlu logic kondisional per produk.

export { servicesId } from './services-id';
export { lawyershub } from './lawyershub';
export { ilc } from './ilc';
export { academic } from './academic';
export { commsme } from './commsme';
export { getProductExperience, catalog, readProductRouteMetadata } from './catalog';
export { readProductContextFromRequest, applyProductContextHeaders } from './product-context';
export { getAllProductSlugs, getAllProductExperiences } from './catalog';

// Core EOS Work Reality Surface - reusable across all products (gunakan barrel dari ./work-reality)
export { 
  WorkRealitySurface,
  WorkRealityHeader,
  WorkSection,
  NowSection,
  NextSection,
  PeopleSection,
  CommunicationSection,
  InspectionSection,
  CoordinationSection,
  EvidenceSection
} from './work-reality';

// Type contracts for Work Reality (juga dari barrel)
export type {
  WorkIdentity,
  WorkState,
  WorkParticipant,
  CommunicationEvent as WorkCommunicationEvent,
  WorkInspection,
  WorkCoordinationAction,
  EvidenceArtifact,
  WorkRealityModel,
  WorkRealityPerspective
} from '@repo/presentation-entities';

export { WORK_PERSPECTIVES } from '@repo/presentation-entities';

// ============================================================================
// SERVER-ONLY BOUNDARY - readProductBinding excluded from shared barrel
// ============================================================================
// readProductBinding uses node:fs (readFileSync, existsSync) and node:path
// to load product.binding.yaml manifests from disk. It is strictly a server
// primitive. Including its VALUE export in this shared barrel forces every
// consumer — including browser client components (e.g. InstitutionPage.tsx
// marked "use client" that imports getProductExperience from this barrel) —
// to pull node:fs / node:path into their bundle, which Next.js Webpack
// rejects with UnhandledSchemeError.
//
// Server-side pages/routes/scripts that need file-bound manifests MUST import
// the primitive directly:
//   import { readProductBinding } from "@repo/presentation-experience/product-binding.js";
// ============================================================================
export type { ProductPreviewBinding } from './product-binding';

export type {
  ProductExperience,
  ProductIdentity,
  ProductAudience,
  ProductPositioning,
  ProductNavigation,
  ProductNarrative,
  ProductTrustSignal,
  ProductJourneyStep,
  ProductTheme,
} from '@repo/presentation-entities';
export type {
  ProductLandingSection,
  ProductWorkflowCopy,
  ProductCardCopy,
  ProductDeliveryCopy,
} from './product-copy-types';
export type { ProductContext } from './product-context';