import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import {
  UserId,
  TenantId,
  WorkspaceId,
} from "../contracts/identity.contracts";
import {
  getUserRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getTenantRepositoryPostgres,
} from "../repositories/index";

export const LoginFlowInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginFlowInput = z.infer<typeof LoginFlowInputSchema>;

export type LoginFlowOutput = {
  readonly authenticated: boolean;
  readonly userId: string;
  readonly actorId: string;
  readonly actorLabel: string;
  readonly tenantId: string;
  readonly workspaceId: string;
  readonly productId: string;
  readonly sessionId: string;
  readonly email: string;
};

type LoginFlowCommand = CapabilityCommand<LoginFlowInput, LoginFlowOutput>;

export const loginFlowCommand: LoginFlowCommand = {
  kind: "command",
  name: "identity.loginFlow",
  version: "2.0.0", // Postgres-backed persistence

  async execute(input) {
    const parsed = LoginFlowInputSchema.parse(input);
    const { email, password } = parsed;

    // Lazy import capabilityRegistry to avoid circular initialization
    const { capabilityRegistry } = await import("@repo/core-kernel");
    
    // First authenticate user via core auth command (uses Postgres)
    const authResult = await capabilityRegistry.invokeAsync("identity", "authenticateUser", { email, password });

    const authOutput = authResult.output;
    if (!authOutput.authenticated || !authOutput.userId) {
      throw new Error("Invalid email or password");
    }

    // Resolve all entities from repositories (supports both in-memory and Postgres via lazy loaders)
    const userId = UserId(authOutput.userId);
    const user = await getUserRepositoryPostgres().byId(userId);
    const memberships = await getMembershipRepositoryPostgres().listByUser(userId);
    const primaryMembership = memberships[0];
    
    const tenantIdStr = authOutput.tenantId ?? primaryMembership?.tenantId ?? "tenant.anonymous";
    const workspaceIdStr = authOutput.workspaceId ?? primaryMembership?.workspaceId ?? "professional-workspace.anonymous";
    
    const workspace = await getWorkspaceRepositoryPostgres().byId(WorkspaceId(workspaceIdStr));
    const tenant = await getTenantRepositoryPostgres().byId(TenantId(tenantIdStr));
    const actorLabel = authOutput.actorLabel ?? user?.displayName ?? "User";
    const productId = authOutput.productId ?? workspace?.productId ?? "services-id.default";
    const sessionId = authOutput.session?.sessionId ?? "";

    return {
      authenticated: true,
      userId: authOutput.userId,
      actorId: authOutput.userId,
      actorLabel,
      tenantId: tenantIdStr,
      workspaceId: workspaceIdStr,
      productId,
      sessionId,
      email,
    };
  },
};