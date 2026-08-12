import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { CommunityDiscussionRepositoryInMemory } from "../repository/community.repository";
import type { DiscussionId } from "../contracts/community.contracts";

export const GetCommunityDiscussionByIdInputSchema = z.object({
  discussionId: z.string().min(1).startsWith("disc-"),
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

export const getCommunityDiscussionByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "communityDiscussion.getById",
  version: "1.0.0",
  execute(input: unknown) {
    const parsed = GetCommunityDiscussionByIdInputSchema.parse(input);
    const { discussionId } = parsed;

    const d = CommunityDiscussionRepositoryInMemory.byId(discussionId as unknown as DiscussionId);
    if (d === undefined) {
      return undefined;
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