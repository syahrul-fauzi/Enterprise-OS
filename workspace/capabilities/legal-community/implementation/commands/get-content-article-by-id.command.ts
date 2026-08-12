import { z } from "zod";
import type { CapabilityCommand } from "@repo/core-kernel";
import { ContentArticleRepositoryInMemory } from "../repository/community.repository";
import type { ContentId } from "../contracts/community.contracts";

export const GetContentArticleByIdInputSchema = z.object({
  contentId: z.string().min(1).startsWith("content-"),
});

export type GetContentArticleByIdInput = z.infer<typeof GetContentArticleByIdInputSchema>;

export type GetContentArticleByIdOutput = {
  readonly type: "ilc.article";
  readonly id: string;
  readonly displayTitle: string;
  readonly displaySubtitle: string;
  readonly rawStatus: string;
  readonly owner: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly evidenceCount: number;
  readonly topicLabel: string | undefined;
  readonly authorAffiliation: string | undefined;
  readonly readCount: number;
  readonly engagementCount: number;
} | undefined;

export const getContentArticleByIdCommand: CapabilityCommand = {
  kind: "command",
  name: "contentArticle.getById",
  version: "1.0.0",
  execute(input: unknown) {
    const parsed = GetContentArticleByIdInputSchema.parse(input);
    const { contentId } = parsed;

    const a = ContentArticleRepositoryInMemory.byId(contentId as unknown as ContentId);
    if (a === undefined) {
      return undefined;
    }

    return {
      type: "ilc.article",
      id: contentId,
      displayTitle: a.title,
      displaySubtitle: a.summary ?? "Legal Community Article / Content",
      rawStatus: a.status,
      owner: a.author,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      evidenceCount: a.topicLabel ? 1 : 0,
      topicLabel: a.topicLabel,
      authorAffiliation: a.authorAffiliation,
      readCount: a.readCount,
      engagementCount: a.engagementCount,
    };
  },
};