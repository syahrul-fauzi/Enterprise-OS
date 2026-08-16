import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  segment: { params: Promise<{ id: string }> },
) {
  try {
    const params = await segment.params;
    const institutionId = params.id;
    const { searchParams } = new URL(_request.url);
    const productId = searchParams.get("productId") || "academic";

    const memberResult = await capabilityRegistry.invoke("identity", "getMemberById", {
      memberId: institutionId,
    }) as { output?: unknown };

    const researchersResult = await capabilityRegistry.invoke("identity", "getMembersByInstitution", {
      institutionId,
      productId,
    }) as { output?: unknown };

    return NextResponse.json(
      {
        institution: memberResult.output ?? null,
        affiliatedResearchers: researchersResult.output ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/institution/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch institution";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
