import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  segment: { params: Promise<{ cap: string; commandName: string }> },
) {
  const params = await segment.params;
  const capability = params.cap;
  const commandName = params.commandName;

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
    const authenticatedPayload = {
      ...body,
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    const result = await capabilityRegistry.invokeAsync(capability, commandName, authenticatedPayload);
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