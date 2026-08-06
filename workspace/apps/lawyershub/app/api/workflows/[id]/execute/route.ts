import { NextResponse } from "next/server";
import { z } from "zod";
import { workflowEngineService } from "../../../../../../../capabilities/workflow-engine/implementation/service";

type Params = Promise<{ id: string }>;

const ExecuteWorkflowBodySchema = z.object({
  requirementId: z.string().optional(),
  runId: z.string().optional(),
  releaseId: z.string().optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

export async function POST(request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const raw = await request.json();
  const parsed = ExecuteWorkflowBodySchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = workflowEngineService.executeWorkflow({
    workflowId: id,
    ...parsed.data,
  });

  const status = result.status === "failed" ? 409 : 200;
  return NextResponse.json(result, { status });
}
