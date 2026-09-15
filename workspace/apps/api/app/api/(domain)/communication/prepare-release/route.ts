import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // Single canonical capability invocation - all release logic in capability layer
    const { output } = await capabilityRegistry.invoke("release", "prepareChatRelease", payload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to prepare release" }, { status: 500 });
  }
}