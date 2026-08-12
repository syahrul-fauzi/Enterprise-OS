import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payload = Object.fromEntries(searchParams.entries());
    // Single canonical capability invocation - all requirements search logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "searchRequirements", payload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to search requirements" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // Single canonical capability invocation - all requirements creation logic in capability layer
    const { output } = capabilityRegistry.invoke("requirements", "createRequirement", payload);
    return NextResponse.json(output, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create requirement" }, { status: 500 });
  }
}