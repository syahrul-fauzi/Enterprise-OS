import { CommunityDiscussionRepositoryInMemory, ContentArticleRepositoryInMemory, defaultContentStatus, defaultDiscussionStatus, newContentId, newDiscussionId, } from "../repository/community.repository";
export const createContentArticle = {
    kind: "command",
    name: "legal-community.createContentArticle",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: newContentId(),
            title: input.title.trim(),
            ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
            ...(input.topicLabel ? { topicLabel: input.topicLabel } : {}),
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
export const publishContent = {
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
                status: "published",
                publishedAt: current.publishedAt ?? new Date(),
            };
        }
        const publishedAt = new Date();
        const next = { ...current, status: "published", publishedAt };
        ContentArticleRepositoryInMemory.save(next);
        return { id: next.id, status: "published", publishedAt };
    },
};
export const createCommunityDiscussion = {
    kind: "command",
    name: "legal-community.createCommunityDiscussion",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: newDiscussionId(),
            title: input.title.trim(),
            ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
            ...(input.topicLabel ? { topicLabel: input.topicLabel } : {}),
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
export const legalCommunityCommands = {
    "legal-community.createContentArticle": createContentArticle,
    "legal-community.createCommunityDiscussion": createCommunityDiscussion,
    "legal-community.publishContent": publishContent,
};
