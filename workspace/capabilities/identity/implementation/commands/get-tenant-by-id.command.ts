import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import {
  TenantId,
} from "../contracts/index.js";
import { getTenantRepositoryPostgres, TenantRepositoryInMemory } from "../repositories/index.js";

const tenantRepository = (process.env.POSTGRES_CONNECTION_STRING || process.env.DATABASE_URL)
  ? getTenantRepositoryPostgres()
  : TenantRepositoryInMemory;

export const GetTenantByIdInputSchema = z.object({
  tenantId: z.string().min(1),
});

export type GetTenantByIdInput = z.infer<typeof GetTenantByIdInputSchema>;

export type GetTenantByIdOutput = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: string;
} | undefined;

type GetTenantByIdCommand = CapabilityCommand<
  GetTenantByIdInput,
  GetTenantByIdOutput
>;

export const getTenantByIdCommand: GetTenantByIdCommand = {
  kind: "command",
  name: "identity.getTenantById",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input: GetTenantByIdInput) {
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
    };
  },
};