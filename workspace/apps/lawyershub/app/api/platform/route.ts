import { NextResponse } from "next/server";
import { apiPlatformService } from "../../../../../capabilities/api-platform/implementation/services/api-platform.service";
import { securityHardeningService } from "../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "platform.read");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  return NextResponse.json(apiPlatformService.getDescriptor());
}
