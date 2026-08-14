export type ConsultationStatus = 
  | "OPEN" 
  | "UNDERSTANDING" 
  | "CONTEXT_COMPLETE" 
  | "ASSESSING" 
  | "RECOMMENDING" 
  | "AWAITING_DECISION" 
  | "HANDOFF" 
  | "EXECUTING" 
  | "RESOLVED"
  | "PAUSED"
  | "RESUMED"
  | "WAITING_FOR_INFORMATION"
  | "WAITING_FOR_HUMAN"
  | "ESCALATED"
  | "REFERRED"
  | "BLOCKED"
  | "OUT_OF_SCOPE"
  | "CANCELLED";

export type ConsultationPriority = "low" | "medium" | "high" | "critical";

export type AssistanceMode = 
  | "HUMAN"
  | "AGENT"
  | "MACHINE"
  | "HYBRID";

export type ConsultationOutcomeType =
  | "RESOLVED"
  | "INFORMATION_PROVIDED"
  | "RECOMMENDATION"
  | "SERVICE_REQUEST_CREATED"
  | "CASE_CREATED"
  | "WORKFLOW_STARTED"
  | "HUMAN_HANDOFF"
  | "AGENT_HANDOFF"
  | "REFERRAL"
  | "MORE_INFORMATION_REQUIRED"
  | "UNSAFE"
  | "OUT_OF_SCOPE";

export type ConsultationTriageResult = 
  | "needs_human_review" 
  | "create_legal_case" 
  | "create_requirement" 
  | "create_service_request"
  | "create_observability_incident"
  | "create_workflow"
  | "rejected"
  | "escalated"
  | "referred"
  | "blocked"
  | "out_of_scope"
  | "cancelled";

export type RiskLevel = "low" | "medium" | "high" | "critical";
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type ConsultationOutcomeResolutionType =
  | "INFORMATION_ONLY"
  | "RECOMMENDATION_ACCEPTED"
  | "WORK_CREATED"
  | "HUMAN_HANDOFF"
  | "AGENT_HANDOFF"
  | "MACHINE_EXECUTION"
  | "HYBRID_EXECUTION"
  | "REFERRED"
  | "OUT_OF_SCOPE"
  | "CANCELLED"
  | "CLARITY"
  | "DECISION"
  | "ASSISTED"
  | "EXECUTED"
  | "VERIFIED";

export type WorkItemType = "legal_case" | "requirement" | "service_request" | "observability_incident" | "workflow";

export type LinkedWorkItem = {
  readonly id: string;
  readonly type: WorkItemType;
  readonly title: string;
};

export type NistAiRmfFunction = "GOVERN" | "MAP" | "MEASURE" | "MANAGE";

export type EosConsultationControlId = 
  | "EOS-CONSULT-GOV-01"
  | "EOS-CONSULT-GOV-02"
  | "EOS-CONSULT-GOV-03"
  | "EOS-CONSULT-MAP-01"
  | "EOS-CONSULT-MAP-02"
  | "EOS-CONSULT-MAP-03"
  | "EOS-CONSULT-MAP-04"
  | "EOS-CONSULT-MAP-05"
  | "EOS-CONSULT-MAP-06"
  | "EOS-CONSULT-EPISTEMIC-01"
  | "EOS-CONSULT-MEASURE-01"
  | "EOS-CONSULT-MEASURE-02"
  | "EOS-CONSULT-MANAGE-01"
  | "EOS-CONSULT-MANAGE-02"
  | "EOS-CONSULT-MANAGE-03"
  | "EOS-CONSULT-MANAGE-04"
  | "EOS-CONSULT-LEARN-01"
  | "EOS-CONSULT-LEARN-02";

export interface EosConsultationControl {
  readonly id: EosConsultationControlId;
  readonly title: string;
  readonly description: string;
  readonly nistFunction: NistAiRmfFunction;
  readonly nistCategory: string;
  readonly mappedNistOutcome: string;
}

