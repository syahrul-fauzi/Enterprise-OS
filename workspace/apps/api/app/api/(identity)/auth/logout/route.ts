import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  type WorkspaceSession,
} from "@repo/core-kernel";
// Import 6-boundary validation function dari package kanonis (Tahap B mandate)
import { validateBoundaryAccess } from "@repo/capabilities-work-core/contracts/work.contracts.js";

// Lazy load capabilityRegistry sesuai pattern yang digunakan di semua route EOS (hindari module cycle)
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

export async function POST(request: Request) {
  try {
    // 1. Validasi 6-boundary compliance TERLEBIH DAHULU (Tahap B mandate)
    if (!validateBoundaryAccess("api-gateway", "identity")) {
      console.error("[logout-api] BOUNDARY ACCESS DENIED: api-gateway cannot access identity domain directly");
      return NextResponse.json({ error: "Boundary access violation" }, { status: 403 });
    }

    // Canonical auth validation: gunakan decodeWorkspaceSession untuk memproses request context
    const session = await decodeWorkspaceSession(request);
    const sessionId = session?.sessionId;

    // Dapatkan capability registry untuk invoke canonical identity capability
    const capabilityRegistry = await getCapabilityRegistry();

    if (sessionId) {
      await capabilityRegistry.invoke<{ ok: true }>("identity.logoutUser", {
        sessionId,
        // Tambahkan actorContext untuk audit dan tracing sesuai pola yang diterapkan di semua command
        actorContext: {
          tenantId: session?.tenantId || "",
          workspaceId: session?.workspaceId || "",
          actorId: session?.actorId || ""
        }
      });
    }

    const response = NextResponse.json({
      ok: true,
      authenticated: false,
    }, { status: 200 });

    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: "",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  } catch (error) {
    const response = NextResponse.json({
      ok: false,
      error: "Logout failed",
    }, { status: 500 });

    response.cookies.set({
      name: WORKSPACE_SESSION_COOKIE,
      value: "",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  }
}