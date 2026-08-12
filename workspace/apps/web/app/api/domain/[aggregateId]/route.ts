import { NextResponse } from "next/server";
import { capabilityRegistry } from "@repo/core-kernel";
import { GetCaseByIdInputSchema } from "../../../../../../capabilities/legal-case/implementation/commands/get-case-by-id.command";

export const runtime = "nodejs";

type LifecycleStep = {
  readonly key: string;
  readonly label: string;
  readonly reached: boolean;
  readonly active: boolean;
};

function lifecycle(order: readonly string[], rawStatus: string, labels: Record<string, string>): LifecycleStep[] {
  const idx = order.indexOf(rawStatus);
  return order.map((s, i) => ({
    key: s,
    label: labels[s] ?? s,
    reached: idx === -1 ? i <= 0 : i <= idx,
    active: idx === i,
  }));
}

export async function GET(
  _request: Request,
  segment: { params: Promise<{ aggregateId: string }> },
) {
  const id = (await segment.params).aggregateId;
  if (!id) {
    return NextResponse.json({ ok: false, error: "aggregateId missing" }, { status: 400 });
  }

  if (id.startsWith("case-")) {
    const parsed = GetCaseByIdInputSchema.safeParse({ caseId: id });
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }

    try {
      // Single canonical command invocation - all orchestration in capability layer
      const output = capabilityRegistry.invoke<{
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
      } | undefined>("case", "getById", parsed.data);
      
      const result = output.output;
      if (result === undefined) {
        return NextResponse.json({ ok: false, error: `Case not found: ${id}` }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        ...result,
        lifecycle: lifecycle(["draft", "open", "in_progress", "closed"], result.rawStatus, {
          draft: "Draft Matter",
          open: "Open / Assigned",
          in_progress: "In Progress",
          closed: "Closed / Delivered",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (id.startsWith("sreq-")) {
    const { GetServiceRequestByIdInputSchema } = await import("../../../../../../capabilities/service-directory/implementation/commands/get-service-request-by-id.command");
    const parsed = GetServiceRequestByIdInputSchema.safeParse({ serviceRequestId: id });
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }

    try {
      // Single canonical command invocation - all orchestration in capability layer
      const output = capabilityRegistry.invoke<{
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
      } | undefined>("serviceRequest", "getById", parsed.data);
      
      const result = output.output;
      if (result === undefined) {
        return NextResponse.json({ ok: false, error: `ServiceRequest not found: ${id}` }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        ...result,
        lifecycle: lifecycle(["draft", "accepted", "in_service", "delivered"], result.rawStatus, {
          draft: "Draft Request",
          accepted: "Accepted (Provider Matched)",
          in_service: "In Service / Delivery",
          delivered: "Delivered / Verified",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (id.startsWith("content-")) {
    const { GetContentArticleByIdInputSchema } = await import("../../../../../../capabilities/legal-community/implementation/commands/get-content-article-by-id.command");
    const parsed = GetContentArticleByIdInputSchema.safeParse({ contentId: id });
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }

    try {
      // Single canonical command invocation - all orchestration in capability layer
      const output = capabilityRegistry.invoke<{
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
      } | undefined>("contentArticle", "getById", parsed.data);
      
      const result = output.output;
      if (result === undefined) {
        return NextResponse.json({ ok: false, error: `ContentArticle not found: ${id}` }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        ...result,
        lifecycle: lifecycle(["proposed", "accepted", "in_production", "published"], result.rawStatus, {
          proposed: "Proposed / Submitted",
          accepted: "Accepted by Editorial",
          in_production: "In Production / Review",
          published: "Published & Public",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  if (id.startsWith("disc-")) {
    const { GetCommunityDiscussionByIdInputSchema } = await import("../../../../../../capabilities/legal-community/implementation/commands/get-community-discussion-by-id.command");
    const parsed = GetCommunityDiscussionByIdInputSchema.safeParse({ discussionId: id });
    if (!parsed.success) {
      const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
    }

    try {
      // Single canonical command invocation - all orchestration in capability layer
      const output = capabilityRegistry.invoke<{
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
      } | undefined>("communityDiscussion", "getById", parsed.data);
      
      const result = output.output;
      if (result === undefined) {
        return NextResponse.json({ ok: false, error: `CommunityDiscussion not found: ${id}` }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        ...result,
        lifecycle: lifecycle(["open", "featured", "locked"], result.rawStatus, {
          open: "Open Discussion",
          featured: "Featured / Pinned",
          locked: "Locked / Archived",
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json(
    { ok: false, error: `Unsupported aggregate ID prefix: ${id}. Expected case- / sreq- / content- / disc-.` },
    { status: 400 },
  );
}