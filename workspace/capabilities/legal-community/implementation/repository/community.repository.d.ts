import { CommunityDiscussionRepository, ContentArticleRepository, ContentId, ContentStatus, DiscussionId, DiscussionStatus, TopicCategory, TopicRepository } from "../contracts/community.contracts";
export declare const TopicRepositoryInMemory: TopicRepository;
export declare const ContentArticleRepositoryInMemory: ContentArticleRepository;
export declare const CommunityDiscussionRepositoryInMemory: CommunityDiscussionRepository;
export declare const defaultContentStatus: ContentStatus;
export declare const defaultDiscussionStatus: DiscussionStatus;
export declare const newContentId: () => ContentId;
export declare const newDiscussionId: () => DiscussionId;
export interface CommunityStats {
    readonly topicCount: number;
    readonly articleCount: number;
    readonly discussionCount: number;
    readonly topicsFeatured: readonly TopicCategory[];
    readonly topicLabels: readonly TopicCategory[];
}
export declare function readCommunityStats(): CommunityStats;
//# sourceMappingURL=community.repository.d.ts.map