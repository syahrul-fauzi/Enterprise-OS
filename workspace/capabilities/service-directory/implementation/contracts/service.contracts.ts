// Import canonical identity + CMBCD types dari work-core (single source of truth - anti-drift)
// Semua CMBCD core types (ActorMetadata, AuthorizationScope, ContextMetadata, RiskAssessment, WorkFaceProjection)
// didefinisikan sekali di work-core untuk menghindari duplikasi antar vertical slices (Rule of Two compliance)
import type {
  TenantId,
  WorkspaceId,
  ActorId,
  ExecutionFrame,
  ActorMetadata,
  AuthorizationScope,
  ContextMetadata,
  RiskAssessment,
  WorkFaceProjection
} from "../../../work-core/contracts/work.contracts.js";

export type ServiceRequestStatus = "draft" | "submitted" | "proposed" | "accepted" | "in_service" | "delivered" | "verified" | "settled" | "cancelled" | "declined";
export type ServiceRequestPriority = "low" | "medium" | "high" | "critical";
export type RiskLevel = "low" | "medium" | "high" | "critical";

export type ServiceProviderCategory =
  | "Cloud Services"
  | "IT Support"
  | "Infrastructure"
  | "Cybersecurity"
  | "Software Development"
  | "Managed Services"
  | "Data & Analytics"
  | "Payment Processing"
  | "Trademark Registration";

export type ServiceProviderId = string & { readonly __serviceProviderId: unique symbol };
export function ServiceProviderId(value: string): ServiceProviderId {
  return value as ServiceProviderId;
}

export type ServiceRequestId = string & { readonly __serviceRequestId: unique symbol };
export function ServiceRequestId(value: string): ServiceRequestId {
  return value as ServiceRequestId;
}

export type SupplyStatus = "PENDING_VERIFICATION" | "VERIFIED" | "INACTIVE";

// Service-directory specific extensions of canonical CMBCD types
// Hanya menambahkan field khusus domain service yang tidak ada di work-core ContextMetadata
export interface ServiceRequestContextMetadata extends ContextMetadata {
    readonly requestCategory: string; // Domain-specific request category hanya untuk service-directory
}

export interface RiskAssessment extends RiskAssessment {
    readonly mitigationSteps?: readonly string[]; // Domain-specific risk mitigation hanya untuk service-directory
}

export interface AuthorizationScope extends AuthorizationScope {
    readonly expiryTimestamp?: string; // Domain-specific auth expiry hanya untuk service-directory
    readonly delegatedBy?: ActorId; // Domain-specific delegation trace hanya untuk service-directory
}

// Import canonical CMBCD execution frame calculator dari shared work-core substrate
// Implements user mandate: Reuse existing primitives (Rule of Two compliance)
import { calculateExecutionFrame } from "../../../work-core/implementation/utils/index.js";

export interface ServiceProviderAggregate {
  readonly id: ServiceProviderId;
  readonly workId: string; // CORE-001: Mandatory link to core Work primitive ID
  readonly name: string;
  readonly category: ServiceProviderCategory;
  readonly description: string;
  readonly rating: number;
  readonly location?: string;
  readonly verified: boolean;
  readonly contactEmail?: string;
  readonly contactName?: string;
  readonly responseHours?: string;
  readonly supplyStatus?: SupplyStatus; // CR-004 Supply-side verification tracking
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  
  // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (sama dengan ServiceRequestAggregate - Rule of Two compliance)
  readonly actorMetadata: ActorMetadata;
  readonly allowedCapabilities: readonly string[];
  readonly authorization: AuthorizationScope;
  readonly context: ServiceRequestContextMetadata;
  readonly risk: RiskAssessment;
}

export interface ExternalSystemResponse {
  readonly system: string;
  readonly status: string;
  readonly referenceId?: string;
  readonly data?: Record<string, unknown>;
  readonly receivedAt: Readonly<Date>;
}

export interface ExecutionContextMetadata {
    readonly decision_id?: string | null;
    readonly last_invocation_digest?: string | null;
    readonly propagated_from: "cross-capability" | "direct-api";
    readonly calculatedExecutionFrame?: ExecutionFrame; // Dynamically computed from CMBCD
    readonly metadata?: Record<string, unknown>; // ACaaS-001: Support custom metadata storage for compliance evaluation
    readonly evaluationResult?: any; // ACaaS-001: Store compliance evaluation results
    readonly actorId?: string; // ACaaS-001: Store actor who initiated the evaluation
    readonly createdAt?: string; // ACaaS-001: Evaluation creation timestamp
    readonly billed?: boolean; // ACaaS-004: Track if the evaluation has been billed
}

export interface ServiceRequestAggregate {
  readonly id: ServiceRequestId;
  readonly workId: string; // CORE-001: Mandatory link to core Work primitive ID (only source of truth for boundary metadata)
  readonly title: string;
  readonly description?: string;
  readonly category: ServiceProviderCategory;
  readonly status: ServiceRequestStatus;
  readonly priority: ServiceRequestPriority;
  readonly requesterName?: string;
  readonly requesterEmail?: string;
  readonly requesterPhone?: string;
  readonly providerId?: ServiceProviderId;
  readonly providerNote?: string;
  readonly providerDecisionAt?: Readonly<Date>;
  readonly proposedPrice?: string;
  readonly priceAcceptedAt?: Readonly<Date>;
  readonly paymentTransactionId?: string;
  readonly paymentStatus?: string;
  readonly budget?: string;
  readonly externalId?: string;
  readonly deadline?: Readonly<Date>;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly deliveredAt?: Readonly<Date>;
  readonly verifiedAt?: Readonly<Date>;
  readonly settledAt?: Readonly<Date>;
  readonly externalResponses?: readonly ExternalSystemResponse[];
  