export const EOS_CONSULTATION_CONTROLS: Readonly<Record<EosConsultationControlId, EosConsultationControl>> = {
  "EOS-CONSULT-GOV-01": {
    id: "EOS-CONSULT-GOV-01",
    title: "Human Oversight Roles Defined",
    description: "Roles and responsibilities for human oversight of consultation outcomes are defined and documented.",
    nistFunction: "GOVERN",
    nistCategory: "GOVERN 1.4",
    mappedNistOutcome: "Policies, procedures, and controls to address AI risks are transparent. Roles and responsibilities for AI risk management are defined."
  },
  "EOS-CONSULT-GOV-02": {
    id: "EOS-CONSULT-GOV-02",
    title: "Autonomy Boundaries Enforced",
    description: "Execution boundaries between human/agent/machine are enforced per autonomy level and prohibited actions list.",
    nistFunction: "GOVERN",
    nistCategory: "GOVERN 1.4",
    mappedNistOutcome: "Policies, procedures, and controls to address AI risks are transparent. Roles and responsibilities for AI risk management are defined."
  },
  "EOS-CONSULT-GOV-03": {
    id: "EOS-CONSULT-GOV-03",
    title: "Governance Documentation",
    description: "Every decision and state transition produces evidence, creating a complete auditable lifecycle.",
    nistFunction: "GOVERN",
    nistCategory: "GOVERN 1.2",
    mappedNistOutcome: "Values-based principles that guide AI-related activities are defined and used to inform risk judgments. How values are applied in context is transparent to users and other relevant parties."
  },
  "EOS-CONSULT-MAP-01": {
    id: "EOS-CONSULT-MAP-01",
    title: "User Need Context Capture",
    description: "Ambiguous user intent is transformed into structured understanding (intent, need, facts, assumptions, missing info).",
    nistFunction: "MAP",
    nistCategory: "MAP 1.1",
    mappedNistOutcome: "The intended uses and context of the AI system are characterized and documented."
  },
  "EOS-CONSULT-MAP-02": {
    id: "EOS-CONSULT-MAP-02",
    title: "Risk Classification",
    description: "Every consultation receives a risk level assessment with documented rationale and assessor identity.",
    nistFunction: "MAP",
    nistCategory: "MAP 2.2",
    mappedNistOutcome: "The AI system's capabilities, intended use cases, and the risks and benefits of its deployment are assessed, including the context of the system's use."
  },
  "EOS-CONSULT-MAP-03": {
    id: "EOS-CONSULT-MAP-03",
    title: "Human Oversight Process Defined",
    description: "Human oversight process is defined, assessed, and documented per risk and autonomy profile.",
    nistFunction: "MAP",
    nistCategory: "MAP 3.5",
    mappedNistOutcome: "The human oversight process to be applied is defined, assessed, and documented."
  },
  "EOS-CONSULT-MAP-04": {
    id: "EOS-CONSULT-MAP-04",
    title: "Uncertainty Assessment",
    description: "Uncertainty in understanding, risk assessment, and recommendations is explicitly captured.",
    nistFunction: "MAP",
    nistCategory: "MAP 2.3",
    mappedNistOutcome: "The limitations of the AI system, related to their impact and likelihood of occurrence, are assessed in the context of use."
  },
  "EOS-CONSULT-MAP-05": {
    id: "EOS-CONSULT-MAP-05",
    title: "Assistance Mode Classification",
    description: "Assistance mode (HUMAN/AGENT/MACHINE/HYBRID) is determined based on risk, uncertainty, and required capabilities.",
    nistFunction: "MAP",
    nistCategory: "MAP 3.5",
    mappedNistOutcome: "The human oversight process to be applied is defined, assessed, and documented."
  },
  "EOS-CONSULT-MEASURE-01": {
    id: "EOS-CONSULT-MEASURE-01",
    title: "Decision Evidence Audit Trail",
    description: "Quantitative and qualitative evidence of every decision (risk, autonomy, assistance, routing) is recorded with timestamp and actor.",
    nistFunction: "MEASURE",
    nistCategory: "MEASURE 1.1",
    mappedNistOutcome: "Appropriate metrics to track AI system performance and outcomes in the context of deployment are defined, selected, and monitored."
  },
  "EOS-CONSULT-MEASURE-02": {
    id: "EOS-CONSULT-MEASURE-02",
    title: "Autonomy Boundary Metrics",
    description: "Allowed vs prohibited actions are tracked; boundary violations are detected and logged.",
    nistFunction: "MEASURE",
    nistCategory: "MEASURE 2.3",
    mappedNistOutcome: "The effectiveness of AI risk management activities is tracked, evaluated, and verified against risk tolerance."
  },
  "EOS-CONSULT-MANAGE-01": {
    id: "EOS-CONSULT-MANAGE-01",
    title: "Risk Response Assignment",
    description: "Risk response is implemented by assigning appropriate assistance mode (who/what executes) and autonomy level (what they may do).",
    nistFunction: "MANAGE",
    nistCategory: "MANAGE 1.2",
    mappedNistOutcome: "AI risk response plans are implemented, including monitoring and managing residual risk after responses are in place."
  },
  "EOS-CONSULT-MANAGE-02": {
    id: "EOS-CONSULT-MANAGE-02",
    title: "Work Item Routing",
    description: "Consultation routes to domain capabilities (legal-case, service-directory, requirement, workflow) without owning domain semantics.",
    nistFunction: "MANAGE",
    nistCategory: "MANAGE 1.1",
    mappedNistOutcome: "Prioritized AI risks are selected for treatment."
  },
  "EOS-CONSULT-MANAGE-03": {
    id: "EOS-CONSULT-MANAGE-03",
    title: "Handoff Management",
    description: "Handoff between actors (human/agent/machine) is governed with trigger, evidence, and validation.",
    nistFunction: "MANAGE",
    nistCategory: "MANAGE 3.1",
    mappedNistOutcome: "Human-AI configurations are established and monitored, particularly those that support human oversight and intervention."
  },
  "EOS-CONSULT-MANAGE-04": {
    id: "EOS-CONSULT-MANAGE-04",
    title: "Resolution Closure Evidence",
    description: "Closed consultations record resolution type, outcome, and complete evidence chain for audit.",
    nistFunction: "MANAGE",
    nistCategory: "MANAGE 4.1",
    mappedNistOutcome: "Mechanisms are established to monitor and respond to changes in the AI system or its context of use."
  },
  "EOS-CONSULT-MAP-06": {
    id: "EOS-CONSULT-MAP-06",
    title: "Cross-episode Context Reuse",
    description: "Validated facts, decisions, and evidence from previous consultation episodes are safely reused to avoid redundant discovery.",
    nistFunction: "MAP",
    nistCategory: "MAP 1.1",
    mappedNistOutcome: "The intended uses and context of the AI system are characterized and documented."
  },
  "EOS-CONSULT-EPISTEMIC-01": {
    id: "EOS-CONSULT-EPISTEMIC-01",
    title: "Epistemic Status Enforcement",
    description: "All facts maintain explicit epistemic status (CLAIMED/OBSERVED/EVIDENCED/VERIFIED/OUTDATED/CONTRADICTED) to distinguish user claims from verified facts.",
    nistFunction: "MAP",
    nistCategory: "MAP 2.1",
    mappedNistOutcome: "The AI system's capabilities, intended use cases, and the risks and benefits of its deployment are assessed, including the context of the system's use."
  },
  "EOS-CONSULT-LEARN-01": {
    id: "EOS-CONSULT-LEARN-01",
    title: "Learning Governance Gate",
    description: "No consultation experience becomes system knowledge/reasoning policy without explicit governance approval. Experience → Learning Candidate → Evidence → Governance → Approved Knowledge.",
    nistFunction: "GOVERN",
    nistCategory: "GOVERN 1.1",
    mappedNistOutcome: "AI governance mechanisms are in place to monitor, manage, and validate system learning over time."
  },
  "EOS-CONSULT-LEARN-02": {
    id: "EOS-CONSULT-LEARN-02",
    title: "Memory Separation Enforcement",
    description: "Strict separation maintained between Case Memory (per-user facts), Knowledge (generalized patterns), and Learning (reasoning improvements) to prevent unauthorized knowledge leakage.",
    nistFunction: "GOVERN",
    nistCategory: "GOVERN 2.1",
    mappedNistOutcome: "Data governance and privacy controls prevent unauthorized cross-tenant knowledge sharing."
  }
};

