import { NextResponse } from "next/server";
import { caseQueries } from "../../../../../capabilities/legal-case/implementation/queries/case.queries";
import {
  assignLawyer,
  closeCase,
} from "../../../../../capabilities/legal-case/implementation/commands/case.commands";
import { z } from "zod";

type Params = Promise<{ id: string }>;

const AssignLawyerBodySchema = z.object({
  lawyerId: z.string().min(1),
});

export async function GET(_request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const result = caseQueries["case.get"].execute({ id });
  if (result === undefined) {
    return NextResponse.json(
      { error: "not_found", id },
      { status: 404 }
    );
  }
  return NextResponse.json(result);
}

export async function PATCH(request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  const raw = await request.json();
  const parsed = AssignLawyerBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  try {
    const result = assignLawyer.execute({ id, lawyerId: parsed.data.lawyerId });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Case not found")) {
      return NextResponse.json({ error: "not_found", id }, { status: 404 });
    }
    if (msg.includes("Cannot assign lawyer to closed case")) {
      return NextResponse.json(
        { error: "invalid_state", id, detail: "Case already closed" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "command_failed", detail: msg },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, segment: { params: Params }) {
  const { id } = await segment.params;
  try {
    const result = closeCase.execute({ id });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Case not found")) {
      return NextResponse.json({ error: "not_found", id }, { status: 404 });
    }
    return NextResponse.json(
      { error: "command_failed", detail: msg },
      { status: 500 }
    );
  }
}
