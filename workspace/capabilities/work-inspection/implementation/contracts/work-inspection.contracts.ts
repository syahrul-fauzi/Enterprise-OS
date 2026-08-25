/**
 * Work Inspection Contracts - Grounded agentic loop implementation
 * All types are rooted in Work ID to maintain work-as-boundary principle
 * No standalone communication types - all events are grounded to a Work
 */

import type { CommunicationEvent } from "@capabilities/communication/implementation/contracts/communication.contracts.js";
import type { CaseAggregate } from "@capabilities/legal-case/implementation/contracts/case.contracts.js";

// Core Work identifier - always the root of all inspection operations
export type WorkId = string & { __WorkId: true };

// Work context aggregate - contains everything the inspector needs to observe
export interface WorkContext {
  workId: WorkId;
  legalCase?: CaseAggregate;
  communicationEvents: readonly CommunicationEvent[];
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
  stageEnteredAt: Date;
  expectedCompletionAt: Date;
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
  | "ARCHIVED";

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
  type: "HANDOFF_DELAY" | "MISSING_RESPONSE" | "RESOURCE_OVERLOAD" | "EXTERNAL_DELAY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  description: string;
  affectedActors: string[];
  detectedAt: Date;
  delayHours: number;
  thresholdHours: number; // Threshold that triggered the detection (18h for handoffs)
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
  type: "NOTIFY_STAKEHOLDERS" | "ESCALATE" | "REQUEST_CONFIRMATION" | "RESCHEDULE";
  description: string;
  proposedRecipients: string[];
  message: string; // Natural language message to send
  canBeAutomated: boolean;
  requiresApproval: boolean;
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