import { NextResponse } from "next/server";
import { observabilityService } from "../../../../../../capabilities/observability/implementation/services/observability.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "observability.read");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  return NextResponse.json({
    items: observabilityService.getMetrics(),
  });
}
