import { NextResponse } from "next/server";
import { z } from "zod";
import { evidenceRegistryQueries } from "../../../../../capabilities/evidence-registry/implementation/service";

const SearchEvidenceQuerySchema = z.object({
  q: z.string().optional(),
  kind: z
    .enum(["all", "ledger", "matrix", "status", "acceptance", "metrics", "specification", "record", "contract"])
    .optional(),
  scope: z.enum(["all", "science", "requirement"]).optional(),
  runId: z.string().optional(),
  requirementRef: z.string().optional(),
  tag: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = SearchEvidenceQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    kind: searchParams.get("kind") ?? undefined,
    scope: searchParams.get("scope") ?? undefined,
    runId: searchParams.get("runId") ?? undefined,
    requirementRef: searchParams.get("requirementRef") ?? undefined,
    tag: searchParams.get("tag") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    offset: searchParams.get("offset") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const result = evidenceRegistryQueries["evidence.search"].execute(parsed.data);
  return NextResponse.json(result);
}
