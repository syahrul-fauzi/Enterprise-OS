import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: Params }) {
  try {
    const { id: requirementId } = await segment.params;
    // Single canonical capability invocation - all requirement logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "getRequirementById", { requirementId });
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch requirement" }, { status: 500 });
  }
}

export async function PATCH(_request: Request, segment: { params: Params }) {
  try {
    const { id: requirementId } = await segment.params;
    const payload = await _request.json();
    // Single canonical capability invocation - all requirement updates in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "updateRequirement", { 
      requirementId, 
      ...payload 
    });
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update requirement" }, { status: 500 });
  }
}