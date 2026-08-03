import { NextResponse } from "next/server";
import { knowledgeGraphService } from "../../../../../../capabilities/knowledge-graph/implementation/services/knowledge-graph.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, segment: { params: Params }) {
  const decision = securityHardeningService.authorize(request, "graph.read");
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  const { id } = await segment.params;
  const node = knowledgeGraphService.getNode(id);
  if (node === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(node);
}
