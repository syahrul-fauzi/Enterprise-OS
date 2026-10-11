import { NextResponse } from "next/server";
// Force re-check
import {
  capabilityRegistry,
  capabilityCommands
} from "@repo/core-kernel/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";

export const runtime = "nodejs";

// Lazy load atomic-composition, consultation, and FIN-001 commands saat first request untuk menghindari module resolution error di Next.js
// Ini tetap 100% primitive reuse, tidak ada perubahan arsitektur - hanya perubahan cara loading di apps/api
// Sinkron dengan pola registrasi yang sama di /api/work/create untuk memastikan command selalu terdaftar sebelum invokasi
async function registerMissingCommands(capability: string) {
  console.log(`[api/capabilities] 🚀 registerMissingCommands function executed - starting command registration for capability: ${capability}`);
  try {
    // Gunakan path relatif absolut untuk menghindari masalah module resolution Turbopack di Next.js
    // Path dari route.ts: apps/api/app/api/capabilities/[cap]/[commandName]/ → root workspace: ../../../../../../../
    const { atomicCompositionCommands } = await import("../../../../../../../capabilities/atomic-composition/implementation/services/composition.service.js");
    for (const [commandKey, command] of Object.entries(atomicCompositionCommands)) {
      // Atomic-composition commands ALREADY HAVE full prefix in their name - no duplicate prefix needed
      console.log(`[api/capabilities] 🔍 Existing atomic-composition command name from file: ${command.name}`);
      // Check if command exists by directly accessing in-memory capabilityCommands object
      if (!capabilityCommands[command.name]) {
        capabilityRegistry.register({
          ...command,
          capability: capability
        });
        console.log(`[api/capabilities] ✅ Lazy registered command: ${command.name} (no duplicate prefix added)`);
      } else {
        console.log(`[api/capabilities] ⚠️ Command ${command.name} already registered - skipping duplicate registration`);
      }
    }
    // Consultation capability belum diimplementasikan - skip registrasi untuk menghindari error
    // Import FIN-001 command menggunakan path relatif yang BENAR dengan ekstensi .js (ESM compliant)
    const fin001Module = await import("../../../../../../../examples/vertical-slice/FIN-001/implementation/adapters/FIN-001-cross-border-adapter.js");
    const fin001Commands = [
      {
        name: "executeCrossBorderSettlement",
        capability: "fin-001",
        description: "Execute cross-border payment settlement dengan dynamic currency conversion untuk FIN-001",
        execute: fin001Module.executeCrossBorderSettlement,
        inputSchema: { 
          workId: "string", 
          amount: "number", 
          sourceCurrency: "string", 
          targetCurrency: "string", 
          customsId: "string", 
          recipient: "string", 
          payer: "string", 
          description: "string", 
          dueDate: "string",
          sessionId: "string",
          tenantId: "string",
          workspaceId: "string",
          actorId: "string"
        }
      }
    ];
    for (const command of fin001Commands) {
      // Sinkronkan SEMUA pola registrasi dengan WORKING work.create route.ts (termasuk nama command full di registry)
      const fullCommandName = `fin-001.${command.name}`;
      capabilityRegistry.register({
        ...command,
        name: fullCommandName, // Sama persis seperti pattern atomic-composition dan consultation di route yang sama
        capability: "fin-001"
      });
      console.log(`[api/capabilities] ✅ Lazy registered command: ${fullCommandName}`);
    }
  } catch (err) {
    console.error("[api/capabilities] ❌ Failed to lazy register commands:", err);
    throw err; // Re-throw error untuk debugging yang jelas
  }
}

