import { NextResponse } from "next/server";
import { z } from "zod";
import { agentOrchestrationService } from "../../../../../../../capabilities/agent-orchestration/implementation/services/agent-orchestration.service";
import { securityHardeningService } from "../../../../../../../capabilities/security-hardening/implementation/services/security-hardening.service";

type Params = Promise<{ id: string }>;

const DispatchBodySchema = z.object({
  inputs: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request, segment: { params: Params }) {
  const decision = securityHardeningService.authorize(request, "orchestration.dispatch");
  if (!decision.allowed) {
    return NextResponse.json(
      { error: decision.status === 401 ? "unauthorized" : "forbidden", detail: decision.reason },
      { status: decision.status },
    );
  }

  const { id } = await segment.params;
  const raw = await request.json().catch(() => ({}));
  const parsed = DispatchBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = agentOrchestrationService.dispatch({
    planId: id,
    inputs: parsed.data.inputs,
  });

  const status = result.status === "completed" ? 200 : 409;
  return NextResponse.json(result, { status });
}
