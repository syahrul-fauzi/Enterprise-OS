import { PostgresRepository } from "../../../identity/implementation/repositories/base.repository";
import {
  ContentId,
  DiscussionId,
  type ContentArticleAggregate,
  type CommunityDiscussionAggregate,
  type ContentArticleRepository,
  type CommunityDiscussionRepository,
  ContentStatus,
  DiscussionStatus,
  TopicCategory,
} from "../contracts/community.contracts";

// PostgreSQL-backed content article repository implementation
class ContentArticleRepositoryPostgresImpl extends PostgresRepository<any> implements ContentArticleRepository {
  readonly entityName = "ContentArticle" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("content_articles");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): ContentArticleAggregate {
    return {
      id: ContentId(record.id),
      title: record.title,
      ...(record.summary && { summary: record.summary }),
      ...(record.topic_label && { topicLabel: record.topic_label as TopicCategory }),
      ...(record.author && { author: record.author }),
      ...(record.author_affiliation && { authorAffiliation: record.author_affiliation }),
      status: record.status as ContentStatus,
      readCount: record.read_count || 0,
      engagementCount: record.engagement_count || 0,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      ...(record.published_at && { publishedAt: new Date(record.published_at) }),
      ...(record.archived_at && { archivedAt: new Date(record.archived_at) }),
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
    } as ContentArticleAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: ContentArticleAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      ...(entity.summary && { summary: entity.summary }),
      ...(entity.topicLabel && { topic_label: entity.topicLabel }),
      ...(entity.author && { author: entity.author }),
      ...(entity.authorAffiliation && { author_affiliation: entity.authorAffiliation }),
      status: entity.status,
      read_count: entity.readCount,
      engagement_count: entity.engagementCount,
      tenant_id: (entity as any).tenantId,
      workspace_id: (entity as any).workspaceId,
      actor_id: (entity as any).actorId,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
      ...(entity.publishedAt && { published_at: entity.publishedAt }),
      ...(entity.archivedAt && { archived_at: entity.archivedAt }),
    };
  }

  // Implement required interface methods
  async byId(id: ContentId): Promise<ContentArticleAggregate | undefined> {
    const record = await super.byId(id);
    return record ? this.toAggregate(record) : undefined;
  }

  async save(entity: ContentArticleAggregate): Promise<ContentArticleAggregate> {
    const record = this.toRecord(entity);
    await super.save(record as any);
    return entity;
  }
}

// PostgreSQL-backed community discussion repository implementation
class CommunityDiscussionRepositoryPostgresImpl extends PostgresRepository<any> implements CommunityDiscussionRepository {
  readonly entityName = "CommunityDiscussion" as const;
  readonly kind = "repository" as const;

  constructor() {
    super("community_discussions");
  }

  // Convert database record to domain aggregate
  private toAggregate(record: any): CommunityDiscussionAggregate {
    return {
      id: DiscussionId(record.id),
      title: record.title,
      ...(record.summary && { summary: record.summary }),
      ...(record.topic_label && { topicLabel: record.topic_label as TopicCategory }),
      ...(record.started_by && { startedBy: record.started_by }),
      ...(record.started_by_affiliation && { startedByAffiliation: record.started_by_affiliation }),
      status: record.status as DiscussionStatus,
      replyCount: record.reply_count || 0,
      viewCount: record.view_count || 0,
      createdAt: new Date(record.created_at),
      latestActivityAt: new Date(record.latest_activity_at),
      tenantId: record.tenant_id,
      workspaceId: record.workspace_id,
      actorId: record.actor_id,
    } as CommunityDiscussionAggregate;
  }

  // Convert domain aggregate to database record
  private toRecord(entity: CommunityDiscussionAggregate): any {
    return {
      id: entity.id,
      title: entity.title,
      ...(entity.summary && { summary: entity.summary }),
      ...(entity.topicLabel && { topic_label: entity.topicLabel }),
      ...(entity.startedBy && { started_by: entity.startedBy }),
      ...(entity.startedByAffiliation && { started_by_affiliation: entity.startedByAffiliation }),
      status: entity.status,
      reply_count: entity.replyCount,
      view_count: entity.viewCount,
      tenant_id: (entity as any).tenantId,
      workspace_id: (entity as any).workspaceId,
      actor_id: (entity as any).actorId,
      created_at: entity.createdAt,
      latest_activity_at: entity.latestActivityAt,
    };
  }

  // Implement required interface methods
  async byId(id: DiscussionId): Promise<CommunityDiscussionAggregate | undefined> {
    const record = await super.byId(id);
    return record ? this.toAggregate(record) : undefined;
  }

  async save(entity: CommunityDiscussionAggregate): Promise<CommunityDiscussionAggregate> {
    const record = this.toRecord(entity);
    await super.save(record as any);
    return entity;
  }
}

// Export factory functions to get repository instances (environment-aware)
export function getContentArticleRepositoryPostgres(): ContentArticleRepository {
  return new ContentArticleRepositoryPostgresImpl();
}

export function getCommunityDiscussionRepositoryPostgres(): CommunityDiscussionRepository {
  return new CommunityDiscussionRepositoryPostgresImpl();
}