export type DecisionLogEntry = {
  readonly decision: string;
  readonly by: string;
  readonly at: Date;
  readonly reason: string;
  readonly controlIds?: readonly EosConsultationControlId[];
};

export interface ConsultationRiskAssessment {
  readonly level: RiskLevel;
  readonly rationale: string;
  readonly assessedBy: string;
  readonly assessedAt: Date;
  readonly controlIds?: readonly EosConsultationControlId[];
}

export interface ConsultationAutonomyProfile {
  readonly level: AutonomyLevel;
  readonly allowedActions: readonly string[];
  readonly prohibitedActions: readonly string[];
  readonly setBy: string;
  readonly setAt: Date;
  readonly controlIds?: readonly EosConsultationControlId[];
}

export interface ConsultationAssistanceAssignment {
  readonly mode: AssistanceMode;
  readonly actor: string;
  readonly capabilities: readonly string[];
  readonly assignedAt: Date;
  readonly controlIds?: readonly EosConsultationControlId[];
}

export type DecisionEvidenceStage = 
  | "input"
  | "understanding"
  | "risk_assessment"
  | "recommendation"
  | "user_decision"
  | "assistance_assignment"
  | "execution"
  | "outcome"
  | "closure"
  | "pause"
  | "resume";

export interface ConsultationStageEvidence {
  readonly stage: DecisionEvidenceStage;
  readonly recordedAt: Date;
  readonly recordedBy: string;
  readonly summary: string;
  readonly details?: Readonly<Record<string, unknown>>;
  readonly controlIds?: readonly EosConsultationControlId[];
}

