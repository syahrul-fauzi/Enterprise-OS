import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export async function POST(request: Request) {
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

    const body = await request.json();
    const { title, summary, topicLabel, startedBy, startedByAffiliation } = body;

    const { output } = await capabilityRegistry.invokeAsync(
      "legal-community",
      "legal-community.createCommunityDiscussion",
      {
        title,
        summary,
        topicLabel,
        startedBy,
        startedByAffiliation,
        sessionId: session.sessionId,
      },
    );

    if (!output) {
      return NextResponse.json({ error: "Failed to create discussion" }, { status: 500 });
    }

    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    console.error("[POST /api/community/discussions/create] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create discussion";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
