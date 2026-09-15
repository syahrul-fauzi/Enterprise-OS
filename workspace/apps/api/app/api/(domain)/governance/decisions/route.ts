import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // Single canonical capability invocation - all governance logic in capability layer
    const { output } = await capabilityRegistry.invoke("governance", "submitDecision", payload);
    return NextResponse.json(output, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Decision submission failed" }, { status: 500 });
  }
}