import { z } from "zod";

export type Role = "owner" | "admin" | "member";

export type UserId = string & { readonly __userId: unique symbol };
export function UserId(value: string): UserId {
  return value as UserId;
}

export type TenantId = string & { readonly __tenantId: unique symbol };
export function TenantId(value: string): TenantId {
  return value as TenantId;
}

export type WorkspaceId = string & { readonly __workspaceId: unique symbol };
export function WorkspaceId(value: string): WorkspaceId {
  return value as WorkspaceId;
}

export type MembershipId = string & { readonly __membershipId: unique symbol };
export function MembershipId(value: string): MembershipId {
  return value as MembershipId;
}

export type SessionId = string & { readonly __sessionId: unique symbol };
export function SessionId(value: string): SessionId {
  return value as SessionId;
}

export type WorkId = string & { readonly __workId: unique symbol };
export function createWorkId(value: string): WorkId {
  return value as WorkId;
}
// Helper untuk generate WorkId baru (sesuai pola createXxx yang sudah ada di seluruh codebase)
import { randomUUID } from "node:crypto";
export function newWorkId(): WorkId {
  return createWorkId(`work-${randomUUID()}`);
}

export type ActorId = string & { readonly __actorId: unique symbol };
export function ActorId(value: string): ActorId {
  return value as ActorId;
}

export interface RegisterUserInputInterface {
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
  readonly tenantId: string;
}

