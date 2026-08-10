// ============================================================
// Presentation Types — Presentation Layer Boundary (BUKAN Foundation Core Kernel)
// ============================================================
// Sebelum: Semua type di bawah ini berada di @repo/core-kernel (foundation core),
// menyebabkan FPI impurity karena "Experience" dan "Presentation" = consumer surface
// vocabulary yang TIDAK BOLEH berada di foundation engine core.
// Sesudah REPEAT-2 Batch-01 Step 1: Semua type Presentation* dipindahkan KE DALAM
// package presentation layer @repo/presentation-types (@repo = workspace package name
// @repo/presentation-types di bawah packages/presentation/presentation-types).
// Kernel core TIDAK LAGI bergantung pada consumer surface vocabulary.
// Backward compat: CapabilityExperience* types TETAP TERSEDIA sebagai deprecated
// re-export DI LAYER INI (bukan kernel) untuk menjaga tidak adanya broken import
// pada capability experience layer (legal-case / legal-document experience routes).
// ============================================================

// ==============================
// Product Experience Canonical Contracts
// ==============================
// Kontrak standar untuk semua produk yang menggunakan presentation engine.
// Memastikan semua produk mengikuti struktur yang sama sambil tetap memungkinkan
// perbedaan pada nilai-nilai yang spesifik untuk setiap produk.

export interface ProductIdentity {
  readonly productId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
}

export interface ProductAudience {
  readonly primary: string;
  readonly secondary?: readonly string[];
  readonly description: string;
}

export interface ProductPositioning {
  readonly valueTitle: string;
  readonly valueDescription: string;
}

export interface ProductNavigation {
  readonly primaryCta: {
    readonly label: string;
    readonly href: string;
  };
  readonly secondaryCta: {
    readonly label: string;
    readonly href: string;
  };
  readonly tertiaryCta?: {
    readonly label: string;
    readonly href: string;
  };
}

export interface ProductNarrative {
  readonly summary: string;
  readonly journey: readonly string[]; // Langkah-langkah pengalaman pengguna
}

export interface ProductTrustSignal {
  readonly title: string;
  readonly description: string;
  readonly bullets: readonly string[];
}

export interface ProductJourneyStep {
  readonly id: string;
  readonly label: string;
  readonly description: string;
}

export interface ProductTheme {
  readonly primaryColor?: string;
  readonly accentColor?: string;
  readonly brandName?: string;
}

export interface ProductEntry {
  readonly primaryIntent: string;
  readonly primaryActionLabel: string;
  readonly discoveryMode: 'search' | 'role' | 'topic' | 'community';
  readonly audienceChoices?: readonly { label: string; value: string; description: string }[];
  readonly searchPlaceholder?: string;
  readonly categories?: readonly string[];
  readonly topics?: readonly { id: string; label: string; description: string }[];
}

export interface ProductExperience {
  readonly identity: ProductIdentity;
  readonly audience: ProductAudience;
  readonly positioning: ProductPositioning;
  readonly narrative: ProductNarrative;
  readonly navigation: ProductNavigation;
  readonly trustSignals: ProductTrustSignal;
  readonly journeys: readonly ProductJourneyStep[];
  readonly theme: ProductTheme;
  readonly entry: ProductEntry;
  readonly workflow: {
    readonly requirementTitle: string;
    readonly requirementSummary: string;
    readonly createHelper: string;
    readonly updateHelper: string;
    readonly createLabel: string;
    readonly updateLabel: string;
  };
}

// ==============================
// Legacy Presentation Types
// ==============================
export interface PresentationRoutes {
  readonly default?: string;
  readonly paths?: Readonly<Record<string, string>>;
}

export interface PresentationComponents {
  readonly [componentName: string]: unknown;
}

export interface PresentationWorkspaces {
  readonly [workspaceName: string]: unknown;
}

export interface PresentationViews {
  readonly [viewName: string]: unknown;
}

export interface PresentationDescriptor {
  readonly view: unknown;
  readonly components?: PresentationComponents;
  readonly workspaces?: PresentationWorkspaces;
  readonly views?: PresentationViews;
  readonly routes?: PresentationRoutes;
}

/**
 * @deprecated Renamed to PresentationRoutes — backward compatibility alias.
 * Nama ini mengandung consumer-surface vocabulary "Experience".
 * DIPINDAHKAN DARI @repo/core-kernel KE @repo/presentation-types untuk menghapus
 * impurity foundation layer vocabulary coupling (G0.7 FPI improvement).
 * Konsumen baru disarankan menggunakan PresentationRoutes.
 */
export type CapabilityExperienceRoutes = PresentationRoutes;

/**
 * @deprecated Renamed to PresentationComponents — backward compatibility alias.
 */
export type CapabilityExperienceBusinessComponents = PresentationComponents;

/**
 * @deprecated Renamed to PresentationWorkspaces — backward compatibility alias.
 */
export type CapabilityExperienceWorkspaces = PresentationWorkspaces;

/**
 * @deprecated Renamed to PresentationViews — backward compatibility alias.
 */
export type CapabilityExperienceViews = PresentationViews;

/**
 * @deprecated Renamed to PresentationDescriptor — backward compatibility alias.
 */
export type CapabilityExperienceDescriptor = PresentationDescriptor;

// ==============================
// Presentation View DTOs
// ==============================
// Presentation-facing view DTOs. These are DISTINCT from semantic aggregates
// (RequirementAggregate, UserAggregate, MembershipAggregate) in capabilities.
// They describe shape for rendering, not domain contracts.

export type MemberType = 'researcher' | 'institution';

export interface Member {
  readonly id: string;
  readonly name: string;
  readonly type: MemberType;
  readonly affiliation?: string;
  readonly location?: string;
  readonly researchFocus?: string;
  readonly publicationCount?: number;
  readonly researcherCount?: number;
}

export interface Requirement {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly description?: string;
  readonly status: string;
  readonly owner?: string;
  readonly tags?: readonly string[];
  readonly updatedAt?: string | number | Date;
}