import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  segment: { params: Promise<{ id: string }> },
) {
  try {
    const params = await segment.params;
    const profileId = params.id;
    const { searchParams } = new URL(_request.url);
    const productId = searchParams.get("productId") || "academic";
    const includeRequirements = searchParams.get("includeRequirements") !== "0";

    const memberResult = await capabilityRegistry.invoke("identity", "getMemberById", {
      memberId: profileId,
    }) as { output?: unknown };

    let authoredRequirements: unknown[] = [];
    if (includeRequirements) {
      const reqResult = await capabilityRegistry.invoke("requirement", "getByAuthor", {
        authorId: profileId,
        productId,
      }) as { output?: unknown[] };
      authoredRequirements = reqResult.output ?? [];
    }

    return NextResponse.json(
      {
        profile: memberResult.output ?? null,
        authoredRequirements,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/profile/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch profile";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
