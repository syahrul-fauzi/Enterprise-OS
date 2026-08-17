import {
  CommunityDiscussionAggregate,
  ContentArticleAggregate,
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
} from "../contracts/community.contracts.js";
import type { CapabilityCommand } from "@repo/core-kernel";
import { SessionRepositoryInMemory, getSessionRepositoryPostgres, initIdentitySchema } from "../../../identity/implementation/repositories/index.js";
import {
  CommunityDiscussionRepositoryInMemory,
  ContentArticleRepositoryInMemory,
  defaultContentStatus,
  defaultDiscussionStatus,
  newContentId,
  newDiscussionId,
  getContentArticleRepositoryPostgres,
  getCommunityDiscussionRepositoryPostgres,
} from "../repository/index.js";

const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

const ContentArticleStore = process.env.DATABASE_URL 
  ? getContentArticleRepositoryPostgres() 
  : ContentArticleRepositoryInMemory;
const CommunityDiscussionStore = process.env.DATABASE_URL
  ? getCommunityDiscussionRepositoryPostgres()
  : CommunityDiscussionRepositoryInMemory;

type CreateContentArticleCommand = CapabilityCommand<CreateContentArticleInput, CreateContentArticleOutput>;
type CreateCommunityDiscussionCommand = CapabilityCommand<CreateCommunityDiscussionInput, CreateCommunityDiscussionOutput>;
type PublishContentCommand = CapabilityCommand<PublishContentInput, PublishContentOutput>;

export const createContentArticle: CreateContentArticleCommand = {
  kind: "command",
  name: "legal-community.createContentArticle",
  version: "2.0.0",
  async execute(input: any) {
    // Initialize Postgres schema if using production database
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    
    // Extract sessionId from input and validate session (auto-populate isolation context)
    const { sessionId, ...contentInput } = input;
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[legal-community.createContentArticle] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId, actorId } = session;

    const entity: ContentArticleAggregate = {
      id: newContentId(),
      title: contentInput.title.trim(),
      ...(contentInput.summary !== undefined && contentInput.summary !== "" ? { summary: contentInput.summary } : {}),
      ...(contentInput.topicLabel ? { topicLabel: contentInput.topicLabel as TopicCategory } : {}),
      ...(contentInput.author ? { author: contentInput.author } : {}),
      ...(contentInput.authorAffiliation ? { authorAffiliation: contentInput.authorAffiliation } : {}),
      tenantId,
      workspaceId,
      actorId,
      status: defaultContentStatus,
      readCount: 0,
      engagementCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await ContentArticleStore.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

export const publishContent: PublishContentCommand = {
  kind: "command",
  name: "legal-community.publishContent",
  version: "2.0.0",
  async execute(input: any) {
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    const { id, sessionId } = input;
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[legal-community.publishContent] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId } = session;

    const current = await ContentArticleStore.byId(id as any);
    if (current === undefined) {
      throw new Error(`[publishContent] ContentArticle not found: ${id}`);
    }
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[legal-community.publishContent] Article does not belong to the current tenant/workspace - access denied");
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
    await ContentArticleStore.save(next);
    return { id: next.id, status: "published", publishedAt };
  },
};

export const createCommunityDiscussion: CreateCommunityDiscussionCommand = {
  kind: "command",
  name: "legal-community.createCommunityDiscussion",
  version: "2.0.0",
  async execute(input: any) {
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    const { sessionId, ...discussionInput } = input;
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[legal-community.createCommunityDiscussion] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId, actorId } = session;

    const entity: CommunityDiscussionAggregate = {
      id: newDiscussionId(),
      title: discussionInput.title.trim(),
      ...(discussionInput.summary !== undefined && discussionInput.summary !== "" ? { summary: discussionInput.summary } : {}),
      ...(discussionInput.topicLabel ? { topicLabel: discussionInput.topicLabel as TopicCategory } : {}),
      ...(discussionInput.startedBy ? { startedBy: discussionInput.startedBy } : {}),
      ...(discussionInput.startedByAffiliation ? { startedByAffiliation: discussionInput.startedByAffiliation } : {}),
      tenantId,
      workspaceId,
      actorId,
      status: defaultDiscussionStatus,
      replyCount: 0,
      viewCount: 0,
      createdAt: new Date(),
      latestActivityAt: new Date(),
    };
    await CommunityDiscussionStore.save(entity);
    return { id: entity.id, status: entity.status };
  },
};

type ArchiveContentCommand = CapabilityCommand<{ id: string; reason?: string; sessionId: string }, { id: string; status: "archived"; archivedAt: Date }>;
export const archiveContent: ArchiveContentCommand = {
  kind: "command",
  name: "legal-community.archiveContent",
  version: "2.0.0",
  async execute(input) {
    if (process.env.DATABASE_URL) {
      await initIdentitySchema();
    }
    const { id, sessionId } = input;
    const session = await sessionRepository.byId(sessionId as any);
    if (!session || session.revokedAt !== null) {
      throw new Error("[legal-community.archiveContent] Invalid or revoked session - authentication violation");
    }
    const { tenantId, workspaceId } = session;

    const current = await ContentArticleStore.byId(id as any);
    if (current === undefined) {
      throw new Error(`[archiveContent] ContentArticle not found: ${id}`);
    }
    if ((current as any).tenantId !== tenantId || (current as any).workspaceId !== workspaceId) {
      throw new Error("[legal-community.archiveContent] Article does not belong to the current tenant/workspace - access denied");
    }
    if (current.status === "archived" || current.status === "verified") {
      return {
        id: current.id,
        status: "archived" as const,
        archivedAt: current.archivedAt ?? new Date(),
      };
    }
    const archivedAt = new Date();
    const next: ContentArticleAggregate = { ...current, status: "archived", archivedAt };
    await ContentArticleStore.save(next);
    return { id: next.id, status: "archived", archivedAt };
  },
};

export const legalCommunityCommands: Readonly<Record<string, CapabilityCommand>> = {
  "legal-community.createContentArticle": createContentArticle,
  "legal-community.createCommunityDiscussion": createCommunityDiscussion,
  "legal-community.publishContent": publishContent,
  "legal-community.archiveContent": archiveContent,
} as const;

export type {
  CreateContentArticleCommand,
  CreateCommunityDiscussionCommand,
  PublishContentCommand,
};