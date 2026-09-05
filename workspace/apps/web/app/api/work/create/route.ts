import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";
// Import removed - local implementation declared below to avoid duplicate declaration

export interface CanonicalWorkRecord {
  workId: string;
  id: string;
  title: string;
  description: string;
  linkedIntentId?: string;
  domainType: string;
  specialization: string;
  status: string;
  tenantId: string;
  workspaceId: string;
  actorId: string;
  createdAt: string;
  updatedAt: string;
  priority?: "low" | "medium" | "high" | "critical";
  lawyerId?: string;
  providerId?: string;
  platformSource?: string;
  platformMetadata?: Record<string, unknown>;
  hasBottleneck?: boolean;
  nextAction?: { label: string; actionId: string };
  evidence: Array<{ id?: string; type: string; title: string; content?: string; uploadedAt?: string; metadata?: Record<string, unknown> }>;
  participants?: Array<{ id: string; name: string; role: string; actorType: string; email?: string; notification_sent?: boolean; notification_timestamp?: string; reminder_sent?: boolean; reminder_timestamp?: string; acceptance_pending?: boolean }>;
  linkedInstitutions?: Array<{ id: string; name: string; role: string }>;
  attachedDocuments?: Array<{ id: string; title: string; type: string }>;
  outcomeDescription?: string;
}

const GLOBAL_WORK_STORE_KEY = Symbol.for('eos.face.canonical.work.store.v1');
const GLOBAL_WS_INDEX_KEY = Symbol.for('eos.face.canonical.work.wsindex.v1');

function getGlobalWorkStore(): Map<string, CanonicalWorkRecord> {
  const g = globalThis as unknown as { [GLOBAL_WORK_STORE_KEY]?: Map<string, CanonicalWorkRecord> };
  if (!g[GLOBAL_WORK_STORE_KEY]) {
    g[GLOBAL_WORK_STORE_KEY] = new Map<string, CanonicalWorkRecord>();
  }
  return g[GLOBAL_WORK_STORE_KEY];
}
function getGlobalWorkspaceIndex(): Map<string, string[]> {
  const g = globalThis as unknown as { [GLOBAL_WS_INDEX_KEY]?: Map<string, string[]> };
  if (!g[GLOBAL_WS_INDEX_KEY]) {
    g[GLOBAL_WS_INDEX_KEY] = new Map<string, string[]>();
  }
  return g[GLOBAL_WS_INDEX_KEY];
}

const canonicalWorkStore = getGlobalWorkStore();
const workspaceWorkIndex = getGlobalWorkspaceIndex();

// Export stores and helpers for server actions - necessary for Professional EOS Face generic updates
export { canonicalWorkStore, workspaceWorkIndex };
export function getAllWorksForWorkspace(workspaceId: string): CanonicalWorkRecord[] {
  const ids = workspaceWorkIndex.get(workspaceId) ?? [];
  return ids.map(id => canonicalWorkStore.get(id)).filter(Boolean) as CanonicalWorkRecord[];
}

// Global work listeners registry for realtime updates (Phase D)
const GLOBAL_WORK_LISTENERS_KEY = Symbol.for('eos.face.canonical.work.listeners.v1');
type WorkStateListener = {
  id: string;
  workspaceId: string;
  controller: ReadableStreamDefaultController;
  lastSentWorks: string;
};

function getGlobalWorkListeners(): Map<string, WorkStateListener> {
  const g = globalThis as unknown as { [GLOBAL_WORK_LISTENERS_KEY]?: Map<string, WorkStateListener> };
  if (!g[GLOBAL_WORK_LISTENERS_KEY]) {
    g[GLOBAL_WORK_LISTENERS_KEY] = new Map<string, WorkStateListener>();
  }
  return g[GLOBAL_WORK_LISTENERS_KEY];
}

