import { NextResponse } from "next/server";
import { evidenceRegistryQueries } from "../../../../../../capabilities/evidence-registry/implementation/service";

type Params = Promise<{ id: string }>;

export async function GET(_request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const result = evidenceRegistryQueries["evidence.get"].execute({ id });

  if (result === undefined) {
    return NextResponse.json({ error: "not_found", id }, { status: 404 });
  }

  return NextResponse.json(result);
}
