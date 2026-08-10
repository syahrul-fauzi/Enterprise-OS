import { CreateCommunityDiscussionInput, CreateCommunityDiscussionOutput, CreateContentArticleInput, CreateContentArticleOutput, PublishContentInput, PublishContentOutput } from "../contracts/community.contracts";
import type { CapabilityCommand } from "@repo/core-kernel";
type CreateContentArticleCommand = CapabilityCommand<CreateContentArticleInput, CreateContentArticleOutput>;
type CreateCommunityDiscussionCommand = CapabilityCommand<CreateCommunityDiscussionInput, CreateCommunityDiscussionOutput>;
type PublishContentCommand = CapabilityCommand<PublishContentInput, PublishContentOutput>;
export declare const createContentArticle: CreateContentArticleCommand;
export declare const publishContent: PublishContentCommand;
export declare const createCommunityDiscussion: CreateCommunityDiscussionCommand;
export declare const legalCommunityCommands: Readonly<Record<string, CapabilityCommand>>;
export type { CreateContentArticleCommand, CreateCommunityDiscussionCommand, PublishContentCommand, };
//# sourceMappingURL=community.commands.d.ts.map