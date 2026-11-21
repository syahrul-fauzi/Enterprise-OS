// @ts-nocheck
// @ts-nocheck
import { z } from "zod";
import { getNow } from "../../../../packages/core/kernel/src/utils/time-provider.js";
import { validateBoundaryAccess } from "@repo/contracts-core";
import { getNow } from "@repo/core-kernel/time/time.provider.js";
import { WORKSPACE_SESSION_COOKIE, encodeWorkspaceSession, type WorkspaceSession } from "@repo/core-kernel";
import { slugifyForTenant } from "../services/password.service.cjs";
import {
  UserId,
  TenantId,
  WorkspaceId,
  MembershipId,
  SessionId,
  ActorId,
  type Role,
  type UserAggregate,
  type TenantAggregate,
  type WorkspaceAggregate,
  type MembershipAggregate,
} from "@repo/contracts-core";
import {
  getUserRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres,
  initIdentitySchema,
  UserRepositoryInMemory,
  SessionRepositoryInMemory,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
} from "../repositories/index.js";

const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function newUserId(): UserId { return UserId(`user-${crypto.randomUUID()}`); }
function newTenantId(): TenantId { return TenantId(`tenant-${crypto.randomUUID()}`); }
function newWorkspaceId(): WorkspaceId { return WorkspaceId(`workspace-${crypto.randomUUID()}`); }
function newMembershipId(): MembershipId { return MembershipId(`membership-${crypto.randomUUID()}`); }
function newSessionId(): SessionId { return SessionId(`session-${crypto.randomUUID()}`); }

// Production safety check - same pattern as all identity commands
if (process.env.NODE_ENV === "production" && !(process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) && process.env.EOS_SANDBOX_MODE !== "true") {
  throw new Error("[WhatsappIdentityBinding] PRODUCTION SAFETY VIOLATION: In-memory repositories cannot be used in production unless EOS_SANDBOX_MODE is enabled.");
}

// W-010 VERTICAL SLICE: Input schema untuk binding nomor WhatsApp ke identitas EOS kanonis
// Sesuai mandat: Jangan menerima identitas dari channel tanpa verifikasi
export const WhatsappIdentityBindingInputSchema = z.object({
  // Payload dari channel WhatsApp (harus diverifikasi terlebih dahulu)
  phoneNumber: z.string().regex(/^\+[1-9]\d{1,14}$/, "Nomor WhatsApp harus dalam format E.164 (contoh: +6281234567890)"),
  whatsappBusinessId: z.string().min(1, "ID Business WhatsApp harus disediakan"),
  channelVerificationToken: z.string().min(32, "Token verifikasi channel WhatsApp harus valid"),
  // Konteks tenant/workspace yang diminta (tidak langsung dipercaya - harus diverifikasi)
  requestedTenantId: z.string().optional(),
  requestedWorkspaceId: z.string().optional(),
  productId: z.enum(["lawyershub", "services-id", "ilc", "academic"]).default("services-id"),
});

export type WhatsappIdentityBindingInput = z.infer<typeof WhatsappIdentityBindingInputSchema>;

export type WhatsappIdentityBindingOutput = {
  readonly response: {
    ok: boolean;
    authenticated: boolean;
    // Identitas kanonis EOS - bukan dari payload channel!
    userId: string;
    actorId: string;
    actorLabel: string;
    // Identitas eksternal yang terikat
    externalIdentityId: string;
    externalChannel: "whatsapp";
    // Konteks terverifikasi (bukan yang diminta)
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    workspaceId: string;
    workspaceName: string;
    membershipId: string;
    sessionId: string;
    role: string;
    verificationPassed: boolean;
    verificationErrors?: string[];
    records: Array<{ ok: boolean; commandKey: string }>;
  };
  readonly cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>;
};

export type WhatsappIdentityBindingCommand = {
  kind: "command";
  name: string;
  version: string;
  execute: (input: WhatsappIdentityBindingInput) => Promise<WhatsappIdentityBindingOutput>;
};

/**
 * W-010 VERTICAL SLICE: WhatsApp External Identity Binding
 * Reuse 100% existing identity primitives: tidak menambah primitif baru ke Work Core
 * Sesuai mandat: Jangan menerima actorId/tenantId dari channel tanpa verifikasi
 * Step 5 dari 7-step channel lifecycle: Bind actor
 */
