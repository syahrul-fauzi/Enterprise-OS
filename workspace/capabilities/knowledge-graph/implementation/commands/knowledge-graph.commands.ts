import type { CapabilityCommand } from "@repo/core-kernel";
import { z } from "zod";
import { getKnowledgeGraphRepositoryPostgres } from "../repository/knowledge-graph.postgres.repository.js";
import type { KnowledgeGraphSnapshot } from "../contracts/index.js";

// Schema untuk get graph by workId
const GetGraphByWorkIdSchema = z.object({
  workId: z.string().min(1),
  sessionId: z.string().min(1),
});

type GetGraphByWorkIdCommand = CapabilityCommand<
  z.infer<typeof GetGraphByWorkIdSchema>,
  Promise<KnowledgeGraphSnapshot>
>;

// Register command ke capability registry
export const registerKnowledgeGraphCommands = async () => {
  const { capabilityRegistry } = await import("../../../../packages/core/kernel/src/registry/capability-command-registry.js");
  
  // Command get-graph-by-work-id
  const getGraphByWorkId: GetGraphByWorkIdCommand["execute"] = async (input) => {
    const repository = getKnowledgeGraphRepositoryPostgres();
    // CORE-001: loadSnapshot hanya menggunakan workId sebagai filter utama
    return repository.loadSnapshot(input.tenantId || "tenant.test", { workId: input.workId });
  };

  await capabilityRegistry.register("knowledge-graph", "get-graph-by-work-id", {
    execute: getGraphByWorkId,
    schema: GetGraphByWorkIdSchema,
  });
};

// Initialize commands saat module diimport
registerKnowledgeGraphCommands().catch((err) => {
  console.error("[KnowledgeGraph] Failed to register commands:", err);
});