  // PROD-002-10: FULL CMBCD FRAMEWORK IMPLEMENTATION (actor-capability-authority-context-risk-evidence)
  readonly actorMetadata: ActorMetadata; // Current responsible actor metadata
  readonly allowedCapabilities: readonly string[]; // List of capabilities authorized for this request
  readonly authorization: AuthorizationScope; // Granular authorization boundaries
  readonly context: ServiceRequestContextMetadata; // 5-boundary compliant context metadata
  readonly risk: RiskAssessment; // Dynamic risk assessment per actor/context changes
  readonly executionFrame?: ExecutionFrame; // SRV-SERVICE-001: CMBCD execution frame (canonical type from work-core)
  readonly executionContext?: ExecutionContextMetadata;
  readonly evidence?: readonly any[]; // Immutable evidence trail for all state transitions
}

export interface CreateServiceRequestInput {
  readonly title: string;
  readonly description?: string;
  readonly category: ServiceProviderCategory;
  readonly requesterName?: string;
  readonly budget?: string;
  readonly workId: string; // CORE-001: Mandatory link to core Work primitive ID
  // W-012: HIGH-VALUE WORK GRAPH CORE LINKS (sesuai W-011 extension di work-core)
  readonly relatedProductIds?: readonly string[]; // Produk yang terkait dengan service request ini
  readonly relatedRequirementIds?: readonly string[]; // Requirement yang harus dipenuhi service request ini
}

export interface CreateServiceRequestOutput {
  readonly id: ServiceRequestId;
  readonly status: ServiceRequestStatus;
  readonly workId: string; // W-012: Mandatory core Work ID link (complies with Work-centric architecture)
  readonly faceProjection: WorkFaceProjection; // W-012: Server-derived FACE projection (complies with "FACE is projection, not owner" mandate)
}

export interface UpdateExternalSystemStatusInput {
  readonly id: ServiceRequestId;
  readonly externalSystem: string;
  readonly externalStatus: string;
  readonly externalReferenceId?: string;
  readonly responseData?: Record<string, unknown>;
  readonly receivedAt: string;
  readonly sessionId: string;
}

export interface UpdateExternalSystemStatusOutput {
  readonly success: boolean;
  readonly id: ServiceRequestId;
  readonly externalSystem: string;
  readonly externalStatus: string;
  readonly receivedAt: string;
}

export type ServiceProviderRepository = {
  readonly entityName: "ServiceProvider";
  readonly kind: "repository";
  byId(id: ServiceProviderId): Promise<ServiceProviderAggregate | undefined>;
  list(): Promise<readonly ServiceProviderAggregate[]>;
  listByCategory(category: ServiceProviderCategory): Promise<readonly ServiceProviderAggregate[]>;
  listByLocation(location: string): Promise<readonly ServiceProviderAggregate[]>;
  listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceProviderAggregate[]>; // CORE-001: Work-centric batch query untuk High-Value Work Graph
  listCategories(): readonly ServiceProviderCategory[];
  save(entity: ServiceProviderAggregate): Promise<ServiceProviderAggregate>;
  remove(id: ServiceProviderId): Promise<boolean>;
};

export interface ServiceRequestRepository {
  readonly entityName: "ServiceRequest";
  readonly kind: "repository";
  byId(id: ServiceRequestId, context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<ServiceRequestAggregate | undefined>;
  // ACaaS-COMMERCIAL-001: Add byExternalId to support idempotency checks
  byExternalId(externalId: string, tenantId: string, workspaceId: string): Promise<ServiceRequestAggregate | undefined>;
  list(context?: { tenantId: string; workspaceId?: string; workId?: string }): Promise<readonly ServiceRequestAggregate[]>;
  listByStatus(status: ServiceRequestStatus | "all"): Promise<readonly ServiceRequestAggregate[]>;
  listByWork(workId: string): Promise<readonly ServiceRequestAggregate[]>; // CORE-001: Single work query
  listByWorkIds(workIds: readonly string[]): Promise<readonly ServiceRequestAggregate[]>; // CORE-001: Batch work query for High-Value Work Graph
  listByWorkspace(workspaceId: string, tenantId: string): Promise<readonly ServiceRequestAggregate[]>; // CORE-001: Optional execution boundary fallback
  save(entity: ServiceRequestAggregate): Promise<ServiceRequestAggregate>;
  update(id: ServiceRequestId, tenantId: string, workspaceId: string, updates: Partial<ServiceRequestAggregate>): Promise<ServiceRequestAggregate>;
  createMany(entities: CreateServiceRequestInput[]): Promise<string[]>;
  remove(id: ServiceRequestId): Promise<boolean>;
};