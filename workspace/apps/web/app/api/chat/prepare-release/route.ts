import { NextResponse } from "next/server";
import { z } from "zod";
import {
  prepareReleaseProcedure,
  type PrepareReleaseOutput,
} from "@procedures/prepare-release";
import { recordRuntimeInvocation } from "@repo/core-runtime";
import {
  createAnonymousWorkspaceSession,
  createWorkspaceContextHeaders,
  createWorkspaceRequestTrace,
  readWorkspaceSessionFromRequest,
  type WorkspaceSession,
} from "@repo/core-kernel";
import {
  applyProductContextHeaders,
  readProductContextFromRequest,
} from "@repo/presentation-experience";

const ChatMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

function createAnonymousHeaders(trace: {
  readonly requestId: string;
  readonly traceId: string;
  readonly intent: string;
}): Headers {
  const headers = new Headers();
  headers.set("x-eos-request-id", trace.requestId);
  headers.set("x-eos-trace-id", trace.traceId);
  headers.set("x-eos-intent", trace.intent);
  return headers;
}

function sessionIdentifier(session: WorkspaceSession): string {
  return `${session.actorId}@${session.tenantId}`;
}

/**
 * Intent parser — extracts release ID from natural language user messages.
 * Examples:
 *   "Prepare release EOS-003"           -> "EOS-003"
 *   "Can you check release 12.3?"        -> "12.3"
 *   "release readiness for build R-2026"  -> "R-2026"
 *   "EOS-003 readiness"                  -> "EOS-003"
 */
function extractReleaseId(userMessage: string): string | null {
  const cleaned = userMessage.trim();

  const patterns: readonly RegExp[] = [
    /(?:prepare|check|assess|evaluate|run)\s+(?:release|build|version)\s+([A-Za-z0-9._-]+)/i,
    /(?:readiness|ready|prep|assessment)\s+(?:for\s+)?(?:release|build|version)?\s*([A-Za-z0-9._-]+)/i,
    /(?:release|build|version|ver)\s+([A-Za-z0-9._-]+)/i,
    /\b([A-Z]+-\d+(?:\.\d+)?|[vV]\d+\.\d+(?:\.\d+)?|R-\d+)\b/,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    const single = tokens[0] ?? "";
    if (/^[A-Za-z0-9._-]+$/.test(single)) return single;
  }

  return null;
}

type ChatMessageRole = "user" | "assistant" | "system";

interface ChatMessage {
  readonly role: ChatMessageRole;
  readonly content: string;
  readonly structured?: PrepareReleaseOutput | undefined;
  readonly procedureId?: string | undefined;
  readonly executionId?: string | undefined;
  readonly canonicalSubject?: string | undefined;
}

function buildAssistantResponse(result: PrepareReleaseOutput): ChatMessage {
  const { readiness, requirements, traceability, evidence, blockers, ai } = result;

  const identityLine = `🆔 **Work Identity**: \`${result.executionId}\` (canonical subject: \`${result.canonicalSubject}\`)`;

  let opening = "";
  switch (readiness.status) {
    case "ready":
      opening = `✅ Release **${result.releaseId}** is **READY** for deployment. All readiness checks passed successfully.`;
      break;
    case "blocked":
      opening = `🚫 Release **${result.releaseId}** is **BLOCKED**. There are ${blockers.length} blocker(s) that must be resolved before proceeding.`;
      break;
    case "pending_ai_investigation":
      opening = `⏸ Release **${result.releaseId}** is **PENDING AI INVESTIGATION**. I found ${ai.ambiguousRequirements.length} ambiguous requirement(s) with UNKNOWN verification status and triggered AI investigation (waiting for results — no AI dispatched in this run).`;
      break;
    default:
      opening = `Assessment complete for release **${result.releaseId}**.`;
  }

  const summaryLines: string[] = [];
  summaryLines.push(identityLine);
  summaryLines.push(
    `📋 **Requirements**: ${requirements.verified}/${requirements.total} verified · ${requirements.blocked} blocked · ${requirements.unknown} unknown`,
  );
  summaryLines.push(
    `🔗 **Traceability**: ${traceability.complete ? "✅ Complete" : `⚠️ ${traceability.gaps} gap(s)`}`,
  );
  summaryLines.push(
    `🔍 **Evidence**: ${evidence.complete ? "✅ Coverage complete" : `⚠️ Incomplete (${evidence.total} records)`}`,
  );

  let blockerSection = "";
  if (blockers.length > 0) {
    blockerSection = "\n\n**Blocking items:**\n";
    for (const b of blockers) {
      blockerSection += `• ${b}\n`;
    }
  }

  let aiSection = "";
  if (ai.invoked) {
    aiSection = `\n\n🤖 **AI-on-demand triggered**\n`;
    aiSection += `Plan: \`${ai.planId}\`\n`;
    aiSection += `Invocation status: \`${ai.invocationStatus}\`\n`;
    aiSection += `Ambiguous requirements: ${ai.ambiguousRequirements.join(", ") || "—"}\n`;
    aiSection += `Deterministic checks run first. AI is only triggered on UNKNOWN verification state (not dispatched synchronously — awaiting AI or human resolution).`;
  }

  const footer = `\n\n💡 _Want to inspect detailed state and blocking items? Open the **Release Readiness Workspace** to view full procedure traceability, evidence paths, and SOP execution steps. Click Workspace to verify same work identity._`;

  return {
    role: "assistant",
    content: `${opening}\n\n${summaryLines.join("\n")}${blockerSection}${aiSection}${footer}`,
    structured: result,
    procedureId: result.procedureId,
    executionId: result.executionId,
    canonicalSubject: result.canonicalSubject,
  };
}

