// IntentContract type definitions - canonical protocol boundary for EOS FACE Formation lifecycle
// Implements the minimal contract specified in EOS-FACE-FORMATION-001
// type IntentContract = { 
//   expression: string; 
//   source: { actorType: "human" | "agent" | "system"; entryPoint: string }; 
//   context?: { domain?: string; organization?: string; locale?: string } 
// };

export type IntentActorType = "human" | "agent" | "system";

export type IntentSource = {
  actorType: IntentActorType;
  entryPoint: string; // e.g., "eos-face", "lawyershub", "ilc", "servicesid"
  timestamp: string; // ISO 8601 timestamp when intent was captured
};

export type IntentContext = {
  domain?: string; // e.g., "legal", "immigration", "corporate"
  organization?: string; // Tenant/company ID if applicable
  locale?: string; // e.g., "id-ID", "en-US" for localization
};

export type IntentResolution = {
  objective: string; // Clear, actionable objective extracted from expression
  expectedOutcome: string; // What success looks like for this intent
  context: string; // Domain/context classification
  workType: string; // Canonical work type identifier (e.g., "pt-establishment")
  confidence: number; // 0.0 to 1.0 - confidence in resolution accuracy
  suggestedCapabilities?: string[]; // Capabilities that may be required for this work
};

export type IntentContract = {
  id: string; // Unique identifier for the intent contract - required for FormationConfirmation provenance
  expression: string; // Raw user input/need
  source: IntentSource;
  context?: IntentContext;
  resolution: IntentResolution; // Resolved semantic understanding of the intent
};

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