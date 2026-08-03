import { NextResponse } from "next/server";
import { constitutionGatewayService } from "../../../../../../capabilities/api-platform/implementation/services/constitution-gateway.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "constitution.read");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  try {
    return NextResponse.json(constitutionGatewayService.getClaims());
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    return NextResponse.json({ error: "constitution_claims_unavailable", detail }, { status: 503 });
  }
}
