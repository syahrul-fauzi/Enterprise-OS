import { NextResponse } from "next/server";
import { agentOrchestrationService } from "../../../../../../capabilities/agent-orchestration/implementation/services/agent-orchestration.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, segment: { params: Params }) {
  const decision = securityHardeningService.authorize(request, "orchestration.read");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  const { id } = await segment.params;
  const result = agentOrchestrationService.getPlan({ planId: id });

  if (result === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }

  return NextResponse.json(result);
}
