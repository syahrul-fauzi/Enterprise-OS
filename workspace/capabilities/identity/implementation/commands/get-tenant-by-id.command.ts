import type { CapabilityCommand } from "../../../capability-dispatch/contracts/command.contracts.js";
import { z } from "zod";
import {
  TenantId,
} from "@repo/contracts-core";
import {
  validateBoundaryAccess,
  type IdentityBoundary,
  type SemanticBoundary,
  type AuthorityBoundary,
  type ExecutionBoundary,
  type EvidenceBoundary,
  type PresentationBoundary
} from "@capabilities/work-core/contracts/work.contracts.js";
import type { TenantAggregate } from "@repo/contracts-core";

// Lazy load repository untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getTenantRepositoryLazy() {
  const { getTenantRepositoryPostgres, TenantRepositoryInMemory } = await import("../repositories/index.js");
  return (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
    ? getTenantRepositoryPostgres()
    : TenantRepositoryInMemory;
}

export const GetTenantByIdInputSchema = z.object({
  tenantId: z.string().min(1),
});

export type GetTenantByIdInput = z.infer<typeof GetTenantByIdInputSchema>;

export type GetTenantByIdOutput = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: string;
  readonly metadata?: Record<string, any>; // AC-PILOT-001: Kembalikan metadata untuk batas biaya/konfigurasi
} | undefined;

type GetTenantByIdCommand = CapabilityCommand<
  GetTenantByIdInput,
  GetTenantByIdOutput
>;

export const getTenantByIdCommand: GetTenantByIdCommand = {
  kind: "command",
  name: "identity.getTenantById",
  version: "3.0.0", // Architecturally compliant version

  async execute(input: GetTenantByIdInput) {
    // 1. Validasi 6-boundary compliance terlebih dahulu (Tahap B mandate)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[identity.getTenantById] BOUNDARY ACCESS DENIED: identity domain cannot access work-core directly");
      throw new Error("Boundary access violation: domain identity tidak diizinkan mengakses domain work-core");
    }

    // Lazy load repository terlebih dahulu
    const tenantRepository = await getTenantRepositoryLazy();
    const parsed = GetTenantByIdInputSchema.parse(input);
    const tenant = await tenantRepository.byId(TenantId(parsed.tenantId));
    
    if (!tenant) {
      return undefined;
    }

    const tenantCreatedAt = tenant.createdAt ?? new Date();
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenantCreatedAt.toISOString(),
      metadata: tenant.metadata, // AC-PILOT-001: Sertakan metadata dari tenant untuk akses batas biaya
    };
  },
};