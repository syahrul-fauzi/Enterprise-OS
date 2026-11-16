export enum LeadProspectStatus {
  CAPTURED = 'CAPTURED',
  QUALIFIED = 'QUALIFIED',
  OPPORTUNITY = 'OPPORTUNITY',
  CONVERTED = 'CONVERTED',
  CLIENT = 'CLIENT'
}

export enum SolutionArtifactStatus {
  PROPOSED = 'PROPOSED',
  ASSESSED = 'ASSESSED',
  APPROVED = 'APPROVED',
  DELIVERED = 'DELIVERED'
}

export enum FinancialAssessmentStatus {
  CREATED = 'CREATED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_REVISION = 'NEEDS_REVISION'
}

export enum OfferStatus {
  CREATED = 'CREATED',
  PUBLISHED = 'PUBLISHED',
  ACCEPTED = 'ACCEPTED',
  DELIVERED = 'DELIVERED'
}

export enum ClientAccountStatus {
  CREATED = 'CREATED',
  ONBOARDING = 'ONBOARDING',
  ACTIVE = 'ACTIVE',
  RETAINED = 'RETAINED',
  CHURNED = 'CHURNED'
}

export interface LogicalWorkReference {
  logicalWorkId: string
  workType: string
  workStatus: string
}

export interface ActorReference {
  type: 'human' | 'agent' | 'external-system'
  id: string
}

export interface EvidenceReference {
  type: string
  ref: string
}

export interface LeadProspect {
  id: string
  tenantId: string
  logicalWorkId: string
  status: LeadProspectStatus
  name: string
  email: string
  company?: string
  qualificationScore?: number
  signals: string[]
  createdAt: string
  updatedAt: string
  evidenceRefs: string[]
}

export interface SolutionArtifact {
  id: string
  tenantId: string
  logicalWorkId: string
  leadProspectId: string
  status: SolutionArtifactStatus
  title: string
  description: string
  proposalRef?: string
  specification?: Record<string, unknown>
  createdAt: string
  updatedAt: string
  evidenceRefs: string[]
}

export interface FinancialAssessment {
  id: string
  tenantId: string
  logicalWorkId: string
  solutionArtifactId: string
  status: FinancialAssessmentStatus
  estimatedCost: number
  estimatedRevenue?: number
  riskScore: number
  riskLevel?: string
  riskDescription?: string
  approvalScore?: number
  recommendation?: 'APPROVE' | 'REJECT' | 'REVISE'
  reason?: string
  createdAt: string
  updatedAt: string
  evidenceRefs: string[]
}

export interface ConversionAsset {
  id: string
  tenantId: string
  logicalWorkId: string
  financialAssessmentId: string
  status: OfferStatus
  title: string
  description: string
  price: number
  terms?: string
  createdAt: string
  updatedAt: string
  evidenceRefs: string[]
}

export interface ClientAccount {
  id: string
  tenantId: string
  logicalWorkId: string
  conversionAssetId: string
  status: ClientAccountStatus
  name: string
  email: string
  onboardingStatus?: string
  createdAt: string
  updatedAt: string
  evidenceRefs: string[]
}

export interface CaptureLeadProspectInput {
  tenantId: string
  prospectName: string
  email: string
  company?: string
  signals?: string[]
  idempotencyKey?: string
}

export interface QualifyLeadProspectInput {
  tenantId: string
  prospectId: string
  qualificationScore: number
  qualificationReason?: string
  idempotencyKey?: string
}

export interface CreateSolutionArtifactInput {
  tenantId: string
  prospectId: string
  opportunityId: string
  title: string
  description: string
  requirements?: string[]
  idempotencyKey?: string
}

export interface CreateFinancialAssessmentInput {
  tenantId: string
  solutionId: string
  prospectId: string
  estimatedCost: number
  estimatedRevenue?: number
  riskLevel: string
  riskDescription?: string
  idempotencyKey?: string
}

export interface ApproveFinancialAssessmentInput {
  tenantId: string
  assessmentId: string
  decision: string
  approvalScore: number
  approvalReason?: string
  idempotencyKey?: string
}

export interface CreateConversionAssetInput {
  tenantId: string
  assessmentId: string
  solutionId: string
  prospectId: string
  offerTitle: string
  offerDescription: string
  offerPrice: number
  idempotencyKey?: string
}

export interface AcceptOfferInput {
  tenantId: string
  offerId: string
  idempotencyKey?: string
}

export interface CreateClientAccountInput {
  tenantId: string
  offerId: string
  prospectId: string
  clientName: string
  clientEmail: string
  idempotencyKey?: string
}

export interface EventContract {
  eventId: string
  eventType: string
  schemaVersion: string
  producer: {
    contextId: string
  }
  tenantId: string
  aggregate: {
    type: string
    id: string
    version: number
  }
  work: LogicalWorkReference
  causationId: string
  correlationId: string
  actor: ActorReference
  evidenceRefs: string[]
  occurredAt: string
}

export interface LeadProspectQualifiedEvent extends EventContract {
  eventType: 'LeadProspectQualified'
  aggregate: {
    type: 'LeadProspect'
    id: string
    version: number
  }
  qualificationScore: number
}

export interface SolutionArtifactProposedEvent extends EventContract {
  eventType: 'SolutionArtifactProposed'
  aggregate: {
    type: 'SolutionArtifact'
    id: string
    version: number
  }
  proposalRef: string
}

export interface FinancialAssessmentApprovedEvent extends EventContract {
  eventType: 'FinancialAssessmentApproved'
  aggregate: {
    type: 'FinancialAssessment'
    id: string
    version: number
  }
  approvalScore: number
}

export interface OfferAcceptedEvent extends EventContract {
  eventType: 'OfferAccepted'
  aggregate: {
    type: 'ConversionAsset'
    id: string
    version: number
  }
  conversionTimestamp: string
}

export interface ClientAccountCreatedEvent extends EventContract {
  eventType: 'ClientAccountCreated'
  aggregate: {
    type: 'ClientAccount'
    id: string
    version: number
  }
  onboardingStatus: string
}