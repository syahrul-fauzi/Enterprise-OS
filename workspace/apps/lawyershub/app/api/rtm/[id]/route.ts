import { NextResponse } from "next/server";
import {
  traceabilityQueries,
} from "../../../../../../capabilities/requirements-traceability-matrix/implementation/service";
import { RequirementId } from "../../../../../../capabilities/requirement-management/implementation/service";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const result = traceabilityQueries["traceability.get"].execute({
    requirementId: RequirementId(id),
  });

  if (result === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }

  return NextResponse.json(result);
}
