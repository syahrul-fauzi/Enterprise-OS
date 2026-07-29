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
