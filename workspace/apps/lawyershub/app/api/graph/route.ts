import { NextResponse } from "next/server";
import { knowledgeGraphService } from "../../../../../capabilities/knowledge-graph/implementation/services/knowledge-graph.service";
import { securityHardeningService } from "../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "graph.read");
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  return NextResponse.json(knowledgeGraphService.getSnapshot());
}
