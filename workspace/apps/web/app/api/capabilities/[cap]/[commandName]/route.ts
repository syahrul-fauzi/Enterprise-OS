import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";

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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const result = capabilityRegistry.invoke(capability, commandName, body);
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
    const keys = capabilityRegistry.listCommandKeys();
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
      { status: 404 },
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
  const keys = capabilityRegistry.listCommandKeys();
  const resolved = capabilityRegistry.resolveByParts(capability, commandName);
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