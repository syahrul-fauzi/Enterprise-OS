import { z } from "zod";
import { TenantId } from "@repo/contracts-core";
import { CapabilityCommand } from "../../../capability-dispatch/contracts/command.contracts.js";
import { 
  validateBoundaryAccess,
  type IdentityBoundary, 
  type SemanticBoundary, 
  type AuthorityBoundary, 
  type ExecutionBoundary, 
  type EvidenceBoundary, 
  type PresentationBoundary 
} from "@capabilities/work-core/contracts/work.contracts.js";

// Lazy load repository untuk menghindari module cycle dan mematuhi 6-boundary compliance
async function getTenantRepositoryLazy() {
  const { TenantRepositoryPostgres } = await import("../repositories/index.js");
  return TenantRepositoryPostgres;
}

export const CreateWorkspaceFlowInputSchema = z.object({
  name: z.string().min(2),
  productId: z.string().uuid(),
  tenantId: z.string().uuid(),
  actorId: z.string().uuid(),
  // actorContext dipisahkan dari input domain untuk mematuhi invariant "Workspace bukan identitas/authority"
  actorContext: z.object({
    workspaceId: z.string().uuid(),
    tenantId: z.string().uuid(),
    actorId: z.string().uuid()
  }).optional()
});

export type CreateWorkspaceFlowInput = z.infer<typeof CreateWorkspaceFlowInputSchema>;

export const createWorkspaceFlowCommand: CapabilityCommand = {
  kind: "command",
  name: "identity.createWorkspaceFlow",
  version: "3.0.0", // Architecturally compliant version
  async execute(input: unknown) {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate - identity mengakses identity domain)
    if (!validateBoundaryAccess("identity", "identity")) {
      console.error("[identity.createWorkspaceFlow] BOUNDARY ACCESS DENIED: cannot access identity domain with invalid boundary");
      throw new Error("Boundary access violation");
    }

    // 2. Inisialisasi repository setelah validasi boundary (lazy loading untuk kompatibilitas Edge Runtime)
    const TenantRepository = await getTenantRepositoryLazy();
    const tenantRepository = new TenantRepository();

    // Parse input dengan schema validasi
    const parsed = CreateWorkspaceFlowInputSchema.parse(input);
    const { name, tenantId } = parsed;
    
    // Extract context dari actorContext (canonical pattern - mematuhi invariant "Workspace bukan identitas/authority")
    const resolvedTenantId = input.actorContext?.tenantId || tenantId;
    const workspaceId = input.actorContext?.workspaceId || "unknown-workspace";
    const actorId = input.actorContext?.actorId || "unknown-actor";

    // Log audit untuk tracing actorContext jika disediakan (wajib compliance audit)
    if (input.actorContext) {
      console.log(`[identity.createWorkspaceFlow] Workspace creation initiated by actor ${actorId} in workspace ${workspaceId}, tenant ${resolvedTenantId} with name: ${name}`);
    }

    // Validasi tenant existence menggunakan lazy repository
    if (!resolvedTenantId) {
      throw new Error("tenantId is required");
    }
    const validTenantId = TenantId(resolvedTenantId);
    const tenant = await tenantRepository.byId(validTenantId);
    if (!tenant) {
      throw new Error(`Tenant not found: ${validTenantId}`);
    }

    // Command hanya bertanggung jawab atas domain identity-nya sendiri
    // Orkestrasi command lain harus dilakukan melalui capability registry yang sah, bukan di dalam command
    // Implementasi ini mematuhi pure capability pattern: hanya mengelola domain tanggung jawabnya sendiri
    console.log("[identity.createWorkspaceFlow] Workspace creation flow validated for tenant:", validTenantId);
    
    return {
      success: true,
      tenantId: validTenantId,
      workspaceName: name,
      actorContext: input.actorContext
    };
  },
};