import type { CapabilityCommand } from "@repo/core-kernel";
import { randomUUID } from "node:crypto";
import {
  SessionId,
  UserId,
  type CreateSessionInput,
  type LoginInput,
  type SessionAggregate,
} from "../contracts/identity.contracts.js";
import { passwordService } from "../services/password.service.js";
import {
  UserRepositoryInMemory,
  MembershipRepositoryInMemory,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  SessionRepositoryInMemory,
} from "../repositories/index.js";

function newSessionId(): SessionId {
  return SessionId(`session-${randomUUID()}`);
}

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export type CreateSessionOutput = {
  readonly sessionId: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly productId: string;
  readonly actorLabel: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
};

export type CreateSessionCommand = CapabilityCommand<
  CreateSessionInput,
  CreateSessionOutput
>;

export const createSessionCommand: CreateSessionCommand = {
  kind: "command",
  name: "identity.createSession",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    const ttl = input.ttlSeconds ?? DEFAULT_SESSION_TTL_SECONDS;
    const now = new Date();
    const expires = new Date(now.getTime() + ttl * 1000);
    const entity: SessionAggregate = {
      id: newSessionId(),
      userId: input.userId,
      actorId: input.userId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      productId: input.productId,
      actorLabel: input.actorLabel,
      issuedAt: now,
      expiresAt: expires,
      revokedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await SessionRepositoryInMemory.save(entity);
    return {
      sessionId: entity.id,
      userId: entity.userId,
      tenantId: entity.tenantId,
      workspaceId: entity.workspaceId,
      productId: entity.productId,
      actorLabel: entity.actorLabel,
      issuedAt: entity.issuedAt.toISOString(),
      expiresAt: entity.expiresAt.toISOString(),
    };
  },
};

type AuthenticateUserOutput = {
  readonly authenticated: boolean;
  readonly userId: string | undefined;
  readonly actorId: string | undefined;
  readonly actorLabel: string | undefined;
  readonly tenantId: string | undefined;
  readonly workspaceId: string | undefined;
  readonly productId: string | undefined;
  readonly role: string | undefined;
  readonly session: CreateSessionOutput | undefined;
};

type AuthenticateUserCommand = CapabilityCommand<LoginInput, AuthenticateUserOutput>;

export const loginUserCommand: AuthenticateUserCommand = {
  kind: "command",
  name: "identity.authenticateUser",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    const trimmedEmail = input.email.trim().toLowerCase();
    const user = await UserRepositoryInMemory.byEmail(trimmedEmail);
    if (user === undefined) {
      return {
        authenticated: false,
        userId: undefined,
        actorId: undefined,
        actorLabel: undefined,
        tenantId: undefined,
        workspaceId: undefined,
        productId: undefined,
        role: undefined,
        session: undefined,
      };
    }
    const ok = passwordService.verify(input.password, user.passwordHash);
    if (!ok) {
      return {
        authenticated: false,
        userId: undefined,
        actorId: undefined,
        actorLabel: undefined,
        tenantId: undefined,
        workspaceId: undefined,
        productId: undefined,
        role: undefined,
        session: undefined,
      };
    }

    const memberships = await MembershipRepositoryInMemory.listByUser(UserId(user.id));
    const primary = memberships[0];
    const tenant = primary
      ? await TenantRepositoryInMemory.byId(primary.tenantId)
      : undefined;
    const workspace = primary
      ? await WorkspaceRepositoryInMemory.byId(primary.workspaceId)
      : undefined;
    const tenantId = primary?.tenantId;
    const workspaceId = primary?.workspaceId;
    const productId = workspace?.productId ?? "services-id.default";
    const role = primary?.role;

    let session: CreateSessionOutput | undefined = undefined;
    if (tenantId && workspaceId) {
      const sessionResult = await createSessionCommand.execute({
        userId: user.id,
        tenantId,
        workspaceId,
        productId,
        actorLabel: user.displayName,
      });
      session = sessionResult;
    }

    return {
      authenticated: true,
      userId: user.id,
      actorId: user.id,
      actorLabel: user.displayName,
      tenantId,
      workspaceId,
      productId,
      role,
      session,
    };
  },
};

export { loginUserCommand as authenticateUserCommand };