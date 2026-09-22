import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { canonicalWorkStore, getWorkById, workRepository, toWorkAggregate, toCanonicalWorkRecord } from "../../create/route";
import type { WorkAggregate } from "@capabilities/work-core/contracts/work.contracts";

// GET: Retrieve all evidence for a specific work item
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    // Validate session to ensure authorized access
    const decodedSession = decodeWorkspaceSession(sessionCookie.value);
    if (!decodedSession) {
      return NextResponse.json({ error: "Invalid session" }, { status: 403 });
    }

    const { id: workId } = params;
    const work = await getWorkById(workId);
    
    if (!work) {
      return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    // Verify actor has access to this work (tenant/workspace match)
    if (work.tenantId !== decodedSession.tenantId || work.workspaceId !== decodedSession.workspaceId) {
      return NextResponse.json({ error: "Unauthorized to access this work's evidence" }, { status: 403 });
    }

    // Return evidence with full audit trail, as stored in canonical record
    return NextResponse.json({
      success: true,
      workId: workId,
      evidence: work.evidence,
      evidenceCount: work.evidence.length,
      evidenceChain: {
        actorId: decodedSession.actorId,
        accessedAt: new Date().toISOString(),
        source: "eos-face",
        canInspect: true,
        canReconstruct: true // Per PRIORITY 04: ACTION→EXECUTION→EVIDENCE→INSPECT→RECONSTRUCT
      }
    }, { status: 200 });
  } catch (error) {
    console.error("[API/WORK/[ID]/EVIDENCE] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST: Add new evidence to an existing work item (reuses existing upload logic)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
    
    if (!sessionCookie) {
      return NextResponse.json({ error: "No active session" }, { status: 401 });
    }

    const decodedSession = decodeWorkspaceSession(sessionCookie.value);
    if (!decodedSession) {
      return NextResponse.json({ error: "Invalid session" }, { status: 403 });
    }

    const { id: workId } = params;
    const work = await getWorkById(workId);
    
    if (!work) {
      return NextResponse.json({ error: "Work item not found" }, { status: 404 });
    }

    // Verify workspace/tenant ownership
    if (work.tenantId !== decodedSession.tenantId || work.workspaceId !== decodedSession.workspaceId) {
      return NextResponse.json({ error: "Unauthorized to modify this work's evidence" }, { status: 403 });
    }

    const body = await request.json();
    const { type, title, content, metadata } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "type and title are required for evidence" }, { status: 400 });
    }

    // Create new evidence entry following the existing CanonicalWorkRecord schema
    const newEvidence = {
      id: `evidence-${Date.now()}`,
      type,
      title,
      content: content || "",
      uploadedAt: new Date().toISOString(),
      source: "eos-face-upload",
      uploadedBy: decodedSession.actorId,
      metadata: metadata || {}
    };

    // Mutate the canonical work record (single source of truth, no parallel execution)
    work.evidence.push(newEvidence);
    work.updatedAt = new Date().toISOString();
    
    // Persist updated evidence to PostgreSQL source of truth FIRST
    const dbRecord = toWorkAggregate(work);
    const savedDbRecord = await workRepository.save(dbRecord);
    // Update in-memory cache with saved record
    const savedCanonical = toCanonicalWorkRecord(savedDbRecord as WorkAggregate);
    canonicalWorkStore.set(workId, savedCanonical);

    // Return complete evidence chain with audit info
    return NextResponse.json({
      success: true,
      workId: workId,
      evidenceAdded: newEvidence,
      currentEvidenceCount: work.evidence.length,
      evidence: work.evidence,
      evidenceChain: {
        actorId: decodedSession.actorId,
        timestamp: new Date().toISOString(),
        source: "eos-face",
        mutation: "addEvidence",
        canInspect: true,
        canReconstruct: true
      }
    }, { status: 200 });
  } catch (error) {
    console.error("[API/WORK/[WORKID]/EVIDENCE] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}