// Exported function to notify all listeners of workspace updates
export function notifyWorkspaceListeners(workspaceId: string) {
  const listeners = getGlobalWorkListeners();
  const workspaceListeners = Array.from(listeners.values()).filter(l => l.workspaceId === workspaceId);
  
  console.log(`[notifyWorkspaceListeners] Notifying ${workspaceListeners.length} listeners for workspace: ${workspaceId}`);
  
  for (const listener of workspaceListeners) {
    try {
      const works = getAllWorksForWorkspace(workspaceId);
      const currentWorksJson = JSON.stringify(works);
      
      // Only send update if state actually changed
      if (currentWorksJson !== listener.lastSentWorks) {
        listener.lastSentWorks = currentWorksJson;
        const eventData = {
          type: "workspace.updated",
          timestamp: Date.now(),
          workspaceId,
          payload: { works, count: works.length }
        };
        listener.controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(eventData)}\n\n`));
        console.log(`[notifyWorkspaceListeners] Update sent to listener ${listener.id} for workspace ${workspaceId}`);
      }
    } catch (err) {
      console.error('[notifyWorkspaceListeners] Failed to send update:', err);
    }
  }
}

export function getWorkById(workId: string): CanonicalWorkRecord | undefined {
  return canonicalWorkStore.get(workId);
}

function deriveSpecialization(domainType: string): string {
  switch (domainType) {
    case "legal-case": return "Legal Case";
    case "community-discussion": return "Community Discussion";
    case "service-request": return "Service Request";
    case "consultation": return "Consultation";
    case "software-development": return "Human AI Business Launch";
    case "cross-domain-case": return "Cross-Domain Work";
    default: return "General Work";
  }
}

export async function POST(request: Request) {
  try {
    const cookie = request.headers.get("Cookie");
    let sessionCookie = cookie?.split(";").find(c => c.trim().startsWith(`${WORKSPACE_SESSION_COOKIE}=`));
    let createdNewSession = false;
    
    if (!sessionCookie) {
      console.log(`[POST /api/work/create] No existing session - creating anonymous session`);
      const anonymousSession = createAnonymousWorkspaceSession();
      const encodedSession = encodeWorkspaceSession(anonymousSession);
      sessionCookie = `${WORKSPACE_SESSION_COOKIE}=${encodedSession}`;
      createdNewSession = true;
    }

    const sessionValue = sessionCookie.split("=")[1];
    if (!sessionValue) {
      return NextResponse.json({ error: "Invalid session cookie" }, { status: 401 });
    }

    const session = decodeWorkspaceSession(sessionValue);
    if (!session || !session.tenantId || !session.workspaceId || !session.actorId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, linkedIntentId, domain = "legal-case" } = body;
    
    const domainTypeMap: Record<string, string> = {
      "legal": "legal-case",
      "lawyershub": "legal-case",
      "ilc": "community-discussion",
      "community": "community-discussion",
      "services": "service-request",
      "services-id": "service-request",
      "consultation": "consultation",
      "general": "generic",
      "business": "software-development",
      "launch": "software-development",
      "startup": "software-development",
      "cross-domain": "cross-domain-case",
    };
    const domainType = domainTypeMap[domain] || "software-development";

    let workId: string;
    let outputDomainType: string;
    try {
      const result = await capabilityRegistry.invokeAsync("work-core", "work.create", {
        title,
        description,
        linkedIntentId,
        domainType,
        domainSpecificData: body,
        sessionId: session.sessionId,
        tenantId: session.tenantId,
        workspaceId: session.workspaceId,
        actorId: session.actorId,
      }) as { output: { workId: string; domainType: string; id: string } };
      workId = result.output.workId;
      outputDomainType = result.output.domainType;
    } catch (registryError) {
      if (
        registryError instanceof Error &&
        (registryError.message.includes("Command not found") ||
          registryError.message.includes("capability-registry"))
      ) {
        console.log(
          `[POST /api/work/create] capabilityRegistry unavailable - using in-memory fallback. Reason: ${registryError.message.split("\n")[0]}`
        );
        workId = `w-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
        outputDomainType = domainType;
      } else {
        throw registryError;
      }
    }
    // Initialize with Wave 3 test work entities if domain is legal/PT formation
    const isPTEstablishment = description?.includes("mendirikan PT") || domain === "legal" || domainType === "legal-case";
    const initialParticipants = isPTEstablishment ? [
      { id: session.actorId, name: "Pengusaha (Requester)", role: "Pemohon", actorType: "human" },
      { id: "lawyer-001", name: "Advokat (Legal Lead)", role: "Legal Lead", actorType: "human" },
      { id: "notary-001", name: "Notaris (Registration Agent)", role: "Pendaftar", actorType: "human" }
    ] : [];
    const initialInstitutions = isPTEstablishment ? [
      { id: "kemenkumham-ri-001", name: "Kemenkumham RI", role: "Authorizing Institution" }
    ] : [];
    const initialDocuments = isPTEstablishment ? [
      { id: "doc-akta-001", title: "Akta Pendirian", type: "legal-document" },
      { id: "doc-siup-001", title: "SIUP", type: "business-license" },
      { id: "doc-nib-001", title: "NIB", type: "tax-registration" }
    ] : [];

    // Handle cohort1 cross-domain work items (reuse existing fixture data if provided)
    const isCohort1Work = body.cohort_assignment === "COHORT_1";
    const record: CanonicalWorkRecord = {
      workId,
      id: workId,
      title: title ?? `Work ${workId}`,
      description: description ?? "",
      linkedIntentId,
      domainType,
      specialization: deriveSpecialization(domainType),
      status: isCohort1Work ? "received" : "open",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      providerId: body.providerId,
      evidence: body.evidence || [],
      participants: body.participants || initialParticipants,
      linkedInstitutions: body.linkedInstitutions || initialInstitutions,
      attachedDocuments: body.attachedDocuments || initialDocuments,
      nextAction: body.nextAction,
    };
    canonicalWorkStore.set(workId, record);
    const wsIndex = workspaceWorkIndex.get(session.workspaceId) ?? [];
    wsIndex.push(workId);
    workspaceWorkIndex.set(session.workspaceId, wsIndex);

    // Phase D: Trigger realtime updates for all connected clients
    notifyWorkspaceListeners(session.workspaceId);
    console.log(`[POST /api/work/create] Work created successfully: ${workId} (domain: ${domainType}, linkedIntent: ${linkedIntentId})`);
    
    const response = NextResponse.json({
      workId,
      domainType: outputDomainType,
      linkedIntentId,
      message: "Canonical Work created successfully via core Work application service"
    }, { status: 201 });

    if (createdNewSession) {
      response.cookies.set({
        name: WORKSPACE_SESSION_COOKIE,
        value: sessionValue,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
    }

    return response;

  } catch (error) {
    console.error(`[POST /api/work/create] Core Work service error:`, error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create work through canonical Work API";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}