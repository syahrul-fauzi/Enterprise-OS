import { NextResponse } from "next/server";
import { z } from "zod";
import { traceabilityQueries } from "../../../../../capabilities/requirements-traceability-matrix/implementation/service";

const SearchTraceabilityQuerySchema = z.object({
  requirementId: z.string().min(1).optional(),
  linkedCapabilityId: z.string().min(1).optional(),
  artifactKind: z
    .enum(["all", "capability", "api", "source", "test", "specification", "evidence"])
    .optional(),
  coverage: z.enum(["all", "complete", "gaps"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SearchTraceabilityQuerySchema.safeParse({
    requirementId: searchParams.get("requirementId") ?? undefined,
    linkedCapabilityId: searchParams.get("linkedCapabilityId") ?? undefined,
    artifactKind: searchParams.get("artifactKind") ?? undefined,
    coverage: searchParams.get("coverage") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = traceabilityQueries["traceability.search"].execute(parsed.data);
  return NextResponse.json(result);
}
