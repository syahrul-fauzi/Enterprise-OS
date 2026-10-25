import { NextResponse } from "next/server";
import { z } from "zod";
import {
  WORKSPACE_SESSION_COOKIE,
  encodeWorkspaceSession,
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
import { initNodeRuntime, getCapabilityRegistry } from "@repo/capability-registry";
import { validateBoundaryAccess } from "../../../../../capabilities/work-core/contracts/work.contracts.js";

const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  // Inisialisasi Node.js runtime untuk dependency yang membutuhkannya
  await initNodeRuntime();
  
  // 1. Validasi boundary compliance (6-boundary)
  if (!validateBoundaryAccess("identity", "work-core")) {
    return NextResponse.json({ error: "Boundary access denied" }, { status: 403 });
  }

  // 2. Canonical session handling menggunakan decodeWorkspaceSession
  const sessionContext = await decodeWorkspaceSession(request);
  
  // 3. Parse request body
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LoginRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  const { email, password } = parsed.data;

  try {
    // 4. Dapatkan capability registry dan invoke canonical identity.authenticate
    const capabilityRegistry = await getCapabilityRegistry();
    const authenticationResult = await capabilityRegistry.invoke<{
      success: boolean;
      session?: WorkspaceSession;
      error?: string;
    }>("identity.authenticate", {
      email,
      password,
      requestOrigin: request.headers.get("origin"),
      sessionContext
    });

    if (!authenticationResult.success || !authenticationResult.session) {
      return NextResponse.json({ 
        error: authenticationResult.error || "Authentication failed" 
      }, { status: 401 });
    }

    // 5. Set session cookie dan return success
    const response = NextResponse.json({ success: true });
    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: encodeWorkspaceSession(authenticationResult.session),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[LOGIN] Authentication error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}