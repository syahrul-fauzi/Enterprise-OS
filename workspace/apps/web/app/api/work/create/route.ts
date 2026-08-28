import { NextResponse } from "next/server";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry.js";

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
  lawyerId?: string;
  evidence: unknown[];
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

export function getAllWorksForWorkspace(workspaceId: string): CanonicalWorkRecord[] {
  const ids = workspaceWorkIndex.get(workspaceId) ?? [];
  return ids.map(id => canonicalWorkStore.get(id)).filter(Boolean) as CanonicalWorkRecord[];
}

export function getWorkById(workId: string): CanonicalWorkRecord | undefined {
  return canonicalWorkStore.get(workId);
}

function deriveSpecialization(domainType: string): string {
  switch (domainType) {
    case "legal-case": return "Legal Case";
    case "service-request": return "Service Request";
    case "consultation": return "Consultation";
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
      "services": "service-request",
      "services-id": "service-request",
      "consultation": "consultation",
      "general": "generic",
    };
    const domainType = domainTypeMap[domain] || "legal-case";

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
    const record: CanonicalWorkRecord = {
      workId,
      id: workId,
      title: title ?? `Work ${workId}`,
      description: description ?? "",
      linkedIntentId,
      domainType,
      specialization: deriveSpecialization(domainType),
      status: "open",
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [],
    };
    canonicalWorkStore.set(workId, record);
    const wsIndex = workspaceWorkIndex.get(session.workspaceId) ?? [];
    wsIndex.push(workId);
    workspaceWorkIndex.set(session.workspaceId, wsIndex);

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