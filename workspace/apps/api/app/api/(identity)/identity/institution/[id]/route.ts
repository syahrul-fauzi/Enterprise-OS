import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import { validateBoundaryAccess, decodeWorkspaceSession } from "@repo/capabilities-work-core/contracts/work.contracts.js";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  segment: { params: Promise<{ id: string }> },
) {
  try {
    // Validasi boundary access sesuai 6-boundary compliance (identity -> work-core)
    if (!validateBoundaryAccess("identity", "work-core")) {
      console.error("[Institution Detail] Boundary access denied: identity domain cannot access work-core");
      return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
    }
    
    // Gunakan canonical session decoder untuk validasi request yang masuk
    const sessionContext = await decodeWorkspaceSession(request);
    
    const params = await segment.params;
    const institutionId = params.id;
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "academic";

    const memberResult = await capabilityRegistry.invoke("identity", "getMemberById", {
      memberId: institutionId,
    }) as { output?: unknown };

    const researchersResult = await capabilityRegistry.invoke("identity", "getMembersByInstitution", {
      institutionId,
      productId,
    }) as { output?: unknown };

    const worksResult = await capabilityRegistry.invoke("work-core", "work.getWorksByInstitution", {
      institutionId,
      productId,
    }) as { output?: unknown };

    return NextResponse.json(
      {
        institution: memberResult.output ?? null,
        affiliatedResearchers: researchersResult.output ?? [],
        affiliatedWorks: worksResult.output ?? [],
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[GET /api/institution/[id]] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch institution";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}