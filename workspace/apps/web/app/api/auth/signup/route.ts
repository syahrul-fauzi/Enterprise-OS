import { NextResponse } from "next/server";
import { encodeWorkspaceSession, WORKSPACE_SESSION_COOKIE, type WorkspaceSession } from "@repo/core-kernel";
// Import from canonical package entry point
import { SignupAndSessionInputSchema, signupAndSessionCommand } from "@repo/capabilities-identity";

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
      const messages = parsed.error.issues.map((i: { path: (string | number)[]; message: string }) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }

  try {
    // REALITY PATH ONLY - Bypass capabilityRegistry, panggil execute langsung
    const output = await signupAndSessionCommand.execute(parsed.data);

    const response = NextResponse.json(output.response, { status: 201 });
    output.cookies.forEach((cookie: { name: string; value: string; options: Record<string, unknown> }) => {
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