export const whatsappIdentityBindingCommand: WhatsappIdentityBindingCommand = {
  kind: "command",
  name: "identity.whatsappIdentityBinding",
  version: "1.0.0",

  async execute(input: WhatsappIdentityBindingInput): Promise<WhatsappIdentityBindingOutput> {
    // 1. Boundary compliance check (wajib untuk semua command identity)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[whatsapp-identity-binding] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    const { userRepo, tenantRepo, workspaceRepo, membershipRepo, sessionRepo } = getRepositories();
    if (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL) {
      await initIdentitySchema();
    }

    const parsed = WhatsappIdentityBindingInputSchema.parse(input);
    const { phoneNumber, whatsappBusinessId, channelVerificationToken, requestedTenantId, requestedWorkspaceId, productId = "services-id" } = parsed;
    const records: Array<{ ok: boolean; commandKey: string }> = [];
    const verificationErrors: string[] = [];

    // ==============================================
    // W-010 VERIFIKASI WAJIB (sesuai mandat: tidak percaya payload channel)
    // 1. Verifikasi token channel WhatsApp terlebih dahulu
    // ==============================================
    const validWhatsAppTokens = process.env.WHATSAPP_VERIFICATION_TOKENS?.split(",") || [];
    const isTokenValid = validWhatsAppTokens.includes(channelVerificationToken);
    records.push({ ok: isTokenValid, commandKey: "identity.verifyChannelToken" });
    
    if (!isTokenValid) {
      verificationErrors.push("Token verifikasi channel WhatsApp tidak valid");
      return {
        response: {
          ok: false,
          authenticated: false,
          userId: "",
          actorId: "",
          actorLabel: "",
          externalIdentityId: `${whatsappBusinessId}:${phoneNumber}`,
          externalChannel: "whatsapp",
          tenantId: "",
          tenantName: "",
          tenantSlug: "",
          workspaceId: "",
          workspaceName: "",
          membershipId: "",
          sessionId: "",
          role: "",
          verificationPassed: false,
          verificationErrors,
          records,
        },
        cookies: [],
      };
    }

    // ==============================================
    // 2. Cari user yang sudah terdaftar dengan nomor WhatsApp ini, atau buat baru
    // ==============================================
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    const existingUser = await userRepo.byExternalId(`whatsapp:${normalizedPhone}`);
    
    let userEntity: UserAggregate;
    if (existingUser) {
      userEntity = existingUser;
      console.log(`[whatsapp-identity-binding] Menggunakan user yang sudah ada: ${userEntity.id} untuk nomor ${phoneNumber}`);
    } else {
      // Buat user baru jika belum terdaftar (reuse pola dari signup-and-session.command.ts)
      const newUser = {
        id: newUserId(),
        email: `whatsapp_${normalizedPhone}@eos.internal`, // Email internal untuk user channel
        displayName: `Pengguna WhatsApp ${phoneNumber.slice(-4)}`,
        externalId: `whatsapp:${normalizedPhone}`, // Simpan identitas eksternal terikat
        externalChannel: "whatsapp",
        createdAt: getNow(),
        updatedAt: getNow(),
      };
      await userRepo.save(newUser);
      userEntity = newUser as unknown as UserAggregate;
      records.push({ ok: true, commandKey: "identity.createExternalUser" });
      console.log(`[whatsapp-identity-binding] User baru dibuat: ${newUser.id} untuk nomor ${phoneNumber}`);
    }

    // ==============================================
    // 3. Resolve tenant dan workspace (VERIFIKASI, tidak pakai yang diminta secara mentah)
    // ==============================================
    let tenantEntity: TenantAggregate;
    let workspaceEntity: WorkspaceAggregate;

    if (requestedTenantId) {
      // Cek apakah user memiliki akses ke tenant yang diminta (tidak langsung terima)
      const existingMembership = await membershipRepo.byUserAndTenant(userEntity.id, requestedTenantId as unknown as TenantId);
      if (existingMembership) {
        tenantEntity = await tenantRepo.byId(requestedTenantId as unknown as TenantId);
        workspaceEntity = await workspaceRepo.byId(existingMembership.workspaceId);
        records.push({ ok: true, commandKey: "identity.resolveExistingTenant" });
      } else {
        // Buat tenant baru jika tidak ada akses (sesuai onboarding flow)
        const slugBase = slugifyForTenant(`whatsapp-${phoneNumber.slice(-6)}`);
        let slug = slugBase;
        let counter = 1;
        let existingSlug = await tenantRepo.bySlug(slug);
        while (existingSlug !== undefined) {
          counter += 1;
          slug = `${slugBase}-${counter}`;
          existingSlug = await tenantRepo.bySlug(slug);
        }

        const newTenant = {
          id: newTenantId(),
          name: `Tenant WhatsApp ${phoneNumber.slice(-4)}`,
          slug,
          createdAt: getNow(),
          updatedAt: getNow(),
        };
        await tenantRepo.save(newTenant);
        tenantEntity = newTenant as unknown as TenantAggregate;

        // Buat workspace default untuk tenant ini
        const newWorkspace = {
          id: newWorkspaceId(),
          tenantId: newTenant.id,
          name: "Workspace Default WhatsApp",
          createdAt: getNow(),
          updatedAt: getNow(),
        };
        await workspaceRepo.save(newWorkspace);
        workspaceEntity = newWorkspace as unknown as WorkspaceAggregate;
        records.push({ ok: true, commandKey: "identity.createNewTenantWorkspace" });
      }
    } else {
      // Buat tenant baru jika tidak ada yang diminta
      const slugBase = slugifyForTenant(`whatsapp-${phoneNumber.slice(-6)}`);
      let slug = slugBase;
      let counter = 1;
      let existingSlug = await tenantRepo.bySlug(slug);
      while (existingSlug !== undefined) {
        counter += 1;
        slug = `${slugBase}-${counter}`;
        existingSlug = await tenantRepo.bySlug(slug);
      }

      const newTenant = {
        id: newTenantId(),
        name: `Tenant WhatsApp ${phoneNumber.slice(-4)}`,
        slug,
        createdAt: getNow(),
        updatedAt: getNow(),
      };
      await tenantRepo.save(newTenant);
      tenantEntity = newTenant as unknown as TenantAggregate;

      const newWorkspace = {
        id: newWorkspaceId(),
        tenantId: newTenant.id,
        name: "Workspace Default WhatsApp",
        createdAt: getNow(),
        updatedAt: getNow(),
      };
      await workspaceRepo.save(newWorkspace);
      workspaceEntity = newWorkspace as unknown as WorkspaceAggregate;
      records.push({ ok: true, commandKey: "identity.createNewTenantWorkspace" });
    }

    // ==============================================
    // 4. Buat membership dan session untuk user (reuse pola yang sudah ada)
    // ==============================================
    const role: Role = "merchant-operator"; // Sesuai Actor Capability Profile
    const newMembership = {
      id: newMembershipId(),
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      role,
      createdAt: getNow(),
      updatedAt: getNow(),
    };
    await membershipRepo.save(newMembership);
    records.push({ ok: true, commandKey: "identity.createMembership" });

    // Buat session baru untuk user
    const sessionId = newSessionId();
    const sessionExpiresAt = new Date(getNow().getTime() + DEFAULT_SESSION_TTL_SECONDS * 1000);
    const newSession = {
      id: sessionId,
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      actorId: ActorId(`actor-${userEntity.id}`),
      expiresAt: sessionExpiresAt,
      createdAt: getNow(),
    };
    await sessionRepo.save(newSession);
    records.push({ ok: true, commandKey: "identity.createSession" });

    // Encode session cookie (sama seperti command identity lainnya)
    const workspaceSession: WorkspaceSession = {
      sessionId: sessionId as unknown as SessionId,
      userId: userEntity.id,
      tenantId: tenantEntity.id,
      workspaceId: workspaceEntity.id,
      actorId: newSession.actorId,
    };
    const encodedSession = encodeWorkspaceSession(workspaceSession);

    // ==============================================
    // 5. Return response dengan identitas KANONIS EOS (bukan dari channel)
    // ==============================================
    return {
      response: {
        ok: true,
        authenticated: true,
        userId: userEntity.id,
        actorId: newSession.actorId,
        actorLabel: userEntity.displayName,
        externalIdentityId: `whatsapp:${normalizedPhone}`,
        externalChannel: "whatsapp",
        tenantId: tenantEntity.id,
        tenantName: tenantEntity.name,
        tenantSlug: tenantEntity.slug,
        workspaceId: workspaceEntity.id,
        workspaceName: workspaceEntity.name,
        membershipId: newMembership.id,
        sessionId: sessionId,
        role,
        verificationPassed: verificationErrors.length === 0,
        verificationErrors: verificationErrors.length > 0 ? verificationErrors : undefined,
        records,
      },
      cookies: [{
        name: WORKSPACE_SESSION_COOKIE,
        value: encodedSession,
        options: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: sessionExpiresAt,
        },
      }],
    };
  },
};

// Lazy repository initialization (sama pattern seperti semua identity commands)
function getRepositories() {
  const hasDbConnection = process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL;
  return {
    userRepo: hasDbConnection ? getUserRepositoryPostgres() : UserRepositoryInMemory,
    tenantRepo: hasDbConnection ? getTenantRepositoryPostgres() : TenantRepositoryInMemory,
    workspaceRepo: hasDbConnection ? getWorkspaceRepositoryPostgres() : WorkspaceRepositoryInMemory,
    membershipRepo: hasDbConnection ? getMembershipRepositoryPostgres() : MembershipRepositoryInMemory,
    sessionRepo: hasDbConnection ? getSessionRepositoryPostgres() : SessionRepositoryInMemory,
  };
}