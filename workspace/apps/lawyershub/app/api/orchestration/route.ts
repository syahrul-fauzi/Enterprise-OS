import { NextResponse } from "next/server";
import { agentOrchestrationService } from "../../../../../capabilities/agent-orchestration/implementation/services/agent-orchestration.service";
import { securityHardeningService } from "../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "orchestration.read");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  return NextResponse.json({
    items: agentOrchestrationService.listPlans(),
  });
}
