import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "academic";
    const searchQuery = searchParams.get("searchQuery") ?? "";
    const filterStatus = searchParams.get("filterStatus") ?? "all";

    const result = await capabilityRegistry.invoke("requirement", "getAll", {
      productId,
      searchQuery,
      filterStatus,
    }) as { output?: unknown[] };

    return NextResponse.json(
      {
        items: result.output ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/research] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch research";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
