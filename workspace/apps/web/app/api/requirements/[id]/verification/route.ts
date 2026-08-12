import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, segment: { params: Params }) {
  try {
    const { id: requirementId } = await segment.params;
    // Single canonical capability invocation - all verification logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "getVerificationStatus", { requirementId });
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch verification status" }, { status: 500 });
  }
}