export interface UserAggregate {
  readonly id: UserId;
  readonly tenantId: TenantId; // Identity boundary: mandatory owner of the user
  readonly workId?: WorkId;   // Semantic boundary: optional, binds user to a work
  readonly workspaceId?: WorkspaceId; // Execution boundary: optional, fallback if workId not present
  readonly email: string;
  readonly displayName: string;
  readonly passwordHash: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface TenantAggregate {
  readonly id: TenantId;
  readonly name: string;
  readonly slug: string;
  readonly customDomain?: string; // Untuk white label domain apex (misal "firmahukum.com")
  readonly ownerId?: UserId;
  readonly workId?: WorkId;   // Semantic boundary: optional, binds tenant to a work
  readonly workspaceId?: WorkspaceId; // Execution boundary: optional, fallback if workId not present
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface WorkspaceAggregate {
  readonly id: WorkspaceId;
  readonly tenantId: TenantId;
  readonly workId?: WorkId;
  readonly name: string;
  readonly slug?: string;
  readonly productId: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface MembershipAggregate {
  readonly id: MembershipId;
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly workId?: WorkId;
  readonly role: Role;
  readonly joinedAt: Readonly<Date>;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface SessionAggregate {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly actorId: ActorId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly workId?: WorkId;
  readonly productId?: string;
  readonly actorLabel: string;
  readonly isAgent: boolean;
  readonly issuedAt: Readonly<Date>;
  readonly expiresAt: Readonly<Date>;
  readonly revokedAt: Readonly<Date> | null;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export type UserRepository = {
  readonly entityName: "User";
  readonly kind: "repository";
  byId(id: UserId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<UserAggregate | undefined>;
  byEmail(email: string, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<UserAggregate | undefined>;
  list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly UserAggregate[]>;
  save(entity: UserAggregate): Promise<UserAggregate>;
  remove(id: UserId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean>;
};

export type TenantRepository = {
  readonly entityName: "Tenant";
  readonly kind: "repository";
  byId(id: TenantId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<TenantAggregate | undefined>;
  bySlug(slug: string, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<TenantAggregate | undefined>;
  byCustomDomain(domain: string, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<TenantAggregate | undefined>;
  list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly TenantAggregate[]>;
  save(entity: TenantAggregate): Promise<TenantAggregate>;
  remove(id: TenantId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean>;
};

export type WorkspaceRepository = {
  readonly entityName: "Workspace";
  readonly kind: "repository";
  byId(id: WorkspaceId, context?: { tenantId: TenantId; workId?: WorkId }): Promise<WorkspaceAggregate | undefined>;
  listByTenant(tenantId: TenantId, context?: { workId?: WorkId }): Promise<readonly WorkspaceAggregate[]>;
  list(context?: { tenantId: TenantId; workId?: WorkId }): Promise<readonly WorkspaceAggregate[]>;
  save(entity: WorkspaceAggregate): Promise<WorkspaceAggregate>;
  remove(id: WorkspaceId, context?: { tenantId: TenantId; workId?: WorkId }): Promise<boolean>;
};

export type MembershipRepository = {
  readonly entityName: "Membership";
  readonly kind: "repository";
  byId(id: MembershipId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<MembershipAggregate | undefined>;
  listByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly MembershipAggregate[]>;
  listByTenant(tenantId: TenantId, context?: { workId?: WorkId }): Promise<readonly MembershipAggregate[]>;
  listByWorkspace(workspaceId: WorkspaceId, context?: { tenantId?: TenantId; workId?: WorkId }): Promise<readonly MembershipAggregate[]>;
  findByUserTenantAndWorkspace(userId: UserId, tenantId: TenantId, context?: { workspaceId?: WorkspaceId; workId?: WorkId }): Promise<MembershipAggregate | undefined>;
  list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly MembershipAggregate[]>;
  save(entity: MembershipAggregate): Promise<MembershipAggregate>;
  remove(id: MembershipId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean>;
};

export type SessionRepository = {
  readonly entityName: "Session";
  readonly kind: "repository";
  byId(id: SessionId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<SessionAggregate | undefined>;
  listByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly SessionAggregate[]>;
  listActiveByUser(userId: UserId, context?: { workId?: WorkId }): Promise<readonly SessionAggregate[]>;
  isRevoked(id: SessionId, context?: { workId?: WorkId }): Promise<boolean>;
  revoke(id: SessionId, revokedAt?: Date, context?: { workId?: WorkId }): Promise<SessionAggregate>;
  list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly SessionAggregate[]>;
  create(entity: SessionAggregate): Promise<SessionAggregate>;
  save(entity: SessionAggregate): Promise<SessionAggregate>;
  remove(id: SessionId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean>;
};

// Intent primitive - first-class EOS primitive for capturing user needs before work formation
// Implements the EOS Face → Intent/Need → Work Formation flow
export type IntentId = string & { readonly __intentId: unique symbol };
export function IntentId(value: string): IntentId {
  return value as IntentId;
}

export type IntentOrigin =
  | "human"
  | "ai_agent"
  | "machine"
  | "external_system"
  | "internal_system";

export type IntentStatus =
  | "RECEIVED"
  | "CAPTURED"
  | "UNDERSTANDING"
  | "RESOLVING"
  | "RESOLVED"
  | "WORK_FORMED"
  | "ARCHIVED";

export type IntentCategory =
  | "LEGAL_SERVICE"
  | "SERVICE_REQUEST"
  | "ACADEMIC_RESEARCH"
  | "GENERAL_INQUIRY"
  | "SUPPORT_REQUEST"
  | "PRODUCT_REQUEST"
  | "GOVERNANCE_ACTION"
  | "TECHNICAL_INCIDENT"
  | "MONITORING_ALERT"
  | "SYSTEM_EVENT";

export interface IntentUnderstanding {
  objective?: string;
  desiredOutcome?: string;
  knownContext: unknown[];
  unknowns: unknown[];
  candidateDomains: string[];
  confidence: number;
}

export interface IntentResolutionRequirement {
  required: boolean;
  reason?: string;
  requiredCapabilities?: string[];
  providerType?: "ai" | "human" | "system";
  assignedProviderId?: string;
}

export interface IntentRawInput {
  type: "expression" | "request" | "signal" | "event";
  content: unknown;
}

export interface IntentAggregate {
  readonly id: IntentId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly workId?: WorkId;
  readonly actorId?: UserId;
  readonly origin: IntentOrigin;
  readonly title: string;
  readonly description?: string;
  readonly raw: IntentRawInput;
  readonly understanding?: IntentUnderstanding;
  readonly resolution?: IntentResolutionRequirement;
  readonly category: IntentCategory;
  readonly status: IntentStatus;
  readonly metadata?: Record<string, any>;
  readonly convertedToWorkId?: string;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly version?: number;
}

export type IntentRepository = {
  readonly entityName: "Intent";
  readonly kind: "repository";
  byId(id: IntentId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<IntentAggregate | undefined>;
  list(context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<readonly IntentAggregate[]>;
  save(entity: IntentAggregate): Promise<IntentAggregate>;
  remove(id: IntentId, context?: { tenantId: TenantId; workspaceId?: WorkspaceId; workId?: WorkId }): Promise<boolean>;
  markAsConverted(intentId: IntentId, workId: string): Promise<boolean>;
};

// Zod validation schemas from local identity.contracts.ts
export const RegisterUserInputSchema = z.object({
  email: z.string().min(3).email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  tenantId: z.string().min(1),
});
export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().min(3).email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export interface CreateTenantInput {
  readonly name: string;
  readonly slug: string;
}

export interface CreateMembershipInput {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly workspaceId?: WorkspaceId;
  readonly role: Role;
}

export interface CreateWorkspaceInput {
  readonly tenantId: TenantId;
  readonly name: string;
  readonly productId: string;
  readonly slug?: string;
}