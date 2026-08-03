import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createRequirement,
} from "../../../../../capabilities/requirement-management/implementation/commands";
import { searchRequirements } from "../../../../../capabilities/requirement-management/implementation/queries";
import type {
  CreateRequirementInput,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../../../../capabilities/requirement-management/implementation/contracts";

const CreateRequirementBodySchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  owner: z.string().optional(),
  source: z.string().optional(),
  linkedCapabilityIds: z.array(z.string().min(1)).optional(),
  acceptanceCriteria: z.array(z.string().min(1)).optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const result = searchRequirements.execute({
    query: searchParams.get("q") ?? "",
    status: (searchParams.get("status") as RequirementStatus | "all" | undefined) ?? "all",
    priority:
      (searchParams.get("priority") as RequirementPriority | "all" | undefined) ?? "all",
    verificationStatus: (
      searchParams.get("verificationStatus") as RequirementVerificationStatus | "all" | undefined
    ) ?? "all",
    linkedCapabilityId: searchParams.get("linkedCapabilityId") ?? undefined,
    owner: searchParams.get("owner") ?? undefined,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = CreateRequirementBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const input: CreateRequirementInput = parsed.data;
    const result = createRequirement.execute(input);
    return NextResponse.json(result, { status: 201 });
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    return NextResponse.json(
      { error: "command_failed", detail },
      { status: 500 },
    );
  }
}
