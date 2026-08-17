// ============================================================
// Product Experience Layer — Canonical Source of Truth for all product experiences
// ============================================================
// Layer ini mendefinisikan semua pengalaman produk yang menggunakan presentation engine.
// Semua produk (Services.ID, LawyersHub, ILC) didefinisikan di sini dengan kontrak
// ProductExperience yang sama, sehingga apps/web hanya perlu menjadi renderer
// yang menerima satu object experience tanpa perlu logic kondisional per produk.

export { servicesId } from './services-id';
export { lawyershub } from './lawyershub.js';
export { ilc } from './ilc.js';
export { academic } from './academic.js';
export { commsme } from './commsme.js';
export { getProductExperience, catalog, readProductRouteMetadata } from './catalog.js';
export { readProductBinding } from './product-binding.js';
export { readProductContextFromRequest, applyProductContextHeaders } from './product-context.js';
export { getAllProductSlugs, getAllProductExperiences } from './catalog.js';

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
} from '@repo/presentation-types';
export type { ProductPreviewBinding } from './product-binding.js';
export type {
  ProductLandingSection,
  ProductWorkflowCopy,
  ProductCardCopy,
  ProductDeliveryCopy,
} from './product-copy-types.js';
export type { ProductContext } from './product-context.js';