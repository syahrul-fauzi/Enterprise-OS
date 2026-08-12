import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import {
  TenantId,
} from "../contracts/identity.contracts";
import { TenantRepositoryPostgres } from "../repositories";

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

  async execute(input) {
    const parsed = GetTenantByIdInputSchema.parse(input);
    const tenant = await TenantRepositoryPostgres.byId(TenantId(parsed.tenantId));
    
    if (!tenant) {
      return undefined;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt.toISOString(),
    };
  },
};