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

export interface UserAggregate {
  readonly id: UserId;
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
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface WorkspaceAggregate {
  readonly id: WorkspaceId;
  readonly tenantId: TenantId;
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
  readonly workspaceId: WorkspaceId;
  readonly role: Role;
  readonly joinedAt: Readonly<Date>;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
}

export interface SessionAggregate {
  readonly id: SessionId;
  readonly userId: UserId;
  readonly actorId: UserId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly productId: string;
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
  byId(id: UserId): Promise<UserAggregate | undefined>;
  byEmail(email: string): Promise<UserAggregate | undefined>;
  list(): Promise<readonly UserAggregate[]>;
  save(entity: UserAggregate): Promise<UserAggregate>;
  remove(id: UserId): Promise<boolean>;
};

export type TenantRepository = {
  readonly entityName: "Tenant";
  readonly kind: "repository";
  byId(id: TenantId): Promise<TenantAggregate | undefined>;

  bySlug(slug: string): Promise<TenantAggregate | undefined>;
  byCustomDomain(domain: string): Promise<TenantAggregate | undefined>;
  list(): Promise<readonly TenantAggregate[]>;
  save(entity: TenantAggregate): Promise<TenantAggregate>;
  remove(id: TenantId): Promise<boolean>;
};

export type WorkspaceRepository = {
  readonly entityName: "Workspace";
  readonly kind: "repository";
  byId(id: WorkspaceId): Promise<WorkspaceAggregate | undefined>;
  listByTenant(tenantId: TenantId): Promise<readonly WorkspaceAggregate[]>;
  list(): Promise<readonly WorkspaceAggregate[]>;
  save(entity: WorkspaceAggregate): Promise<WorkspaceAggregate>;
  remove(id: WorkspaceId): Promise<boolean>;
};

export type MembershipRepository = {
  readonly entityName: "Membership";
  readonly kind: "repository";
  byId(id: MembershipId): Promise<MembershipAggregate | undefined>;
  listByUser(userId: UserId): Promise<readonly MembershipAggregate[]>;
  listByTenant(tenantId: TenantId): Promise<readonly MembershipAggregate[]>;
  listByWorkspace(workspaceId: WorkspaceId): Promise<readonly MembershipAggregate[]>;
  find(userId: UserId, tenantId: TenantId, workspaceId: WorkspaceId): Promise<MembershipAggregate | undefined>;
  list(): Promise<readonly MembershipAggregate[]>;
  save(entity: MembershipAggregate): Promise<MembershipAggregate>;
  remove(id: MembershipId): Promise<boolean>;
};

export type SessionRepository = {
  readonly entityName: "Session";
  readonly kind: "repository";
  byId(id: SessionId): Promise<SessionAggregate | undefined>;
  listByUser(userId: UserId): Promise<readonly SessionAggregate[]>;
  listActiveByUser(userId: UserId): Promise<readonly SessionAggregate[]>;
  isRevoked(id: SessionId): Promise<boolean>;
  revoke(id: SessionId, revokedAt?: Date): Promise<SessionAggregate>;
  list(): Promise<readonly SessionAggregate[]>;
  create(entity: SessionAggregate): Promise<SessionAggregate>;
  save(entity: SessionAggregate): Promise<SessionAggregate>;
  remove(id: SessionId): Promise<boolean>;
};

// Intent primitive - first-class EOS primitive for capturing user needs before work formation
// Implements the EOS Face → Intent/Need → Work Formation flow
export type IntentId = string & { readonly __intentId: unique symbol };
export function IntentId(value: string): IntentId {
  return value as IntentId;
}

export type IntentStatus = 
  | "DRAFT"
  | "UNDERSTANDING"
  | "RESOLVED"
  | "CONVERTED_TO_WORK"
  | "ARCHIVED";

export type IntentCategory = 
  | "LEGAL_SERVICE"
  | "SERVICE_REQUEST"
  | "ACADEMIC_RESEARCH"
  | "GENERAL_INQUIRY"
  | "SUPPORT_REQUEST"
  | "PRODUCT_REQUEST"
  | "GOVERNANCE_ACTION";

export interface IntentAggregate {
  readonly id: IntentId;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly actorId: string;
  readonly title: string;
  readonly description?: string;
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
  byId(id: string, context?: { tenantId: string; workspaceId: string }): Promise<IntentAggregate | undefined>;
  list(): Promise<readonly IntentAggregate[]>;
  save(entity: IntentAggregate): Promise<IntentAggregate>;
  remove(id: string): Promise<boolean>;
  markAsConverted(intentId: string, workId: string): Promise<boolean>;
};

export const RegisterUserInputSchema = z.object({
  email: z.string().min(3).email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
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

export interface CreateWorkspaceInput {
  readonly tenantId: TenantId;
  readonly name: string;
  readonly productId: string;
}

export interface CreateMembershipInput {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly role: Role;
}

export interface CreateSessionInput {
  readonly userId: UserId;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly productId: string;
  readonly actorLabel: string;
  readonly ttlSeconds?: number;
  readonly isAgent?: boolean;
}