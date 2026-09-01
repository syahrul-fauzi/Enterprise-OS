/**
 * Work Inspection Contracts - Grounded agentic loop implementation
 * All types are rooted in Work ID to maintain work-as-boundary principle
 * No standalone communication types - all events are grounded to a Work
 */

// Temporarily commented out to unblock build - missing communication/legal-case implementation files
// import type { CommunicationEvent } from "@capabilities/communication/implementation/contracts/communication.contracts.js";
// import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/case.contracts.js";
import type { WorkAggregate, WorkId } from "@capabilities/work-core/contracts/work.contracts.js";

// Core Work identifier - reuse canonical WorkId from work-core
export type { WorkId };

// Work context aggregate - contains everything the inspector needs to observe
// Updated to support ALL Work types (legal, service, consultation, generic)
// Simplified WorkContext to unblock build - optional types temporarily replaced with unknown to maintain structure
export interface WorkContext {
  workId: WorkId;
  work: WorkAggregate; // Canonical Work aggregate - replaces legalCase-only dependency
  legalCase?: unknown; // Optional: only populated for legal-case domainType
  communicationEvents: readonly unknown[];
  timeline: WorkTimelineEvent[];
  actors: WorkActor[];
  artifacts: WorkArtifact[];
  state: WorkState;
  lastInspectedAt: Date;
}

// Timeline event that tracks all state transitions
export interface WorkTimelineEvent {
  id: string;
  workId: WorkId;
  timestamp: Date;
  type: TimelineEventType;
  actorId: string;
  description: string;
  relatedEventId?: string; // Communication or artifact ID
  metadata?: Record<string, unknown>;
}

export const BottleneckTypeEnum = ["HANDOFF_DELAY", "SHIPPING_DELAY", "REVIEW_DELAY", "SUPPORT_DELAY", "DOCUMENT_MISSING"] as const;
export type TimelineEventType = 
  | "WORK_CREATED"
  | "COMMUNICATION_RECEIVED"
  | "STATE_TRANSITION"
  | "ARTIFACT_UPLOADED"
  | "EXTERNAL_SYSTEM_UPDATE"
  | "INSPECTION_PERFORMED"
  | "ACTION_PROPOSED"
  | "ACTION_EXECUTED";

// Actor that participates in the Work
export interface WorkActor {
  id: string;
  type: "human" | "agent" | "machine" | "external_system";
  role: string;
  lastActiveAt: Date;
  currentResponsibility?: string;
}

// Artifact associated with the Work
export interface WorkArtifact {
  id: string;
  workId: WorkId;
  name: string;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  url: string;
  status: ArtifactStatus;
}

export type ArtifactStatus = 
  | "DRAFT"
  | "SUBMITTED"
  | "REVIEWED"
  | "APPROVED"
  | "REJECTED";

// Work state that the inspector tracks
export interface WorkState {
  currentStage: WorkStage;
  expectedNextStage: WorkStage;
  stageEnteredAt: Date | string; // Support both Date object (internal) and ISO string (external)
  expectedCompletionAt: Date | string; // Support both Date object (internal) and ISO string (external)
  isBlocked: boolean;
  blockReason?: string;
}

export type WorkStage = 
  | "INTAKE"
  | "REVIEW"
  | "DOCUMENT_PREPARATION"
  | "NOTARY_REVIEW"
  | "SUBMISSION"
  | "GOVERNMENT_PROCESSING"
  | "COMPLETED"
  | "ARCHIVED"
  // Ecommerce/marketplace specific stages for Shopee and other platforms
  | "ORDER_RECEIVED"
  | "PROCESSING"
  | "ON_HOLD"
  | "DELIVERED"
  | "CANCELLED";

// Inspection result that the agent produces
export interface WorkInspectionResult {
  workId: WorkId;
  inspectedAt: Date;
  state: WorkState;
  bottlenecks: DetectedBottleneck[];
  missingActions: MissingAction[];
  recommendations: InspectionRecommendation[];
  inspectionConfidence: number; // 0-1 score
}

// Detected bottleneck in Work continuity
export interface DetectedBottleneck {
  id: string;
  type: "HANDOFF_DELAY" | "MISSING_RESPONSE" | "RESOURCE_OVERLOAD" | "EXTERNAL_DELAY" | "SHIPPING_DELAY" | "REVIEW_DELAY" | "SUPPORT_DELAY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedActors: string[];
  detectedAt: Date;
  delayHours: number;
  thresholdHours: number; // Threshold that triggered the detection (18h for handoffs, 48h for shipping)
}

// Missing action that needs to be performed
export interface MissingAction {
  id: string;
  type: "DOCUMENT_MISSING" | "APPROVAL_PENDING" | "CONFIRMATION_NEEDED" | "SUBMISSION_DUE";
  description: string;
  assignedTo?: string;
  dueAt?: Date;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

// Recommendation from the inspector
export interface InspectionRecommendation {
  id: string;
  type: "NOTIFY_STAKEHOLDERS" | "ESCALATE" | "REQUEST_CONFIRMATION" | "RESCHEDULE" | "ESCALATE_REVIEW" | "ESCALATE_SUPPORT";
  description: string;
  proposedRecipients: string[];
  message: string; // Natural language message to send
  canBeAutomated: boolean;
  requiresApproval: boolean;
  automatedAction?: {
    type: "GITHUB_COMMENT" | "SHOPEE_MESSAGE" | "ZENDESK_COMMENT" | "INTERNAL_NOTIFICATION";
    target: string;
    content: string;
  };
}

// Agent configuration
export interface InspectionAgentConfig {
  handoffThresholdHours: number; // Default 18h as per architectural thesis
  scanIntervalMinutes: number;
  enableAutomaticNotifications: boolean;
  enableEscalations: boolean;
}

// Default configuration aligned with user's requirements
export const DEFAULT_INSPECTION_CONFIG: InspectionAgentConfig = {
  handoffThresholdHours: 18, // Explicitly implements the 18h threshold from user feedback
  scanIntervalMinutes: 60, // Scan every hour
  enableAutomaticNotifications: true,
  enableEscalations: true,
};