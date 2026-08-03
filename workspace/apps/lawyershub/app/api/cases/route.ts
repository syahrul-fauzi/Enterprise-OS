import { NextResponse } from "next/server";
import {
  createCase,
} from "../../../../../capabilities/legal-case/implementation/commands/case.commands";
import { searchCases } from "../../../../../capabilities/legal-case/implementation/queries/case.queries";
import type {
  CasePriority,
  CaseStatus,
  CreateCaseInput,
} from "../../../../../capabilities/legal-case/implementation/contracts";
import { z } from "zod";

const CreateCaseBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const input = {
    query: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as CaseStatus | "all" | undefined) ?? "all",
    priority: (searchParams.get("priority") as CasePriority | "all" | undefined) ?? "all",
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  };
  const result = searchCases.execute(input);
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
