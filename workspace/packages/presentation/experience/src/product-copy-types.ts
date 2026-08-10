import type { ProductExperience as CanonicalProductExperience } from "@repo/presentation-types";

export interface ProductLandingSection {
  readonly id?: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly bullets: readonly string[];
}

export interface ProductWorkflowCopy {
  readonly badgeLabel: string;
  readonly title: string;
  readonly description: string;
  readonly titleLabel: string;
  readonly titlePlaceholder: string;
  readonly ownerLabel: string;
  readonly ownerPlaceholder: string;
  readonly summaryLabel: string;
  readonly summaryPlaceholder: string;
  readonly successLabel: string;
  readonly successPlaceholder: string;
  readonly createHelper: string;
  readonly updateHelper: string;
  readonly createLabel: string;
  readonly updateLabel: string;
  readonly searchPlaceholder: string;
  readonly emptyTitle: string;
  readonly emptyDescription: string;
  readonly totalLabel: string;
  readonly matchedLabel: string;
  readonly verifiedLabel: string;
  readonly activeLabel: string;
  readonly capabilityIds: readonly string[];
  readonly defaultSuccessCriteria: readonly string[];
}

export interface ProductCardCopy {
  readonly verificationLabel: string;
  readonly ownerLabel: string;
  readonly successLabel: string;
  readonly referenceLabel: string;
  readonly readyLabel: string;
  readonly statusLabels: Partial<Record<string, string>>;
  readonly actionLabels: Partial<Record<string, string>>;
  readonly showCapabilityIds: boolean;
}

export interface ProductDeliveryCopy {
  readonly requirementCountLabel: string;
  readonly artifactCountLabel: string;
  readonly evidenceCountLabel: string;
  readonly inProgressLabel: string;
  readonly completedLabel: string;
  readonly blockedLabel: string;
}

export type { CanonicalProductExperience as ProductExperience };