import { NextResponse } from "next/server";
// Import canonical registry dan session utilities - pure adapter pattern compliance
import { getGlobalCapabilityRegistry } from "../../../../../../../capabilities/atomic-composition/implementation/services/capability-resolver.service";
import {
  capabilityRegistry,
  capabilityCommands
} from "@repo/core-kernel/registry/capability-command-registry";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel/session/workspace-session";

// Trigger canonical registry initialization on API server startup (semua capability sudah terdaftar saat initialization)
const globalCanonicalRegistry = getGlobalCapabilityRegistry();
console.log("[API/capabilities/route] ✅ Canonical registry initialized, all capabilities registered at startup");

export const runtime = "nodejs";

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

  // Extract and validate session menggunakan canonical auth method (menghindari AUTH_INCONSISTENCY)
  const canonicalSession = readWorkspaceSessionFromRequest(request);
  
  if (!canonicalSession?.sessionId || !canonicalSession?.tenantId || !canonicalSession?.workspaceId || !canonicalSession?.actorId) {
    return NextResponse.json(
      {
        error: "Unauthorized — invalid or missing workspace session",
        status: "AUTH_INCONSISTENCY_RESOLVED"
      },
      { status: 401 },
    );
  }

  // Gunakan session yang sudah terverifikasi dari canonical decoder
  const session = {
    sessionId: String(canonicalSession.sessionId),
    tenantId: String(canonicalSession.tenantId),
    workspaceId: String(canonicalSession.workspaceId),
    actorId: String(canonicalSession.actorId),
  };

  try {
    // Pure adapter pattern: only invoke pre-registered commands, no lazy registration
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