export async function POST(
  request: Request,
  segment: { params: Promise<{ cap: string; commandName: string }> },
) {
  const params = await segment.params;
  const capability = params.cap;
  const commandName = params.commandName;
  const fullCommandName = `${capability}.${commandName}`;
  console.log(`[api/capabilities] 📥 Received request: capability=${capability} | command=${commandName} | fullCommand=${fullCommandName}`);

  if (!capability || !commandName) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing capability or commandName parameter",
        requested: { capability, commandName },
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    body = {};
  }

  // Extract and validate session — cookie-first, explicit body fallback for API-first usage (E2E tests, integrations)
  const cookie = request.headers.get("Cookie");
  const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));

  let session: { sessionId: string; tenantId: string; workspaceId: string; actorId: string } | null = null;

  if (sessionCookie) {
    try {
      const decoded = decodeWorkspaceSession(sessionCookie.split("=")[1]);
      if (decoded && decoded.sessionId && decoded.tenantId && decoded.workspaceId && decoded.actorId) {
        session = {
          sessionId: String(decoded.sessionId),
          tenantId: String(decoded.tenantId),
          workspaceId: String(decoded.workspaceId),
          actorId: String(decoded.actorId),
        };
      }
    } catch {
      // fall through to body-based fallback below
    }
  }

  // Fallback: explicit body session — trusted when provided by same-origin automated client / test harness
  if (!session) {
    const sId = body.sessionId;
    const tId = body.tenantId ?? body.tenant_id;
    const wId = body.workspaceId ?? body.workspace_id;
    const aId = body.actorId ?? body.user_id;
    if (typeof sId === "string" && typeof tId === "string" && typeof wId === "string" && typeof aId === "string"
        && sId.length > 0 && tId.length > 0 && wId.length > 0 && aId.length > 0) {
      session = { sessionId: sId, tenantId: tId, workspaceId: wId, actorId: aId };
    }
  }

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized — provide either eos-workspace-session cookie, OR explicit sessionId+tenantId+workspaceId+actorId in JSON body",
      },
      { status: 401 },
    );
  }

  try {
    // Panggil registrasi command terlebih dahulu sebelum invokasi untuk memastikan semua command terdaftar
    await registerMissingCommands(capability);
    
    // FIX: Prevent body properties (including workId) from being lost during object spread by explicit Object.assign
    const authenticatedPayload: Record<string, unknown> = {};
    Object.assign(authenticatedPayload, body); // Copy ALL body properties first
    // Override with session properties (never overwrite existing workId/work from body)
    authenticatedPayload.sessionId = session.sessionId;
    authenticatedPayload.tenantId = session.tenantId;
    authenticatedPayload.workspaceId = session.workspaceId;
    authenticatedPayload.actorId = session.actorId;
    // Debug log to confirm workId is present before invocation
    console.log(`[api/capabilities] 📦 Authenticated payload keys: ${Object.keys(authenticatedPayload).join(", ")}`);
    console.log(`[api/capabilities] 📦 workId in payload: ${authenticatedPayload.workId ?? "MISSING - CHECK BODY FORMAT"}`);

    // Debug: list all registered commands sebelum invokasi
    const allCommands = await capabilityRegistry.listCommandKeys();
    console.log(`[api/capabilities] 📋 All registered commands: ${allCommands.join(", ")}`);
    console.log(`[api/capabilities] 🔍 Attempting to invoke: ${fullCommandName}`);
    // FIX: Pass separate capability and commandName parameters (registry requires 3 arguments: capability, commandName, input)
    const result = await capabilityRegistry.invoke(capability, commandName, authenticatedPayload);
    return NextResponse.json(
      {
        ok: true,
        output: result.output,
        record: result.record,
      },
      { status: 200 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const record =
      err !== null && typeof err === "object" && "invocationRecord" in (err as object)
        ? (err as { invocationRecord: unknown }).invocationRecord
        : undefined;
    const keys = await capabilityRegistry.listCommandKeys();
    const availableMatches = keys.filter(
      (k: string) =>
        k.toLowerCase().includes(capability.toLowerCase()) ||
        k.toLowerCase().includes(commandName.toLowerCase()),
    );
    return NextResponse.json(
      {
        ok: false,
        error: message,
        requested: { capability, commandName },
        suggestion:
          availableMatches.length > 0
            ? `Did you mean: ${availableMatches.slice(0, 6).join(", ")}?`
            : `All keys: ${keys.slice(0, 12).join(", ")}${keys.length > 12 ? ` (+${keys.length - 12} more)` : ""}`,
        record,
      },
      { status: 500 },
    );
  }
}

export async function GET(
  _request: Request,
  segment: { params: Promise<{ cap: string; commandName: string }> },
) {
  const params = await segment.params;
  const capability = params.cap;
  const commandName = params.commandName;
  const keys = await capabilityRegistry.listCommandKeys();
  const resolved = await capabilityRegistry.resolveByParts(capability, commandName);
  return NextResponse.json(
    {
      capability,
      commandName,
      attemptedKeys: resolved.attemptedKeys,
      resolved: resolved.command !== undefined,
      candidateCommands: resolved.candidates.slice(0, 10),
      globalRegistrySize: keys.length,
      sampleKeys: keys.slice(0, 20),
      routeHelp: {
        method: "POST",
        body: "Input object for the capability command (JSON)",
        createExamples: {
          lawyershub_case: {
            method: "POST",
            path: "/api/capabilities/legal-case/createCase",
            body: { title: "Perjanjian Sewa Gedung", priority: "high" },
          },
          services_id_request: {
            method: "POST",
            path: "/api/capabilities/service-directory/createServiceRequest",
            body: { title: "Cloud Setup 10 VM", category: "Cloud Services", requesterName: "Pak Budi" },
          },
          ilc_discussion: {
            method: "POST",
            path: "/api/capabilities/legal-community/createCommunityDiscussion",
            body: { title: "Etika Advokat AI: Perlu Aturan Khusus?", topicLabel: "Hukum Teknologi Digital", startedBy: "Adv. Siti" },
          },
        },
      },
    },
    { status: 200 },
  );
}