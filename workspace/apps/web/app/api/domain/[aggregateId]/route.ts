import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
import { GetCaseByIdInputSchema } from "legal-case/implementation/commands/get-case-by-id.command";

export const runtime = "nodejs";

// Unified type definitions for all domain aggregates - canonical single source
type LifecycleStep = {
  readonly key: string;
  readonly label: string;
  readonly reached: boolean;
  readonly active: boolean;
};

type DomainAction = {
  readonly key: string;
  readonly label: string;
  readonly capability: string;
  readonly commandName: string;
  readonly buildInput: (id: string) => Record<string, unknown>;
  readonly tone: "primary" | "success";
};

/**
 * Canonical lifecycle factory - moved from frontend to API to enforce single source of truth
 * Eliminates vertical hardcoding in frontend widgets; all domain lifecycle logic lives here
 */
function createLifecycle(order: readonly string[], rawStatus: string, labels: Record<string, string>): LifecycleStep[] {
  const idx = order.indexOf(rawStatus as typeof order[number]);
  return order.map((s, i) => ({
    key: s,
    label: labels[s] ?? s,
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

/**
 * Canonical available actions factory - moved from frontend to API to eliminate vertical hardcoding
 * Filters actions based on current status to ensure only valid actions are exposed
 */
function createAvailableActions(rawStatus: string, allActions: readonly DomainAction[]): DomainAction[] {
  return allActions.filter(action => {
    // Status-based action filtering - only return actions valid for current state
    if (rawStatus === "draft" && action.key.includes("draft")) return true;
    if (rawStatus === "open" && action.key.includes("open")) return true;
    if (rawStatus === "accepted" && action.key.includes("accepted")) return true;
    if (rawStatus === "in_progress" && action.key.includes("in_progress")) return true;
    if (rawStatus === "in_service" && action.key.includes("in_service")) return true;
    if (rawStatus === "proposed" && action.key.includes("proposed")) return true;
    if (rawStatus === "accepted" && action.key.includes("accepted")) return true;
    if (rawStatus === "in_production" && action.key.includes("in_production")) return true;
    return false;
  });
}

export async function GET(
  _request: Request,
  segment: { params: Promise<{ aggregateId: string }> },
) {
  const id = (await segment.params).aggregateId;
  if (!id) {
    return NextResponse.json({ ok: false, error: "aggregateId missing" }, { status: 400 });
  }

  // Global session extraction for all aggregate types - enforce authentication before any processing
  try {
    const cookie = _request.headers.get("Cookie");
    const { WORKSPACE_SESSION_COOKIE, decodeWorkspaceSession } = await import("@repo/core-kernel");
    const sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }
    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId || !session.sessionId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Create reusable session context for all aggregate types
    const sessionContext = {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    };

    // LawyersHub.CASE - canonical single source implementation
    if (id.startsWith("case-")) {
      const parsed = GetCaseByIdInputSchema.safeParse({ 
        caseId: id,
        ...sessionContext 
      });
      if (!parsed.success) {
        const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
      }

      try {
        const commandInput = parsed.data;
        const output = await capabilityRegistry.invokeAsync<{
          readonly type: "lawyershub.case";
          readonly id: string;
          readonly displayTitle: string;
          readonly displaySubtitle: string;
          readonly rawStatus: string;
          readonly owner: string | undefined;
          readonly createdAt: string;
          readonly updatedAt: string;
          readonly evidenceCount: number;
          readonly priority: string;
        } | undefined>("case", "getById", commandInput);
        
        const result = output.output;
        if (result === undefined) {
          return NextResponse.json({ ok: false, error: `Case not found: ${id}` }, { status: 404 });
        }

        return NextResponse.json({
          ok: true,
          ...result,
          lifecycle: createLifecycle(["draft", "open", "in_progress", "closed"], result.rawStatus, {
            draft: "Draft Matter",
            open: "Open / Assigned",
            in_progress: "In Progress",
            closed: "Closed / Delivered",
          }),
          availableActions: createAvailableActions(result.rawStatus, [
            {
              key: "assign_lawyer_draft",
              label: "Tetapkan Penasihat Hukum → Buka Kasus",
              capability: "lawyershub",
              commandName: "assignLawyer",
              buildInput: (id) => ({ id, lawyerId: `lawyer-${id}-eos` }),
              tone: "primary" as const,
            },
            {
              key: "close_in_progress",
              label: "Selesaikan Kasus",
              capability: "lawyershub",
              commandName: "close",
              buildInput: (id) => ({ id }),
              tone: "success" as const,
            },
          ]),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[GET /api/domain/${id}] Error:`, message);
        if (message.includes("isolation violation") || message.includes("authentication violation") || message.includes("access denied")) {
          return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // Services.ID.REQUEST - canonical single source implementation
    if (id.startsWith("sreq-") || id.startsWith("request-")) {
      const serviceId = id.startsWith("sreq-") ? id : id;
      const { GetServiceRequestByIdInputSchema } = await import("../../../../../../capabilities/service-directory/implementation/commands/get-service-request-by-id.command");
      const parsed = GetServiceRequestByIdInputSchema.safeParse({ 
        serviceRequestId: serviceId,
        ...sessionContext 
      });
      
      let result: any;
      if (!parsed.success) {
        const fallbackOutput = await capabilityRegistry.invokeAsync<any>("service-directory", "listByWorkspace", {
          sessionId: sessionContext.sessionId,
          limit: 100,
          offset: 0
        }).catch(() => ({ output: [] }));
        const matches = (fallbackOutput.output || []).filter((r: any) => r.id === id || r.workId === id);
        if (matches.length === 0) {
          const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
          return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
        }
        result = matches[0];
      } else {
        const commandInput = parsed.data;
        const output = await capabilityRegistry.invokeAsync<{
          readonly type: "services-id.request";
          readonly id: string;
          readonly displayTitle: string;
          readonly displaySubtitle: string;
          readonly rawStatus: string;
          readonly owner: string | undefined;
          readonly createdAt: string;
          readonly updatedAt: string;
          readonly evidenceCount: number;
          readonly category: string | undefined;
          readonly budget: number | undefined;
          readonly providerId: string | undefined;
        } | undefined>("service-directory", "getById", commandInput).catch(async () => {
          const alt = await capabilityRegistry.invokeAsync<any>("service-directory", "listByWorkspace", {
            sessionId: sessionContext.sessionId,
            limit: 100,
            offset: 0
          }).catch(() => ({ output: [] }));
          const matches = (alt.output || []).filter((r: any) => r.id === id || r.workId === id);
          return { output: matches[0] };
        });
        result = output?.output;
      }

      if (result === undefined) {
        return NextResponse.json({ ok: false, error: `ServiceRequest not found: ${id}` }, { status: 404 });
      }

      const rawStatus = result.rawStatus || result.status;
      return NextResponse.json({
        ok: true,
        ...result,
        id: result.id,
        workId: result.workId || result.id,
        title: result.title || result.displayTitle,
        description: result.description || result.displaySubtitle,
        status: rawStatus,
        lifecycle: createLifecycle(["draft", "accepted", "in_service", "delivered"], rawStatus, {
          draft: "Draft Request",
          accepted: "Accepted (Provider Matched)",
          in_service: "In Service / Delivery",
          delivered: "Delivered / Verified",
        }),
        availableActions: createAvailableActions(rawStatus, [
          {
            key: "accept_draft",
            label: "Terima Permintaan (Tetapkan Provider)",
            capability: "services-id",
            commandName: "acceptServiceRequest",
            buildInput: (id) => ({ id, providerId: `provider-${id}-d12` }),
            tone: "primary" as const,
          },
          {
            key: "deliver_in_service",
            label: "Tandai Layanan Terserahkan",
            capability: "services-id",
            commandName: "markServiceDelivered",
            buildInput: (id) => ({ id }),
            tone: "success" as const,
          },
        ]),
      });
    }

    // ILC.ARTICLE - canonical single source implementation
    if (id.startsWith("content-")) {
      const { GetContentArticleByIdInputSchema } = await import("../../../../../../capabilities/legal-community/implementation/commands/get-content-article-by-id.command");
      const parsed = GetContentArticleByIdInputSchema.safeParse({ 
        contentId: id,
        ...sessionContext 
      });
      if (!parsed.success) {
        const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
      }

      try {
        const commandInput = parsed.data;
        const output = await capabilityRegistry.invokeAsync<{
          readonly type: "ilc.article";
          readonly id: string;
          readonly displayTitle: string;
          readonly displaySubtitle: string;
          readonly rawStatus: string;
          readonly owner: string | undefined;
          readonly createdAt: string;
          readonly updatedAt: string;
          readonly evidenceCount: number;
          readonly topicLabel: string | undefined;
          readonly authorAffiliation: string | undefined;
          readonly readCount: number;
          readonly engagementCount: number;
          readonly replyCount: number;
        } | undefined>("contentArticle", "getById", commandInput);
        
        const result = output.output;
        if (result === undefined) {
          return NextResponse.json({ ok: false, error: `ContentArticle not found: ${id}` }, { status: 404 });
        }

        return NextResponse.json({
          ok: true,
          ...result,
          lifecycle: createLifecycle(["proposed", "accepted", "in_production", "published"], result.rawStatus, {
            proposed: "Proposed / Submitted",
            accepted: "Accepted by Editorial",
            in_production: "In Production / Review",
            published: "Published & Public",
          }),
          availableActions: createAvailableActions(result.rawStatus, [
            {
              key: "publish_proposed",
              label: "Terima & Publikasikan Artikel",
              capability: "ilc",
              commandName: "publishContent",
              buildInput: (id) => ({ id }),
              tone: "success" as const,
            },
            {
              key: "publish_in_production",
              label: "Publikasikan Artikel",
              capability: "ilc",
              commandName: "publishContent",
              buildInput: (id) => ({ id }),
              tone: "success" as const,
            },
          ]),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[GET /api/domain/${id}] Error:`, message);
        if (message.includes("isolation violation") || message.includes("authentication violation") || message.includes("access denied")) {
          return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // ILC.DISCUSSION - canonical single source implementation
    if (id.startsWith("disc-")) {
      const { GetCommunityDiscussionByIdInputSchema } = await import("../../../../../../capabilities/legal-community/implementation/commands/get-community-discussion-by-id.command");
      const parsed = GetCommunityDiscussionByIdInputSchema.safeParse({ 
        discussionId: id,
        ...sessionContext 
      });
      if (!parsed.success) {
        const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
        return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
      }

      try {
        const commandInput = parsed.data;
        const output = await capabilityRegistry.invokeAsync<{
          readonly type: "ilc.discussion";
          readonly id: string;
          readonly displayTitle: string;
          readonly displaySubtitle: string;
          readonly rawStatus: string;
          readonly owner: string | undefined;
          readonly createdAt: string;
          readonly updatedAt: string;
          readonly evidenceCount: number;
          readonly topicLabel: string | undefined;
          readonly startedByAffiliation: string | undefined;
          readonly replyCount: number;
          readonly viewCount: number;
        } | undefined>("communityDiscussion", "getById", commandInput);
        
        const result = output.output;
        if (result === undefined) {
          return NextResponse.json({ ok: false, error: `CommunityDiscussion not found: ${id}` }, { status: 404 });
        }

        return NextResponse.json({
          ok: true,
          ...result,
          lifecycle: createLifecycle(["open", "featured", "locked"], result.rawStatus, {
            open: "Open Discussion",
            featured: "Featured / Pinned",
            locked: "Locked / Archived",
          }),
          availableActions: createAvailableActions(result.rawStatus, []),
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[GET /api/domain/${id}] Error:`, message);
        if (message.includes("isolation violation") || message.includes("authentication violation") || message.includes("access denied")) {
          return NextResponse.json({ error: message }, { status: 401 });
        }
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // Unsupported ID prefix
    return NextResponse.json(
      { ok: false, error: `Unsupported aggregate ID prefix: ${id}. Expected case- / sreq- / content- / disc-.` },
      { status: 400 },
    );

  } catch (globalErr) {
    const message = globalErr instanceof Error ? globalErr.message : String(globalErr);
    console.error(`[GET /api/domain/${id}] Global session error:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}