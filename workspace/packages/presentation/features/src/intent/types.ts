// Inline type definitions from canonical atomic-composition contract (temporary fix for module resolution)
// Source file: /root/Enterprise-OS/workspace/capabilities/atomic-composition/implementation/contracts/intent-understanding.contracts.ts
// We inline these types here to prevent UI build errors while the project reference build is fixed
export type IntentActorType = "human" | "agent" | "system";
export type IntentSource = {
  actorType: IntentActorType;
  entryPoint: string;
  timestamp: string;
};
export type IntentContext = {
  domain?: string;
  organization?: string;
  locale?: string;
  known?: string[];
  unknown?: string[];
  constraints?: string[];
};
export type DomainCandidate = {
  domain: string;
  confidence: number;
};
export type ExtractedEntity = {
  type: string;
  role: string;
  value: string;
};
export type IntentUnderstanding = {
  rawExpression: string;
  interpretedObjective: string;
  context: IntentContext;
  domainCandidates: DomainCandidate[];
  intentType: string;
  entities: ExtractedEntity[];
  unknowns: string[];
  clarificationRequired: boolean;
};
export type IntentResolution = {
  objective: string;
  expectedOutcome: string;
  context: string;
  workType: string;
  confidence: number;
  suggestedCapabilities?: string[];
  dynamicUnderstanding?: IntentUnderstanding;
};
export type IntentContract = {
  id: string;
  expression: string;
  source: IntentSource;
  context?: IntentContext;
  resolution: IntentResolution;
  dynamicUnderstanding?: IntentUnderstanding;
};
// Re-export base identity types from existing project import to maintain type safety
import type { IntentCategory, IntentRawInput } from "@repo/capabilities-identity";
export type { IntentCategory, IntentRawInput };

// Keep only what's needed below this point - removed duplicate inline definitions that were already declared above

export type FormationConfirmation = {
  intentId: string; // Unique identifier for the intent contract
  workId: string; // Unique identifier of the created canonical Work
  formedAt: string; // ISO timestamp when work was formed
  formedInto: string; // Reference to the work type/resource that was created
  originTrace: {
    intentId: string;
    source: string;
    entryPoint: string;
  }; // F14/F15 compliance - provenance tracking for intent→work
};

export type IntentRefinementPageProps = {
  readonly intentId: string;
  readonly onBack?: () => void;
  readonly customCtaLabel?: string;
  readonly customCtaHref?: (intentId: string) => string;
};

export type WorkFormationButtonProps = {
  /** The intent contract to create work from */
  intent: IntentContract;
  /** Optional intent ID (derived from intent if not provided) */
  intentId?: string;
  /** Button text customization */
  buttonText?: string;
  /** Optional className for styling */
  className?: string;
  /** Optional callback when work creation starts */
  onCreationStart?: () => void;
  /** Optional callback when work creation fails */
  onCreationError?: (error: Error) => void;
  /** Optional custom API endpoint (defaults to canonical /api/work/create) */
  apiEndpoint?: string;
};