console.log("[get-session-by-id.command.ts] FILE DILOAD SUKSES!");
import { z } from "zod";
import type { WorkspaceSession } from "../../../../packages/core/kernel/src/session/workspace-session.js";
import { CapabilityCommand } from "@capabilities/work-core/contracts/command.contracts.js";
import {
  validateBoundaryAccess,
  type IdentityBoundary,
  type SemanticBoundary,
  type AuthorityBoundary,
  type ExecutionBoundary,
  type EvidenceBoundary,
  type PresentationBoundary
} from "@capabilities/work-core/contracts/work.contracts.js";
import type { SessionAggregate } from "@repo/contracts-core";

// Lazy load repository untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getSessionRepositoryLazy() {
  const { SessionRepositoryInMemory, getSessionRepositoryPostgres } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getSessionRepositoryPostgres()
    : SessionRepositoryInMemory;
}

export const GetSessionByIdInputSchema = z.object({
  sessionId: z.string().min(1),
  actorContext: z.object({
    actorId: z.string().optional(),
    tenantId: z.string().optional(),
    workspaceId: z.string().optional(),
    productId: z.string().optional(),
  }).optional(),
});

export type GetSessionByIdInput = z.infer<typeof GetSessionByIdInputSchema>;

export type GetSessionByIdOutput = {
  readonly session: {
    readonly sessionId: string;
    readonly actorId: string;
    readonly actorLabel: string;
    readonly tenantId: string;
    readonly workspaceId: string;
    readonly productId: string;
    readonly isAgent: boolean;
    readonly issuedAt: string;
  };
  readonly authenticated: boolean;
  readonly actorContext?: z.infer<typeof GetSessionByIdInputSchema.shape.actorContext>;
} | undefined;

export const getSessionByIdCommand: CapabilityCommand<
  GetSessionByIdInput,
  GetSessionByIdOutput
> = {
  kind: "command",
  name: "identity.getSessionById",
  version: "4.0.0", // Updated for full 6-boundary compliance and actorContext support

  async execute(input: GetSessionByIdInput) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.getSessionById] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // 2. Inisialisasi repository setelah validasi boundary (lazy loading untuk kompatibilitas Edge Runtime)
    const sessionRepository = await getSessionRepositoryLazy();
    const parsed = GetSessionByIdInputSchema.parse(input);
    const { sessionId } = parsed;
    
    // Extract context dari actorContext (canonical pattern - mematuhi invariant "Workspace bukan identitas/authority")
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";

    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      console.log(`[identity.getSessionById] Session lookup initiated by actor ${actorId} in workspace ${workspaceId} for session ID: ${sessionId}`);
    }

    console.log(`[getSessionByIdCommand] Mencari session dengan ID: ${sessionId}`);
    
    const aggregate = await sessionRepository.byId(sessionId);
    
    if (aggregate === undefined) {
      console.log(`[getSessionByIdCommand] ❌ Session tidak ditemukan: ${sessionId}`);
      // List semua session yang ada untuk debugging
      if (typeof sessionRepository.list === 'function') {
        const allSessions = await sessionRepository.list();
        console.log(`[getSessionByIdCommand] Daftar session yang tersedia:`, allSessions.map(s => `${s.id} (actor: ${s.actorId}, tenant: ${s.tenantId}, workspace: ${s.workspaceId})`));
      }
      return undefined;
    }

    console.log(`[getSessionByIdCommand] ✅ Session ditemukan: ${aggregate.id}, actorId=${aggregate.actorId}, userId=${aggregate.userId}, tenant=${aggregate.tenantId}, workspace=${aggregate.workspaceId}`);
    
    if (aggregate.revokedAt !== null) {
      console.log(`[getSessionByIdCommand] ❌ Session telah dicabut: ${sessionId}`);
      return undefined;
    }

    const sessionIssuedAt = aggregate.issuedAt ?? new Date();
    const sessionExpiresAt = aggregate.expiresAt ?? new Date(Date.now() + 86400000);
    if (sessionExpiresAt.getTime() <= Date.now()) {
      console.log(`[getSessionByIdCommand] ❌ Session telah kedaluwarsa: ${sessionId}, expired: ${sessionExpiresAt.toISOString()}`);
      return undefined;
    }

    return {
      session: {
        sessionId: String(aggregate.id), // Konversi objek SessionId ke string primitive untuk perbandingan yang benar
        actorId: String(aggregate.actorId), // Konversi semua ID objek ke string primitive
        actorLabel: aggregate.actorLabel,
        tenantId: String(aggregate.tenantId),
        workspaceId: String(aggregate.workspaceId),
        productId: aggregate.productId,
        isAgent: aggregate.isAgent,
        issuedAt: sessionIssuedAt.toISOString(),
      },
      authenticated: true,
      actorContext: input.actorContext, // Pertahankan actorContext untuk chainability antar command
    };
  },
};