import { NextResponse } from "next/server";
import {
  createCase,
  searchCases,
  type CreateCaseInput,
} from "../../../../capabilities/legal-case/implementation/commands/case.commands";
import { caseQueries } from "../../../../capabilities/legal-case/implementation/queries/case.queries";
import { z } from "zod";

const CreateCaseBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = {
    query: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as string | undefined) ?? "all",
    priority: (searchParams.get("priority") as string | undefined) ?? "all",
    limit: searchParams.get("limit")
      ? parseInt(searchParams.get("limit")!)
      : undefined,
    offset: searchParams.get("offset")
      ? parseInt(searchParams.get("offset")!)
      : undefined,
  };
  const result = caseQueries["case.search"].execute(input);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = CreateCaseBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const input: CreateCaseInput = parsed.data;
  const result = createCase.execute(input);
  return NextResponse.json(result, { status: 201 });
}
