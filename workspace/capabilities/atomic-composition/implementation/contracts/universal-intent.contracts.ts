// UniversalExpressionContract - E02-UNIVERSAL-UNDERSTANDING-PIPELINE: Canonical contract for ALL inputs into EOS
// This is the single-source-of-truth for capturing ANY origin of expression/signal/event into EOS
// Implements the new architecture: Expression → Understanding → IntentHypothesis → Need → Resolution → Work
// Extends the existing intent-understanding.contracts.ts to support universal intake

// Import base types from existing contracts to avoid duplication
import { IntentUnderstanding, ExtractedEntity, DomainCandidate } from "./intent-understanding.contracts";

// ExpressionOrigin - Supported sources of any input into EOS (matches user's definition)
export type ExpressionOrigin =
  | "human"           // Human actor (customer, lawyer, admin, etc.)
  | "ai_agent"        // AI agent (internal or external)
  | "machine"         // Machine/sensor/automated process
  | "external_system" // Third-party API, webhook, partner system
  | "internal_eos";   // Internal EOS system (work detected problem, deadline reached, etc.)

// RawContentType - Supported types of raw content that can be captured (per user's definition)
export type RawContentType =
  | "expression"  // Natural language from human
  | "request"     // Structured request from system/agent
  | "signal"      // Machine/sensor signal
  | "event";      // External/internal event

// UnderstandingEventType - Types of events that occur during understanding lifecycle
export type UnderstandingEventType =
  | "expression_received"    // Raw expression entered the system
  | "understanding_started"  // Understanding engine started processing
  | "understanding_updated"  // Understanding state was updated (new info added)
  | "understanding_delta"    // Delta change from conversation/consultation
  | "capability_invoked"     // A capability was started to improve understanding
  | "consultation_started"   // Consultation with AI/human expert started
  | "consultation_completed" // Consultation finished
  | "conversation_turn"      // New conversation turn added
  | "hypothesis_confirmed"   // Intent hypothesis reached high confidence
  | "hypothesis_rejected"    // Intent hypothesis was invalidated
  | "sufficiency_achieved"   // Understanding is sufficient to form intent/need
  | "resolution_started"     // Entered resolution phase (sufficient understanding)
  | "work_formed"            // Work was successfully created from confirmed need
  | "work_formation_failed"; // Work creation failed

// ExpressionStatus - Lifecycle states for universal expression (NEW ARCHITECTURE)
// Matches user's flow: RECEIVED → UNDERSTANDING → SUFFICIENT/INSUFFICIENT → RESOLVE/CONTINUE
export type ExpressionStatus =
  | "RECEIVED"               // Just entered the system, initial state
  | "CAPTURED"               // Raw expression successfully persisted
  | "UNDERSTANDING"          // Understanding engine is processing the expression
  | "UNDERSTANDING_INSUFFICIENT" // Not enough info to understand fully
  | "UNDERSTANDING_SUFFICIENT"   // Sufficient understanding achieved
  | "RESOLVING"              // In resolution phase - forming work/intent
  | "RESOLVED"               // All gaps resolved, need is formalized
  | "WORK_FORMED"            // Work was successfully created
  | "FAILED";                // Failed to process/resolve

// UnderstandingEvent - Audit trail event for the entire understanding lifecycle
export interface UnderstandingEvent {
  timestamp: Date;
  type: UnderstandingEventType;
  actorId?: string; // Actor who triggered this event (if applicable)
  changes: Partial<UniversalExpression>; // Changes made to expression in this step
  delta?: Record<string, unknown>; // Specific delta from this interaction (what changed)
  notes?: string; // Additional context for the event
}

// IntentHypothesis - The core hypothesis EOS forms about what the user wants
// Per user's requirement: hypothesis is formed, not assumed. Can be confirmed/rejected
export interface IntentHypothesis {
  id: string;
  hypothesis: string; // Natural language statement of what EOS thinks the user wants
  confidence: number; // 0.0 to 1.0 confidence score
  status: "proposed" | "confirmed" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  evidence: string[]; // List of evidence supporting this hypothesis
  domainCandidates: DomainCandidate[]; // Domain candidates for this hypothesis (replaces hardcoded domain checks)
  canFormWork: boolean; // Whether this hypothesis is sufficient to form a Work
}

// UnderstandingState - Current state of understanding (per user's definition)
export interface UnderstandingState {
  known: string[]; // List of what is known for certain
  unknown: string[]; // List of what is unknown and needs clarification
  goal?: string; // The current understood goal (if any)
  problem?: string; // The current understood problem (if any)
  confidence: number; // Overall understanding confidence
  isSufficient: boolean; // Whether understanding is sufficient to proceed
  sufficiencyReason?: string; // Why it is/isn't sufficient
}

