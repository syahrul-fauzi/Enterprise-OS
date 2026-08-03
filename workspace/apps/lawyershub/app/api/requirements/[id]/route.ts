import { NextResponse } from "next/server";
import { z } from "zod";
import {
  RequirementId,
  approveRequirement,
  markRequirementImplemented,
  startRequirementDelivery,
  updateRequirement,
  verifyRequirement,
} from "../../../../../../capabilities/requirement-management/implementation/service";
import { getRequirement } from "../../../../../../capabilities/requirement-management/implementation/queries";

type Params = Promise<{ id: string }>;

const RequirementPatchBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("start_delivery") }),
  z.object({ action: z.literal("mark_implemented") }),
  z.object({ action: z.literal("verify") }),
  z.object({
    action: z.literal("update"),
    title: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    owner: z.string().optional(),
    source: z.string().optional(),
    linkedCapabilityIds: z.array(z.string().min(1)).optional(),
    acceptanceCriteria: z.array(z.string().min(1)).optional(),
  }),
]);

export async function GET(_request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const result = getRequirement.execute({ id: RequirementId(id) });
  if (result === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const requirementId = RequirementId(id);
  const raw = await request.json();
  const parsed = RequirementPatchBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const body = parsed.data;
    const result =
      body.action === "approve"
        ? approveRequirement.execute({ id: requirementId })
        : body.action === "start_delivery"
          ? startRequirementDelivery.execute({ id: requirementId })
          : body.action === "mark_implemented"
            ? markRequirementImplemented.execute({ id: requirementId })
            : body.action === "verify"
              ? verifyRequirement.execute({ id: requirementId })
              : updateRequirement.execute({
                  id: requirementId,
                  title: body.title,
                  summary: body.summary,
                  description: body.description,
                  priority: body.priority,
                  owner: body.owner,
                  source: body.source,
                  linkedCapabilityIds: body.linkedCapabilityIds,
                  acceptanceCriteria: body.acceptanceCriteria,
                });

    return NextResponse.json(result);
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    if (detail.includes("not found")) {
      return NextResponse.json({ error: "not_found", id }, { status: 404 });
    }
    if (detail.includes("must")) {
      return NextResponse.json(
        { error: "invalid_state", id, detail },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "command_failed", detail },
      { status: 500 },
    );
  }
}