export async function POST(request: Request) {
  const session = readWorkspaceSessionFromRequest(request);
  const effectiveSession = session ?? createAnonymousWorkspaceSession();
  const trace = createWorkspaceRequestTrace(request, "chat.prepare_release");
  const productContext = readProductContextFromRequest(request);

  const raw = await request.json();
  const parsed = ChatMessageSchema.safeParse(raw);

  if (!parsed.success) {
    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "chat.prepare_release.post",
      sourceRef: "apps/web/app/api/chat/prepare-release/route.ts:POST",
      success: false,
      input: { session: sessionIdentifier(effectiveSession), trace, productContext, body: raw },
      result: { error: "validation_error", issues: parsed.error.issues },
    });
    return NextResponse.json(
      { error: "validation_error", issues: parsed.error.issues },
      { status: 400, headers: createAnonymousHeaders(trace) },
    );
  }

  try {
    const userMessage = parsed.data.message;
    const releaseId = extractReleaseId(userMessage);

    // If no release ID detected, return a clarification message
    if (!releaseId) {
      const clarification: ChatMessage = {
        role: "assistant",
        content:
          "I didn't catch a release ID. Try saying something like:\n" +
          "• `Prepare release EOS-003`\n" +
          "• `Check release 12.3 readiness`\n" +
          "• Or just send me a release ID directly (e.g. `EOS-003`)",
      };

      recordRuntimeInvocation({
        capabilityId: "procedure-runtime",
        operationId: "chat.prepare_release.post",
        sourceRef: "apps/web/app/api/chat/prepare-release/route.ts:POST",
        success: true,
        input: { session: sessionIdentifier(effectiveSession), trace, productContext, userMessage },
        result: { action: "clarification_requested", releaseIdDetected: null },
      });

      return NextResponse.json(
        { message: clarification, releaseId: null },
        {
          headers: applyProductContextHeaders({
            headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
            productContext,
          }),
        },
      );
    }

    // ── Critical guarantee: shared procedure execution path ──
    // Chat invokes the EXACT SAME prepareReleaseProcedure function
    // that Workspace invokes via /api/procedure/prepare-release.
    // There is NO Chat-specific procedure implementation.
    // ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    const result = prepareReleaseProcedure({ releaseId, limit: 100 });
    // ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

    const assistantMessage = buildAssistantResponse(result);

    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "chat.prepare_release.post",
      sourceRef: "apps/web/app/api/chat/prepare-release/route.ts:POST",
      success: result.execution.status === "passed",
      input: {
        session: sessionIdentifier(effectiveSession),
        trace,
        productContext,
        userMessage,
        extractedReleaseId: releaseId,
      },
      result: {
        releaseId,
        executionId: result.executionId,
        canonicalSubject: result.canonicalSubject,
        readinessStatus: result.readiness.status,
        executionReason: result.execution.reason,
        blockerCount: result.blockers.length,
        aiInvoked: result.ai.invoked,
        sharedProcedureUsed: true,
        sameWorkIdentityAcrossSurfaces: true,
      },
    });

    return NextResponse.json(
      { message: assistantMessage, releaseId },
      {
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
          productContext,
        }),
      },
    );
  } catch (rawError) {
    const detail = rawError instanceof Error ? rawError.message : String(rawError);
    recordRuntimeInvocation({
      capabilityId: "procedure-runtime",
      operationId: "chat.prepare_release.post",
      sourceRef: "apps/web/app/api/chat/prepare-release/route.ts:POST",
      success: false,
      input: {
        session: sessionIdentifier(effectiveSession),
        trace,
        productContext,
        body: parsed.data,
      },
      result: { error: "procedure_failed", detail },
    });
    return NextResponse.json(
      { error: "procedure_failed", detail },
      {
        status: 500,
        headers: applyProductContextHeaders({
          headers: createWorkspaceContextHeaders({ session: effectiveSession, trace }),
          productContext,
        }),
      },
    );
  }
}