export interface ConsultationDecisionContract {
  readonly risk: ConsultationRiskAssessment;
  readonly autonomy: ConsultationAutonomyProfile;
  readonly assistance: ConsultationAssistanceAssignment;
  readonly recommendation: string;
  readonly handoffTrigger?: string;
  readonly blockReason?: string;
  readonly decisionLog: readonly DecisionLogEntry[];
  readonly stages: readonly ConsultationStageEvidence[];
  readonly controlsApplied: readonly EosConsultationControlId[];
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type ConsultationEpisodeId = string & { readonly __consultationEpisodeId: unique symbol };

export function ConsultationEpisodeId(value: string): ConsultationEpisodeId {
  return value as ConsultationEpisodeId;
}

export type ConsultationSeriesId = string & { readonly __consultationSeriesId: unique symbol };

export function ConsultationSeriesId(value: string): ConsultationSeriesId {
  return value as ConsultationSeriesId;
}

export type EpistemicStatus = 
  | "CLAIMED"
  | "OBSERVED"
  | "EVIDENCED"
  | "VERIFIED"
  | "OUTDATED"
  | "CONTRADICTED";

export interface ConsultationFact {
  readonly key: string;
  readonly value: unknown;
  readonly epistemicStatus: EpistemicStatus;
  readonly recordedAt: Date;
  readonly recordedBy: string;
  readonly sourceEpisodeId?: ConsultationEpisodeId;
}

export interface ConsultationEpisode {
  readonly id: ConsultationEpisodeId;
  readonly seriesId: ConsultationSeriesId;
  readonly consultationId: ConsultationId;
  readonly sequenceNumber: number;
  readonly contextSnapshot: Readonly<Record<string, unknown>>;
  readonly facts: readonly ConsultationFact[];
  readonly decisions: readonly DecisionLogEntry[];
  readonly evidence: readonly ConsultationStageEvidence[];
  readonly assumptions: readonly string[];
  readonly unresolvedQuestions: readonly string[];
  readonly outcome: ConsultationOutcomeResolutionType;
  readonly nextRecommendedAction?: string;
  readonly linkedWorkItems: readonly LinkedWorkItem[];
  readonly startedAt: Date;
  readonly endedAt?: Date;
}

export type LearningCandidateStatus = 
  | "PROPOSED"
  | "REVIEWING"
  | "APPROVED"
  | "REJECTED"
  | "ACTIVE"
  | "ARCHIVED";

export interface LearningCandidate {
  readonly id: string;
  readonly seriesId: ConsultationSeriesId;
  readonly sourceEpisodes: readonly ConsultationEpisodeId[];
  readonly pattern: string;
  readonly confidence: number;
  readonly status: LearningCandidateStatus;
  readonly reviewedBy?: string;
  readonly reviewedAt?: Date;
  readonly controlIds?: readonly EosConsultationControlId[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface ConsultationSeries {
  readonly id: ConsultationSeriesId;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly primaryDomain: string;
  readonly episodes: readonly ConsultationEpisodeId[];
  // L0-EPISODIC (case memory - per-series user facts)
  readonly cumulativeKnownContext: readonly ConsultationFact[];
  readonly unresolvedUncertainty: readonly string[];
  readonly linkedWorkItems: readonly LinkedWorkItem[];
  // L1-CASE learning candidates (pending governance)
  readonly learningCandidates: readonly LearningCandidate[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastEpisodeStartedAt?: Date;
  readonly lastEpisodeEndedAt?: Date;
}

export type ConsultationId = string & { readonly __consultationId: unique symbol };

export function ConsultationId(value: string): ConsultationId {
  return value as ConsultationId;
}

export type ConsultationConversationMessage = {
  readonly role: "user" | "assistant" | "agent" | "human";
  readonly content: string;
  readonly timestamp: Date;
};

export interface ConsultationAggregate {
  readonly id: ConsultationId;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly title: string;
  readonly description: string;
  readonly userNeed: string;
  readonly status: ConsultationStatus;
  readonly priority: ConsultationPriority;
  readonly blockedAt?: Date;
  readonly blockedBy?: string;
  readonly intent?: string;
  readonly context?: Readonly<Record<string, unknown>>;
  readonly participants?: readonly string[];
  readonly conversation?: readonly ConsultationConversationMessage[];
  readonly facts?: readonly string[];
  readonly assumptions?: readonly string[];
  readonly questions?: readonly string[];
  readonly findings?: readonly string[];
  readonly risks?: readonly string[];
  readonly recommendations?: readonly string[];
  readonly uncertainty?: string;
  readonly assistanceMode: AssistanceMode;
  readonly nextAction?: string;
  readonly referrals?: readonly string[];
  readonly outcome?: ConsultationOutcomeType;
  readonly resolutionType?: ConsultationOutcomeResolutionType;
  readonly decisionContract?: ConsultationDecisionContract;
  readonly linkedWorkItems: readonly LinkedWorkItem[];
  readonly founder?: string;
  readonly ownership?: string;
  readonly businessType?: string;
  readonly domicile?: string;
  readonly kbli?: string;
  readonly triageResult?: ConsultationTriageResult;
  readonly linkedWorkItemId?: string;
  readonly linkedWorkItemType?: WorkItemType;
  readonly triageNotes?: string;
  readonly need?: string;
  readonly diagnosis?: string;
  readonly missingFields?: readonly string[];
  readonly recommendedAction?: string;
  // Infrastructure/observability incident fields
  readonly server_id?: string;
  readonly datacenter_location?: string;
  readonly last_cpu_usage?: number;
  readonly last_memory_usage?: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly openedAt: Date;
  readonly understandingStartedAt?: Date;
  readonly understandingCompletedAt?: Date;
  readonly contextCompleteAt?: Date;
  readonly contextCompletedAt?: Date;
  readonly assessingStartedAt?: Date;
  readonly recommendingStartedAt?: Date;
  readonly recommendingCompletedAt?: Date;
  readonly awaitingDecisionAt?: Date;
  readonly handoffAt?: Date;
  readonly executingStartedAt?: Date;
  readonly resolvedAt?: Date;
  readonly cancelledAt?: Date;
  readonly missingInfoAt?: Date;
  readonly humanReviewRequestedAt?: Date;
  readonly escalatedAt?: Date;
  readonly escalationReason?: string;
  readonly referredAt?: Date;
  readonly referralTarget?: string;
  readonly outOfScopeAt?: Date;
  readonly reasonOutOfScope?: string;
  readonly reasonCancelled?: string;
  readonly resolution?: string;
  readonly pausedAt?: Date;
  readonly resumedAt?: Date;
  readonly seriesId?: ConsultationSeriesId;
  readonly episodeId?: ConsultationEpisodeId;
}

export interface CreateConsultationInput {
  readonly title: string;
  readonly description: string;
  readonly userNeed: string;
  readonly priority?: ConsultationPriority;
  readonly founder?: string;
  readonly ownership?: string;
  readonly businessType?: string;
  readonly domicile?: string;
  readonly kbli?: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface CreateConsultationOutput {
  readonly id: ConsultationId;
  readonly status: ConsultationStatus;
  readonly createdAt: Date;
}

export interface TriageConsultationInput {
  readonly id: ConsultationId;
  readonly triageResult: ConsultationTriageResult;
  readonly triageNotes?: string;
  readonly linkedWorkItemId?: string;
  readonly intent?: string;
  readonly need?: string;
  readonly diagnosis?: string;
  readonly missingFields?: readonly string[];
  readonly recommendedAction?: string;
  readonly riskLevel?: RiskLevel;
  readonly autonomyLevel?: AutonomyLevel;
  readonly riskRationale?: string;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface TriageConsultationOutput {
  readonly id: ConsultationId;
  readonly status: ConsultationStatus;
  readonly triageResult: ConsultationTriageResult;
  readonly linkedWorkItemId?: string;
  readonly intent?: string;
  readonly need?: string;
  readonly diagnosis?: string;
  readonly missingFields?: readonly string[];
  readonly recommendedAction?: string;
  readonly updatedAt: Date;
  readonly blockedAt?: Date;
  readonly blockedBy?: string;
  readonly blockReason?: string;
  readonly linkedWorkItems: readonly LinkedWorkItem[];
}

export interface GetConsultationInput {
  readonly id: ConsultationId;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export type GetConsultationOutput = ConsultationAggregate | undefined;

export interface SearchConsultationsInput {
  readonly query?: string;
  readonly status?: ConsultationStatus | "all";
  readonly priority?: ConsultationPriority | "all";
  readonly limit?: number;
  readonly offset?: number;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
}

export interface SearchConsultationsOutput {
  readonly items: readonly ConsultationAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
}

export type ConsultationRepository = {
  readonly entityName: "Consultation";
  readonly kind: "repository";
  byId(id: ConsultationId): Promise<ConsultationAggregate | undefined>;
  list(): Promise<readonly ConsultationAggregate[]>;
  listByTenant(tenantId: string): Promise<readonly ConsultationAggregate[]>;
  listByWorkspace(workspaceId: string): Promise<readonly ConsultationAggregate[]>;
  save(entity: ConsultationAggregate): Promise<ConsultationAggregate>;
  remove(id: ConsultationId): Promise<boolean>;
};

export interface ConsultationDomainEvents {
  readonly "ConsultationCreated": {
    readonly id: ConsultationId;
    readonly title: string;
    readonly actorId: string;
    readonly at: Date;
  };
  readonly "ConsultationSubmitted": {
    readonly id: ConsultationId;
    readonly at: Date;
  };
  readonly "ConsultationTriaged": {
    readonly id: ConsultationId;
    readonly triageResult: ConsultationTriageResult;
    readonly linkedWorkItemId?: string;
    readonly intent?: string;
    readonly need?: string;
    readonly diagnosis?: string;
    readonly missingFields?: readonly string[];
    readonly recommendedAction?: string;
    readonly at: Date;
  };
  readonly "ConsultationClosed": {
    readonly id: ConsultationId;
    readonly reason?: string;
    readonly at: Date;
  };
}