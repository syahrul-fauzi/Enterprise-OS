import { NextResponse } from "next/server";
import type { CaseId } from "../../../../../../capabilities/legal-case/implementation/contracts";
import { CaseRepositoryInMemory } from "../../../../../../capabilities/legal-case/implementation/repository";
import type { ServiceRequestId } from "../../../../../../capabilities/service-directory/implementation/contracts/service.contracts";
import {
  ServiceRequestRepositoryInMemory,
} from "../../../../../../capabilities/service-directory/implementation/repository/service.repository";
import type {
  ContentId,
  DiscussionId,
} from "../../../../../../capabilities/legal-community/implementation/contracts/community.contracts";
import {
  CommunityDiscussionRepositoryInMemory,
  ContentArticleRepositoryInMemory,
} from "../../../../../../capabilities/legal-community/implementation/repository/community.repository";
import { DocumentRepositoryInMemory } from "../../../../../../capabilities/legal-document/implementation/repository";

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
    const caseId = id as unknown as CaseId;
    const c = CaseRepositoryInMemory.byId(caseId);
    if (c === undefined) {
      return NextResponse.json({ ok: false, error: `Case not found: ${id}` }, { status: 404 });
    }
    const evidenceCount = DocumentRepositoryInMemory.list().filter((d: { readonly matterId?: unknown }) => d.matterId === id).length;
    return NextResponse.json({
      ok: true,
      type: "lawyershub.case",
      id,
      displayTitle: c.title,
      displaySubtitle: c.description ?? "Legal Matter",
      rawStatus: c.status,
      owner: c.lawyerId,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      evidenceCount,
      lifecycle: lifecycle(["draft", "open", "in_progress", "closed"], c.status, {
        draft: "Draft Matter",
        open: "Open / Assigned",
        in_progress: "In Progress",
        closed: "Closed / Delivered",
      }),
      priority: c.priority,
    });
  }

  if (id.startsWith("sreq-")) {
    const sreqId = id as unknown as ServiceRequestId;
    const r = ServiceRequestRepositoryInMemory.byId(sreqId);
    if (r === undefined) {
      return NextResponse.json({ ok: false, error: `ServiceRequest not found: ${id}` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      type: "services-id.request",
      id,
      displayTitle: r.title,
      displaySubtitle: r.description ?? "Service Request",
      rawStatus: r.status,
      owner: r.requesterName,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      evidenceCount: r.providerId ? 1 : 0,
      lifecycle: lifecycle(["draft", "accepted", "in_service", "delivered"], r.status, {
        draft: "Draft Request",
        accepted: "Accepted (Provider Matched)",
        in_service: "In Service / Delivery",
        delivered: "Delivered / Verified",
      }),
      category: r.category,
      budget: r.budget,
      providerId: r.providerId,
    });
  }

  if (id.startsWith("content-")) {
    const contentId = id as unknown as ContentId;
    const a = ContentArticleRepositoryInMemory.byId(contentId);
    if (a === undefined) {
      return NextResponse.json({ ok: false, error: `ContentArticle not found: ${id}` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      type: "ilc.article",
      id,
      displayTitle: a.title,
      displaySubtitle: a.summary ?? "Legal Community Article / Content",
      rawStatus: a.status,
      owner: a.author,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
      evidenceCount: a.topicLabel ? 1 : 0,
      lifecycle: lifecycle(["proposed", "accepted", "in_production", "published"], a.status, {
        proposed: "Proposed / Submitted",
        accepted: "Accepted by Editorial",
        in_production: "In Production / Review",
        published: "Published & Public",
      }),
      topicLabel: a.topicLabel,
      authorAffiliation: a.authorAffiliation,
      readCount: a.readCount,
      engagementCount: a.engagementCount,
    });
  }

  if (id.startsWith("disc-")) {
    const discId = id as unknown as DiscussionId;
    const d = CommunityDiscussionRepositoryInMemory.byId(discId);
    if (d === undefined) {
      return NextResponse.json({ ok: false, error: `CommunityDiscussion not found: ${id}` }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      type: "ilc.discussion",
      id,
      displayTitle: d.title,
      displaySubtitle: d.summary ?? "Community Discussion",
      rawStatus: d.status,
      owner: d.startedBy,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.latestActivityAt.toISOString(),
      evidenceCount: d.topicLabel ? 1 : 0,
      lifecycle: lifecycle(["open", "featured", "locked"], d.status, {
        open: "Open Discussion",
        featured: "Featured / Pinned",
        locked: "Locked / Archived",
      }),
      topicLabel: d.topicLabel,
      startedByAffiliation: d.startedByAffiliation,
      replyCount: d.replyCount,
      viewCount: d.viewCount,
    });
  }

  return NextResponse.json(
    { ok: false, error: `Unsupported aggregate ID prefix: ${id}. Expected case- / sreq- / content- / disc-.` },
    { status: 400 },
  );
}
