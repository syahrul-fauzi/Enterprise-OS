import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import * as crypto from "node:crypto";
import {
  UserId,
  TenantId,
  WorkspaceId,
} from "../contracts/identity.contracts";
import { UserId as UserIdValue, TenantId as TenantIdValue, WorkspaceId as WorkspaceIdValue } from "../contracts/identity.contracts";
import { randomUUID } from "node:crypto";

// REALITY PATH ONLY - Import repository Postgres yang dibutuhkan
import {
  getUserRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getSessionRepositoryPostgres,
  newSessionId,
} from "../repositories/index";
const userRepository = getUserRepositoryPostgres();
const membershipRepository = getMembershipRepositoryPostgres();
const tenantRepository = getTenantRepositoryPostgres();
const workspaceRepository = getWorkspaceRepositoryPostgres();
const sessionRepository = getSessionRepositoryPostgres();

// REALITY PATH ONLY - Inline password verify untuk menghindari import error
const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;
const SALT_SEPARATOR = "$";
function scryptDerive(password: string, salt: Buffer): string {
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN) as Buffer;
  return `${salt.toString("hex")}${SALT_SEPARATOR}${derived.toString("hex")}`;
}
function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [saltHex] = storedHash.split(SALT_SEPARATOR);
    if (!saltHex) return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = scryptDerive(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(storedHash, "utf8"),
    );
  } catch {
    return false;
  }
}


export const LoginFlowInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginFlowInput = z.infer<typeof LoginFlowInputSchema>;

export type LoginFlowOutput = {
  readonly authenticated: boolean;
  readonly userId: UserId;
  readonly actorId: string;
  readonly actorLabel: string;
  readonly tenantId: TenantId;
  readonly workspaceId: WorkspaceId;
  readonly productId: string;
  readonly sessionId: string;
  readonly email: string;
};

type LoginFlowCommand = CapabilityCommand<LoginFlowInput, LoginFlowOutput>;

export const loginFlowCommand: LoginFlowCommand = {
  kind: "command",
  name: "identity.loginFlow",
  version: "2.0.0",

  async execute(input) {
    const parsed = LoginFlowInputSchema.parse(input);
    const { email, password } = parsed;

    // REALITY PATH ONLY - Inline seluruh logika login untuk menghindari semua import error
    const user = await userRepository.byEmail(email);
    if (!user) {
      throw new Error("Invalid credentials");
    }
    const passwordValid = verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      throw new Error("Invalid credentials");
    }

    // After successful authentication, find first tenant/membership to auto-select workspace
    const memberships = await membershipRepository.listByUser(user.id);
    if (memberships.length === 0) {
      throw new Error("No workspaces available for user");
    }
    const firstMembership = memberships[0];
    if (!firstMembership) {
      throw new Error("No memberships found for user");
    }
    const tenant = await tenantRepository.byId(firstMembership.tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }
    const workspaces = await workspaceRepository.listByTenant(firstMembership.tenantId);
    if (workspaces.length === 0) {
      throw new Error("No workspaces found for tenant");
    }
    const workspace = workspaces[0];
    if (!workspace) {
      throw new Error("No workspaces found for user");
    }
    // Create a new session for the user
    const sessionId = newSessionId();
    const session = await sessionRepository.create({
      id: sessionId,
      userId: user.id,
      actorId: user.id,
      workspaceId: workspace.id,
      tenantId: tenant.id,
      productId: "services-id.default",
      actorLabel: user.displayName || "User",
      isAgent: false,
      issuedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      revokedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
    });

    return {
      authenticated: true,
      userId: user.id,
      actorId: user.id,
      actorLabel: user.displayName || "User",
      tenantId: tenant.id,
      workspaceId: workspace.id,
      productId: "services-id.default",
      sessionId: session.id,
      email: user.email,
    };
  },
};