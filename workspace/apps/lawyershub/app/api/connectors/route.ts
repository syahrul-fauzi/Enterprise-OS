import { NextResponse } from "next/server";
import { connectorEcosystemService } from "../../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service";
import { securityHardeningService } from "../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

export async function GET(request: Request) {
  const decision = securityHardeningService.authorize(request, "connectors.read");
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  return NextResponse.json({
    items: connectorEcosystemService.listConnectors(),
  });
}
