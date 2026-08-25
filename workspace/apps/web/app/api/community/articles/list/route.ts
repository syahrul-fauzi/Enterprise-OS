import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  ContentArticleRepositoryInMemory,
} from "@capabilities/legal-community/implementation/repository/community.repository.js";
import {
  getContentArticleRepositoryPostgres,
} from "@capabilities/legal-community/implementation/repository/community-postgres.repository.js";
import type { ContentArticleAggregate, ContentStatus, TopicCategory } from "@capabilities/legal-community/implementation/contracts/community.contracts.js";

const ContentArticleStore: typeof ContentArticleRepositoryInMemory | ReturnType<typeof getContentArticleRepositoryPostgres> =
  process.env.DATABASE_URL ? getContentArticleRepositoryPostgres() : ContentArticleRepositoryInMemory;

interface ArticleListOutput {
  readonly items: readonly ContentArticleAggregate[];
  readonly total: number;
  readonly matched: number;
  readonly offset: number;
  readonly limit: number;
}

export async function GET(request: Request) {
  try {
    const cookie = request.headers.get("Cookie");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || undefined;
    const status = (searchParams.get("status") as ContentStatus | "all") || "all";
    const topicLabel = (searchParams.get("topicLabel") as TopicCategory | "all") || "all";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let all: readonly ContentArticleAggregate[];
    const pgStore = ContentArticleStore as unknown as { listByWorkspace(ws: string): Promise<readonly ContentArticleAggregate[]> };
    if (typeof pgStore.listByWorkspace === "function" && process.env.DATABASE_URL) {
      all = await pgStore.listByWorkspace(session.workspaceId);
    } else {
      all = await (ContentArticleStore as typeof ContentArticleRepositoryInMemory).list();
    }

    let filtered = [...all];
    if (status !== "all") {
      filtered = filtered.filter((c: ContentArticleAggregate) => c.status === status);
    }
    if (topicLabel !== "all") {
      filtered = filtered.filter((c: ContentArticleAggregate) => c.topicLabel === topicLabel);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((c: ContentArticleAggregate) =>
        c.title.toLowerCase().includes(q) ||
        (c.summary?.toLowerCase() || "").includes(q) ||
        (c.author?.toLowerCase() || "").includes(q),
      );
    }

    const output: ArticleListOutput = {
      items: filtered.slice(offset, offset + limit),
      total: all.length,
      matched: filtered.length,
      offset,
      limit,
    };

    return NextResponse.json({ output }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/community/articles/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch articles";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}