// UnderstandingRequirement - What's needed to improve insufficient understanding
export interface UnderstandingRequirement {
  required: boolean; // Whether interaction is needed at all
  reason?: string; // Why understanding is insufficient
  requiredCapabilities: string[]; // List of capabilities that can help (conversation, consultant, etc.)
  suggestedProviders: string[]; // List of suggested providers for those capabilities
  suggestedQuestions: string[]; // Questions to ask the user to improve understanding
}

// RawContent - Container for any type of raw input into EOS
export interface RawContent {
  type: RawContentType;
  content: unknown; // Can be string, JSON, signal data, or any other format
  // Preserve original encoding/metadata if needed for audit
  metadata?: Record<string, unknown>;
}

// UniversalExpression - Core contract for ALL inputs entering EOS
  // THIS IS THE NEW FOUNDATION: Implements user's architecture of Expression → Understanding → Need → Work
  // The single contract that replaces all separate input schemas (intents, signals, events, messages)
  export interface UniversalExpression {
    // Core identifiers
    id: string;
    origin: ExpressionOrigin; // Where did this expression come from? (human/ai/machine/external)
    actorId?: string; // Actor associated with this expression (if applicable)
    tenantId: string; // Multi-tenancy isolation
    workspaceId: string; // Workspace isolation
    createdAt: Date;
    updatedAt: Date;

    // Raw, unmodified input - PRESERVE ORIGINAL MEANING AT ALL COSTS (user's #1 requirement)
    raw: RawContent;

    // Lifecycle state (follows the exact states from user's architecture)
    status: ExpressionStatus;

    // Understanding layer - the heart of the new system
    understanding?: {
      state: UnderstandingState; // Current state of what is known/unknown
      hypotheses: IntentHypothesis[]; // All hypotheses formed (can be confirmed/rejected)
      requirement?: UnderstandingRequirement; // If understanding is insufficient
      history: UnderstandingEvent[]; // Full audit trail of ALL understanding changes
      currentHypothesisId?: string; // The currently leading hypothesis
      context?: Record<string, unknown>; // Top-level context for domain derivation & context preservation
      canFormWork?: boolean; // Whether this understanding is sufficient to form a Work (false for pure info requests)
    };

    // Resolution layer - only entered when understanding is sufficient
    resolution?: {
      requirement: any; // What's needed to form work
      selectedProvider?: string; // Which provider was selected
      resolvedAt?: Date; // When resolution was completed
      formalNeed?: {
        id: string;
        type: string;
        objective: string;
        confirmedAt: Date;
      }; // The formalized need/intent once confirmed
    };

    // Conversation history - stored separately to maintain that conversation ≠ intent/work
    conversation?: {
      turns: Array<{
        timestamp: Date;
        actorId: string;
        content: string;
        role: "user" | "eos";
        delta: {
          previousStatus: string;
          newStatus: string;
          reason: string;
          unknowns: string[];
          resolvedUnknowns?: string[];
          newKnownFacts?: string[];
          suggestedQuestions?: string[];
        }; // What understanding changed from this turn
      }>;
    };

    // Link to the work that was eventually created (only if we reach that state)
    workId?: string;

    // Audit metadata
  createdBy: string;
  lastModifiedBy?: string;
}

// UniversalExpressionInput - Input schema for creating a new universal expression
// Used by API routes and internal systems to submit new expressions into EOS
export interface UniversalExpressionInput {
  origin: ExpressionOrigin;
  actorId?: string;
  raw: RawContent;
  context?: Record<string, unknown>; // Additional context from caller
}

// Backward compatibility: keep UniversalIntentInput and IntentOrigin for existing consumers
export interface UniversalIntentInput extends UniversalExpressionInput {}
export type IntentOrigin = ExpressionOrigin;

// IntentResolutionRequirement - What capabilities are needed to resolve insufficient understanding
export interface IntentResolutionRequirement {
  required: boolean; // Whether interaction is needed at all
  reason?: string; // Why understanding is insufficient
  requiredCapabilities: string[]; // List of capabilities that can help (conversation, consultant, etc.)
  suggestedProviders: string[]; // List of suggested providers for those capabilities
}

// SufficiencyCheckResult - Output from gap analysis service
export interface SufficiencyCheckResult {
  isSufficient: boolean; // Can we form work right now?
  score: number; // 0.0 to 1.0 - how complete the intent is
  gaps: string[]; // List of specific gaps that were identified
  resolutionRequirement?: IntentResolutionRequirement; // What's needed to resolve
}