import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import { SignupAndSessionInputSchema } from "../../../../../../capabilities/identity/implementation/commands/signup-and-session.command.js";

type SignupApiOutput = {
  readonly response: unknown;
  readonly cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }>;
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SignupAndSessionInputSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  try {
    // PURE HTTP ADAPTER: All business logic resides in capability layer (signup-and-session.command.ts)
    const { output } = await capabilityRegistry.invokeAsync<SignupApiOutput>("identity", "signupAndCreateSession", parsed.data);

    const response = NextResponse.json(output.response, { status: 201 });
    output.cookies.forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Signup failed";
    const status = message.includes("Email already registered")
      ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}