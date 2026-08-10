"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legalCommunityCommands = exports.createCommunityDiscussion = exports.publishContent = exports.createContentArticle = void 0;
const community_repository_1 = require("../repository/community.repository");
exports.createContentArticle = {
    kind: "command",
    name: "legal-community.createContentArticle",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: (0, community_repository_1.newContentId)(),
            title: input.title.trim(),
            ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
            ...(input.topicLabel ? { topicLabel: input.topicLabel } : {}),
            ...(input.author ? { author: input.author } : {}),
            ...(input.authorAffiliation ? { authorAffiliation: input.authorAffiliation } : {}),
            status: community_repository_1.defaultContentStatus,
            readCount: 0,
            engagementCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        community_repository_1.ContentArticleRepositoryInMemory.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
exports.publishContent = {
    kind: "command",
    name: "legal-community.publishContent",
    version: "0.1.0",
    execute(input) {
        const current = community_repository_1.ContentArticleRepositoryInMemory.byId(input.id);
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
        community_repository_1.ContentArticleRepositoryInMemory.save(next);
        return { id: next.id, status: "published", publishedAt };
    },
};
exports.createCommunityDiscussion = {
    kind: "command",
    name: "legal-community.createCommunityDiscussion",
    version: "0.1.0",
    execute(input) {
        const entity = {
            id: (0, community_repository_1.newDiscussionId)(),
            title: input.title.trim(),
            ...(input.summary !== undefined && input.summary !== "" ? { summary: input.summary } : {}),
            ...(input.topicLabel ? { topicLabel: input.topicLabel } : {}),
            ...(input.startedBy ? { startedBy: input.startedBy } : {}),
            ...(input.startedByAffiliation ? { startedByAffiliation: input.startedByAffiliation } : {}),
            status: community_repository_1.defaultDiscussionStatus,
            replyCount: 0,
            viewCount: 0,
            createdAt: new Date(),
            latestActivityAt: new Date(),
        };
        community_repository_1.CommunityDiscussionRepositoryInMemory.save(entity);
        return { id: entity.id, status: entity.status };
    },
};
exports.legalCommunityCommands = {
    "legal-community.createContentArticle": exports.createContentArticle,
    "legal-community.createCommunityDiscussion": exports.createCommunityDiscussion,
    "legal-community.publishContent": exports.publishContent,
};
