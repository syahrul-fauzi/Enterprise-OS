import {
  CommunityDiscussionAggregate,
  CommunityDiscussionRepository,
  ContentArticleAggregate,
  ContentArticleRepository,
  ContentId,
  ContentStatus,
  CreateCommunityDiscussionInput,
  CreateCommunityDiscussionOutput,
  CreateContentArticleInput,
  CreateContentArticleOutput,
  DiscussionId,
  DiscussionStatus,
  PublishContentInput,
  PublishContentOutput,
  TopicCategory,
} from "../contracts/community.contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
import {
  CommunityDiscussionRepositoryInMemory,
  ContentArticleRepositoryInMemory,
  defaultContentStatus,
  defaultDiscussionStatus,
  newContentId,
  newDiscussionId,
} from "../repository/community.repository";

type CreateContentArticleCommand = CapabilityCommand<CreateContentArticleInput, CreateContentArticleOutput>;
type CreateCommunityDiscussionCommand = CapabilityCommand<CreateCommunityDiscussionInput, CreateCommunityDiscussionOutput>;
type PublishContentCommand = CapabilityCommand<PublishContentInput, PublishContentOutput>;

export const createContentArticle: CreateContentArticleCommand = {
  kind: "command",
  name: "legal-community.createContentArticle",
  version: "0.1.0",
  execute(input) {
    const entity: ContentArticleAggregate = {
      id: newContentId(),
      title: input.title.trim(),
      ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
      ...(input.topicLabel ? { topicLabel: input.topicLabel as TopicCategory } : {}),
      ...(input.author ? { author: input.author } : {}),
      ...(input.authorAffiliation ? { authorAffiliation: input.authorAffiliation } : {}),
      status: defaultContentStatus,
      readCount: 0,
      engagementCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    ContentArticleRepositoryInMemory.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const publishContent: PublishContentCommand = {
  kind: "command",
  name: "legal-community.publishContent",
  version: "0.1.0",
  execute(input) {
    const current = ContentArticleRepositoryInMemory.byId(input.id);
    if (current === undefined) {
      throw new Error(`[publishContent] ContentArticle not found: ${input.id}`);
    }
    if (current.status === "published" || current.status === "verified") {
      return {
        id: current.id,
        status: "published" as const,
        publishedAt: current.publishedAt ?? new Date(),
      };
    }
    const publishedAt = new Date();
    const next: ContentArticleAggregate = { ...current, status: "published", publishedAt };
    ContentArticleRepositoryInMemory.save(next);
    return { id: next.id, status: "published", publishedAt };
  },
};

export const createCommunityDiscussion: CreateCommunityDiscussionCommand = {
  kind: "command",
  name: "legal-community.createCommunityDiscussion",
  version: "0.1.0",
  execute(input) {
    const entity: CommunityDiscussionAggregate = {
      id: newDiscussionId(),
      title: input.title.trim(),
      ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
      ...(input.topicLabel ? { topicLabel: input.topicLabel as TopicCategory } : {}),
      ...(input.startedBy ? { startedBy: input.startedBy } : {}),
      ...(input.startedByAffiliation ? { startedByAffiliation: input.startedByAffiliation } : {}),
      status: defaultDiscussionStatus,
      replyCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      latestActivityAt: new Date(),
    };
    CommunityDiscussionRepositoryInMemory.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const legalCommunityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "legal-community.createContentArticle": createContentArticle,
  "legal-community.createCommunityDiscussion": createCommunityDiscussion,
  "legal-community.publishContent": publishContent,
} as const;

export type {
  CreateContentArticleCommand,
  CreateCommunityDiscussionCommand,
  PublishContentCommand,
};
