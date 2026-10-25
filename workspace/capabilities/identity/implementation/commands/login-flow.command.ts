import type { CapabilityCommand } from "../../../capability-dispatch/contracts/command.contracts.js";
import { z } from "zod";
import * as crypto from "node:crypto";
import {
  type UserId,
  type TenantId,
  type WorkspaceId,
  ActorId,
} from "@repo/contracts-core";
import { randomUUID } from "node:crypto";
// Import 6-boundary validation function dari package kanonis
import { validateBoundaryAccess } from "@capabilities/work-core/contracts/work.contracts.js";

// Lazy load repositories untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getUserRepositoryLazy() {
  const { getUserRepositoryPostgres } = await import("../repositories/index.js");
  return getUserRepositoryPostgres();
}

async function getMembershipRepositoryLazy() {
  const { getMembershipRepositoryPostgres } = await import("../repositories/index.js");
  return getMembershipRepositoryPostgres();
}

async function getTenantRepositoryLazy() {
  const { getTenantRepositoryPostgres } = await import("../repositories/index.js");
  return getTenantRepositoryPostgres();
}

async function getWorkspaceRepositoryLazy() {
  const { getWorkspaceRepositoryPostgres } = await import("../repositories/index.js");
  return getWorkspaceRepositoryPostgres();
}

async function getSessionRepositoryLazy() {
  const { getSessionRepositoryPostgres, newSessionId } = await import("../repositories/index.js");
  return { sessionRepository: getSessionRepositoryPostgres(), newSessionId };
}

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
  actorContext: z.object({
    actorId: z.string().optional(),
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    productId: z.string().optional(),
  }).optional(),
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
  readonly actorContext?: {
    actorId: string | undefined;
    tenantId: string | undefined;
    workspaceId: string | undefined;
    productId: string | undefined;
  };
};

type LoginFlowCommand = CapabilityCommand<LoginFlowInput, LoginFlowOutput>;

export const loginFlowCommand: LoginFlowCommand = {
  kind: "command",
  name: "identity.loginFlow",
  version: "4.0.0", // Updated for full 6-boundary compliance, canonical actorContext support

  async execute(input: LoginFlowInput & { actorContext?: { tenantId: string; workspaceId: string; actorId: string; productId?: string } }) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.loginFlow] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // Ambil repository secara lazy, sesuai pola yang sudah diverifikasi di command sebelumnya
    const userRepository = await getUserRepositoryLazy();
    const membershipRepository = await getMembershipRepositoryLazy();
    const tenantRepository = await getTenantRepositoryLazy();
    const workspaceRepository = await getWorkspaceRepositoryLazy();
    const { sessionRepository, newSessionId } = await getSessionRepositoryLazy();

    const parsed = LoginFlowInputSchema.parse(input);
    const { email, password } = parsed;
    
    // Extract context dari actorContext (mematuhi invariant "Workspace bukan identitas/authority")
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";
    const tenantId = input.actorContext?.tenantId || "unknown-tenant";

    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      console.log(`[identity.loginFlow] Login flow initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${tenantId} for email: ${email}`);
    }

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
      actorId: ActorId(user.id as unknown as string),
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
      actorContext: input.actorContext, // Pertahankan actorContext untuk chainability antar command
    };
  },
};