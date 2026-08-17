import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { 
  CommunityDiscussionRepositoryInMemory, 
  getCommunityDiscussionRepositoryPostgres
} from "../repository/index.js";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres } from "../../../identity/implementation/repositories/index.js";
import type { DiscussionId } from "../contracts/community.contracts.js";
import { initIdentitySchema } from "../../../identity/implementation/repositories/base.repository.js";

// Environment-based repository toggle (production rail pattern)
const discussionRepository = process.env.DATABASE_URL 
  ? getCommunityDiscussionRepositoryPostgres() 
  : CommunityDiscussionRepositoryInMemory;
const sessionRepository = process.env.DATABASE_URL 
  ? getSessionRepositoryPostgres() 
  : SessionRepositoryInMemory;

export const GetCommunityDiscussionByIdInputSchema = z.object({
  discussionId: z.string().min(1).startsWith("disc-"),
  sessionId: z.string().min(1),
});

export type GetCommunityDiscussionByIdInput = z.infer<typeof GetCommunityDiscussionByIdInputSchema>;

export type GetCommunityDiscussionByIdOutput = {
  readonly type: "ilc.discussion";
  readonly id: string;
  readonly displayTitle: string;
  readonly displaySubtitle: string;
  readonly rawStatus: string;
  readonly owner: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly evidenceCount: number;
  readonly topicLabel: string | undefined;
  readonly startedByAffiliation: string | undefined;
  readonly replyCount: number;
  readonly viewCount: number;
} | undefined;

export const getCommunityDiscussionByIdCommand: CapabilityCommand<GetCommunityDiscussionByIdInput, Promise<GetCommunityDiscussionByIdOutput>> = {
  kind: "command",
  name: "communityDiscussion.getById",
  version: "2.0.0",
  async execute(input: unknown) {
    // Initialize Postgres schema only when in production mode
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    
    const parsed = GetCommunityDiscussionByIdInputSchema.parse(input);
    const { discussionId, sessionId } = parsed;

    // Validate session exists and is active (authentication + tenant isolation foundation)
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[communityDiscussion.getById] Invalid or revoked session - authentication violation");
    }

    // Auto-populate isolation context from trusted session
    const { tenantId, workspaceId, actorId } = session;

    const d = await discussionRepository.byId(discussionId as unknown as DiscussionId);
    if (d === undefined) {
      return undefined;
    }

    // Tenant isolation enforcement: ensure discussion belongs to current tenant/workspace
    if ((d as any).tenantId !== tenantId || (d as any).workspaceId !== workspaceId) {
      throw new Error("[communityDiscussion.getById] Discussion does not belong to the current tenant/workspace - access denied");
    }

    return {
      type: "ilc.discussion",
      id: discussionId,
      displayTitle: d.title,
      displaySubtitle: d.summary ?? "Community Discussion",
      rawStatus: d.status,
      owner: d.startedBy,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.latestActivityAt.toISOString(),
      evidenceCount: d.topicLabel ? 1 : 0,
      topicLabel: d.topicLabel,
      startedByAffiliation: d.startedByAffiliation,
      replyCount: d.replyCount,
      viewCount: d.viewCount,
    };
  },
};