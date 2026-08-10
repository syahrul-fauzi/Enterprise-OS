import { z } from "zod";
export type Role = "owner" | "admin" | "member";
export type UserId = string & {
    readonly __userId: unique symbol;
};
export declare function UserId(value: string): UserId;
export type TenantId = string & {
    readonly __tenantId: unique symbol;
};
export declare function TenantId(value: string): TenantId;
export type WorkspaceId = string & {
    readonly __workspaceId: unique symbol;
};
export declare function WorkspaceId(value: string): WorkspaceId;
export type MembershipId = string & {
    readonly __membershipId: unique symbol;
};
export declare function MembershipId(value: string): MembershipId;
export type SessionId = string & {
    readonly __sessionId: unique symbol;
};
export declare function SessionId(value: string): SessionId;
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
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
}
export interface WorkspaceAggregate {
    readonly id: WorkspaceId;
    readonly tenantId: TenantId;
    readonly name: string;
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
    readonly updatedAt: Readonly<Date>;
}
export interface SessionAggregate {
    readonly id: SessionId;
    readonly userId: UserId;
    readonly tenantId: TenantId;
    readonly workspaceId: WorkspaceId;
    readonly productId: string;
    readonly actorLabel: string;
    readonly issuedAt: Readonly<Date>;
    readonly expiresAt: Readonly<Date>;
    readonly revokedAt: Readonly<Date> | null;
    readonly createdAt: Readonly<Date>;
    readonly updatedAt: Readonly<Date>;
}
export type UserRepository = {
    readonly entityName: "User";
    readonly kind: "repository";
    byId(id: UserId): UserAggregate | undefined;
    byEmail(email: string): UserAggregate | undefined;
    list(): readonly UserAggregate[];
    save(entity: UserAggregate): UserAggregate;
    remove(id: UserId): boolean;
};
export type TenantRepository = {
    readonly entityName: "Tenant";
    readonly kind: "repository";
    byId(id: TenantId): TenantAggregate | undefined;
    bySlug(slug: string): TenantAggregate | undefined;
    list(): readonly TenantAggregate[];
    save(entity: TenantAggregate): TenantAggregate;
    remove(id: TenantId): boolean;
};
export type WorkspaceRepository = {
    readonly entityName: "Workspace";
    readonly kind: "repository";
    byId(id: WorkspaceId): WorkspaceAggregate | undefined;
    listByTenant(tenantId: TenantId): readonly WorkspaceAggregate[];
    list(): readonly WorkspaceAggregate[];
    save(entity: WorkspaceAggregate): WorkspaceAggregate;
    remove(id: WorkspaceId): boolean;
};
export type MembershipRepository = {
    readonly entityName: "Membership";
    readonly kind: "repository";
    byId(id: MembershipId): MembershipAggregate | undefined;
    listByUser(userId: UserId): readonly MembershipAggregate[];
    listByTenant(tenantId: TenantId): readonly MembershipAggregate[];
    listByWorkspace(workspaceId: WorkspaceId): readonly MembershipAggregate[];
    find(userId: UserId, tenantId: TenantId, workspaceId: WorkspaceId): MembershipAggregate | undefined;
    list(): readonly MembershipAggregate[];
    save(entity: MembershipAggregate): MembershipAggregate;
    remove(id: MembershipId): boolean;
};
export type SessionRepository = {
    readonly entityName: "Session";
    readonly kind: "repository";
    byId(id: SessionId): SessionAggregate | undefined;
    listByUser(userId: UserId): readonly SessionAggregate[];
    listActiveByUser(userId: UserId): readonly SessionAggregate[];
    isRevoked(id: SessionId): boolean;
    revoke(id: SessionId, revokedAt?: Date): SessionAggregate;
    list(): readonly SessionAggregate[];
    save(entity: SessionAggregate): SessionAggregate;
    remove(id: SessionId): boolean;
};
export declare const RegisterUserInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    displayName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    displayName: string;
}, {
    email: string;
    password: string;
    displayName: string;
}>;
export type RegisterUserInput = z.infer<typeof RegisterUserInputSchema>;
export declare const LoginInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
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
}
//# sourceMappingURL=identity.contracts.d.ts.map