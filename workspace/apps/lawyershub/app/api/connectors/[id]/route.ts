import { NextResponse } from "next/server";
import { connectorEcosystemService } from "../../../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service";
import { securityHardeningService } from "../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

type Params = Promise<{ id: string }>;

export async function GET(request: Request, segment: { params: Params }) {
  const decision = securityHardeningService.authorize(request, "connectors.read");
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  const { id } = await segment.params;
  const connector = connectorEcosystemService.getConnector(id);
  if (connector === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(connector);
}
