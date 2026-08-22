import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import {
  CommunityDiscussionRepositoryInMemory,
} from "@capabilities/legal-community/implementation/repository/community.repository";
import {
  getCommunityDiscussionRepositoryPostgres,
} from "@capabilities/legal-community/implementation/repository/community-postgres.repository";
import type { CommunityDiscussionAggregate, DiscussionStatus, TopicCategory } from "@capabilities/legal-community/implementation/contracts/community.contracts";

const CommunityDiscussionStore: typeof CommunityDiscussionRepositoryInMemory | ReturnType<typeof getCommunityDiscussionRepositoryPostgres> =
  process.env.DATABASE_URL ? getCommunityDiscussionRepositoryPostgres() : CommunityDiscussionRepositoryInMemory;

interface DiscussionListOutput {
  readonly items: readonly CommunityDiscussionAggregate[];
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
    const status = (searchParams.get("status") as DiscussionStatus | "all") || "all";
    const topicLabel = (searchParams.get("topicLabel") as TopicCategory | "all") || "all";
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let all: readonly CommunityDiscussionAggregate[];
    const pgStore = CommunityDiscussionStore as unknown as { listByWorkspace(ws: string): Promise<readonly CommunityDiscussionAggregate[]> };
    if (typeof pgStore.listByWorkspace === "function" && process.env.DATABASE_URL) {
      all = await pgStore.listByWorkspace(session.workspaceId);
    } else {
      all = await (CommunityDiscussionStore as typeof CommunityDiscussionRepositoryInMemory).list();
    }

    let filtered = [...all];
    if (status !== "all") {
      filtered = filtered.filter((d: CommunityDiscussionAggregate) => d.status === status);
    }
    if (topicLabel !== "all") {
      filtered = filtered.filter((d: CommunityDiscussionAggregate) => d.topicLabel === topicLabel);
    }
    if (query && query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter((d: CommunityDiscussionAggregate) =>
        d.title.toLowerCase().includes(q) ||
        (d.summary?.toLowerCase() || "").includes(q),
      );
    }

    const output: DiscussionListOutput = {
      items: filtered.slice(offset, offset + limit),
      total: all.length,
      matched: filtered.length,
      offset,
      limit,
    };

    return NextResponse.json({ output }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/community/discussions/list] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch discussions";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}