export type ContentStatus =
  | "proposed"
  | "accepted"
  | "in_production"
  | "published"
  | "archived"
  | "verified";

export type DiscussionStatus = "open" | "locked" | "featured";

export type TopicCategory =
  | "Hukum Perusahaan"
  | "Hukum Perdata"
  | "Hukum Pidana"
  | "Hukum Keluarga"
  | "Hukum Internasional"
  | "Hukum Teknologi Digital"
  | "Hukum Ketenagakerjaan"
  | "Hukum Tata Negara";

export type TopicId = string & { readonly __topicId: unique symbol };
export function TopicId(value: string): TopicId {
  return value as TopicId;
}

export type ContentId = string & { readonly __contentId: unique symbol };
export function ContentId(value: string): ContentId {
  return value as ContentId;
}

export type DiscussionId = string & { readonly __discussionId: unique symbol };
export function DiscussionId(value: string): DiscussionId {
  return value as DiscussionId;
}

export interface CreateContentArticleInput {
  readonly title: string;
  readonly summary?: string;
  readonly topicLabel?: TopicCategory;
  readonly author?: string;
  readonly authorAffiliation?: string;
}

export interface CreateContentArticleOutput {
  readonly id: ContentId;
  readonly status: ContentStatus;
}

export interface CreateCommunityDiscussionInput {
  readonly title: string;
  readonly summary?: string;
  readonly topicLabel?: TopicCategory;
  readonly startedBy?: string;
  readonly startedByAffiliation?: string;
}

export interface CreateCommunityDiscussionOutput {
  readonly id: DiscussionId;
  readonly status: DiscussionStatus;
}

export interface PublishContentInput {
  readonly id: ContentId;
}

export interface PublishContentOutput {
  readonly id: ContentId;
  readonly status: "published";
  readonly publishedAt: Date;
}

export interface TopicAggregate {
  readonly id: TopicId;
  readonly label: TopicCategory;
  readonly slug: string;
  readonly description: string;
  readonly contentCount: number;
  readonly discussionCount: number;
  readonly featured: boolean;
  readonly createdAt: Readonly<Date>;
}

export interface ContentArticleAggregate {
  readonly id: ContentId;
  readonly title: string;
  readonly summary?: string;
  readonly topicId?: TopicId;
  readonly topicLabel?: TopicCategory;
  readonly author?: string;
  readonly authorAffiliation?: string;
  readonly status: ContentStatus;
  readonly readCount: number;
  readonly engagementCount: number;
  readonly createdAt: Readonly<Date>;
  readonly updatedAt: Readonly<Date>;
  readonly publishedAt?: Readonly<Date>;
}

export interface CommunityDiscussionAggregate {
  readonly id: DiscussionId;
  readonly title: string;
  readonly summary?: string;
  readonly topicLabel?: TopicCategory;
  readonly startedBy?: string;
  readonly startedByAffiliation?: string;
  readonly status: DiscussionStatus;
  readonly replyCount: number;
  readonly viewCount: number;
  readonly createdAt: Readonly<Date>;
  readonly latestActivityAt: Readonly<Date>;
}

export type TopicRepository = {
  readonly entityName: "Topic";
  readonly kind: "repository";
  byId(id: TopicId): TopicAggregate | undefined;
  list(): readonly TopicAggregate[];
  listFeatured(): readonly TopicAggregate[];
  save(entity: TopicAggregate): TopicAggregate;
  remove(id: TopicId): boolean;
};

export type ContentArticleRepository = {
  readonly entityName: "ContentArticle";
  readonly kind: "repository";
  byId(id: ContentId): ContentArticleAggregate | undefined;
  list(): readonly ContentArticleAggregate[];
  listByTopic(topicLabel: TopicCategory): readonly ContentArticleAggregate[];
  listPublished(limit?: number): readonly ContentArticleAggregate[];
  save(entity: ContentArticleAggregate): ContentArticleAggregate;
  remove(id: ContentId): boolean;
};

export type CommunityDiscussionRepository = {
  readonly entityName: "CommunityDiscussion";
  readonly kind: "repository";
  byId(id: DiscussionId): CommunityDiscussionAggregate | undefined;
  list(): readonly CommunityDiscussionAggregate[];
  listLatest(limit?: number): readonly CommunityDiscussionAggregate[];
  save(entity: CommunityDiscussionAggregate): CommunityDiscussionAggregate;
  remove(id: DiscussionId): boolean;
};
