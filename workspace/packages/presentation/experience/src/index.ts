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
export { readProductBinding } from './product-binding';
export { readProductContextFromRequest, applyProductContextHeaders } from './product-context';
export { getAllProductSlugs, getAllProductExperiences } from './catalog';

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
export type { ProductPreviewBinding } from './product-binding';
export type {
  ProductLandingSection,
  ProductWorkflowCopy,
  ProductCardCopy,
  ProductDeliveryCopy,
} from './product-copy-types';
export type { ProductContext } from './product-context';