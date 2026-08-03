import { NextResponse } from "next/server";
import { connectorEcosystemService } from "../../../../../../../capabilities/connector-ecosystem/implementation/services/connector-ecosystem.service";
import { securityHardeningService } from "../../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

type Params = Promise<{ id: string }>;

export async function POST(request: Request, segment: { params: Params }) {
  const decision = securityHardeningService.authorize(request, "connectors.sync");
  if (!decision.allowed) {
    return NextResponse.json({ error: decision.reason }, { status: decision.status });
  }

  const { id } = await segment.params;
  const result = connectorEcosystemService.sync(id);
  return NextResponse.json(result, { status: result.status === "completed" ? 200 : 404 });
}
