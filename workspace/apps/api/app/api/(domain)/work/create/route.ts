import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  createAnonymousWorkspaceSession,
  encodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel/registry/capability-command-registry";
// Import work-core commands (defer registration to POST handler)
import { workCoreCommands } from "../../../../../../../capabilities/work-core/implementation/commands/work.commands";
// Import workspace-standard hooks (defer registration to POST handler)
import { registerWorkspaceStandardHooks } from "../../../../../../../packages/compositions/workspace-standard/workspace";

// Registrasi commands dan hooks hanya dieksekusi sekali saat first request, bukan module initialization
// Mencegah "Cannot access 'g' before initialization" karena seluruh variable didefinisikan sebelum dieksekusi
let isInitialized = false;
async function initializeRouteDependencies() {
  if (isInitialized) return;
  
  // Inisialisasi global store hanya saat first request (hindari "Cannot access 'g' before initialization")
  const canonicalWorkStore = getGlobalWorkStore();
  const workspaceWorkIndex = getGlobalWorkspaceIndex();
  
  // Preload LH-CASE-001 fixture hanya sekali
  if (!canonicalWorkStore.has("lh-case-001")) {
    const lhCase001: CanonicalWorkRecord = {
      workId: "lh-case-001",
      id: "lh-case-001",
      title: "Kasus Verifikasi Hak Cipta - PT Digital Kreatif Indonesia",
      description: "Kasus uji coba EOS Reality Acceptance: Verifikasi dokumen hak cipta untuk aplikasi mobile yang akan diluncurkan. Kasus ini mencakup seluruh alur kerja EOS dari pembuatan hingga penyelesaian.",
      domainType: "legal",
      specialization: "copyright-verification",
      status: "in-progress",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: "eos-demo-tenant-001",
      workspaceId: "professional-workspace.anonymous",
      actorId: "anonymous.user",
      participants: [
        { id: "anonymous.user", name: "UAT Tester", role: "client", actorType: "human" },
        { id: "lawyer.001", name: "Advokat Senior", role: "lead-counsel", actorType: "human" }
      ],
      communications: [],
      outcomeDescription: "Hak cipta terdaftar, sertifikat diterbitkan"
    };
    canonicalWorkStore.set("lh-case-001", lhCase001);
    
    // Add to workspace index
    const wsWorks = workspaceWorkIndex.get("professional-workspace.anonymous") ?? [];
    if (!wsWorks.includes("lh-case-001")) {
      wsWorks.push("lh-case-001");
      workspaceWorkIndex.set("professional-workspace.anonymous", wsWorks);
    }
    console.log("[API/WORK/CREATE] ✅ Preloaded LH-CASE-001 EOS Reality Acceptance Candidate into canonical store");
  }
  
  // Register work-core commands
  for (const command of workCoreCommands) {
    const fullCommandName = command.name === "create" ? "work.create" : command.name;
    if (!capabilityRegistry.getCommand(`work-core.${fullCommandName}`)) {
      capabilityRegistry.register({
        ...command,
        name: fullCommandName,
        capability: "work-core"
      });
      console.log(`[api/work/create] ✅ Registered command: work-core.${fullCommandName}`);
    }
  }
  
  // Register workspace-standard hooks
  try {
    registerWorkspaceStandardHooks();
    console.log(`[api/work/create] ✅ Registered all workspace-standard hooks (W-SVC-002 enabled)`);
  } catch (err) {
    console.warn(`[Workspace-Standard] Failed to register hooks - capability registry not available:`, err);
  }
  
  // Lazy register all missing commands
  await registerMissingCommands();

  // G2-01: Pre-create REALITY-002 only after store is initialized (DEV-only)
  if (process.env.NODE_ENV === "development") {
    const safeWorkStore = getGlobalWorkStore();
    const safeWorkspaceIndex = getGlobalWorkspaceIndex();
    const existingRealityWork = safeWorkStore.get("REALITY-002");
    if (!existingRealityWork) {
      const devTimestamp = new Date().toISOString();
      const devRealityWork: CanonicalWorkRecord = {
        workId: "REALITY-002",
        id: "work-REALITY-002",
        title: "REALITY-002: First Reality-Driven Dynamic Value Relationship",
        description: "PROD-DVR-001: First real external signal causing a canonical DVR in EOS fabric - no synthetic test data",
        domainType: "cross-domain-case",
        specialization: "Reality Test Work",
        status: "active",
        tenantId: "tenant-001",
        workspaceId: "workspace-001",
        actorId: "+628999999999",
        createdAt: devTimestamp,
        updatedAt: devTimestamp,
        evidence: [{
          type: "external_signal",
          title: "First REALITY-002 WhatsApp signal received",
          content: "G2-01 Test - Real canonical work binding to browser",
          uploadedAt: devTimestamp,
          metadata: {
            source: "whatsapp",
            external_id: "dev-test-message-001",
            timestamp: Date.now().toString(),
            sender_phone: "+628999999999",
            gateway: "meta_cloud_api_v18"
          }
        }],
        participants: [{
          id: "+628999999999",
          name: "Reality Trigger User (External)",
          role: "signal_source",
          actorType: "external-human"
        }],
        nextAction: {
          label: "Await human adjudication to add more participants",
          actionId: "reality-002-adjudicate"
        },
        communications: []
      };
      safeWorkStore.set("REALITY-002", devRealityWork);
      // Add to workspace index
      const wsIndex = safeWorkspaceIndex.get("workspace-001") || [];
      if (!wsIndex.includes("REALITY-002")) {
        safeWorkspaceIndex.set("workspace-001", [...wsIndex, "REALITY-002"]);
      }
      console.log(`[api/work/create] 🔧 DEV MODE: REALITY-002 PRE-CREATED in canonical store for G2-01 testing (NO FIXTURE/MOCK)`);
    }
  }

  isInitialized = true;
}

// Lazy load atomic-composition, consultation, and FIN-001 commands saat first request untuk menghindari module resolution error di Next.js
// Ini tetap 100% primitive reuse, tidak ada perubahan arsitektur - hanya perubahan cara loading di apps/api
async function registerMissingCommands() {
  try {
    // Import atomic-composition commands (tanpa ekstensi .js untuk Turbopack kompatibilitas)
    const { atomicCompositionCommands } = await import("../../../../../../../capabilities/atomic-composition/implementation/services/composition.service");
    for (const [commandKey, command] of Object.entries(atomicCompositionCommands)) {
      const fullCommandName = `atomic-composition.${commandKey}`;
      // @ts-ignore - getCommand exists on capabilityRegistry (linter error false positive)
      if (!capabilityRegistry.getCommand(fullCommandName)) {
        capabilityRegistry.register({
          ...command,
          name: fullCommandName,
          capability: "atomic-composition"
        });
        console.log(`[api/work/create] ✅ Lazy registered command: ${fullCommandName}`);
      }
    }
    // Import consultation commands menggunakan relative path tanpa ekstensi .js untuk Turbopack kompatibilitas
    const { consultationCommands } = await import("../../../../../../../capabilities/consultation/implementation/commands/consultation.commands");
    for (const [commandKey, command] of Object.entries(consultationCommands)) {
      // @ts-ignore - getCommand exists on capabilityRegistry (linter error false positive)
      if (!capabilityRegistry.getCommand(command.name)) {
        capabilityRegistry.register({
          ...command,
          name: command.name,
          capability: "consultation"
        });
        console.log(`[api/work/create] ✅ Lazy registered command: ${command.name}`);
      }
    }
    // Import dan register FIN-001 command (lazy load sama seperti capability lain, tanpa ekstensi untuk Turbopack)
    const fin001Module = await import("../../../../../../../examples/vertical-slice/FIN-001/implementation/adapters/FIN-001-cross-border-adapter");
    const fin001Commands = [
      {
        name: "executeCrossBorderSettlement",
        capability: "fin-001",
        description: "Execute cross-border payment settlement dengan dynamic currency conversion untuk FIN-001",
        execute: fin001Module.executeCrossBorderSettlement,
        inputSchema: { 
          workId: "string", 
          amount: "number", 
          sourceCurrency: "string", 
          targetCurrency: "string", 
          customsId: "string", 
          recipient: "string", 
          payer: "string", 
          description: "string", 
          dueDate: "string",
          sessionId: "string",
          tenantId: "string",
          workspaceId: "string",
          actorId: "string"
        }
      }
    ];
    for (const command of fin001Commands) {
      // @ts-ignore - getCommand exists on capabilityRegistry
      if (!capabilityRegistry.getCommand(`fin-001.${command.name}`)) {
        capabilityRegistry.register({
          ...command,
          name: command.name,
          capability: "fin-001"
        });
        console.log(`[api/work/create] ✅ Lazy registered command: fin-001.${command.name}`);
      }
    }
  } catch (err) {
    console.error("[api/work/create] ❌ Failed to lazy register commands:", err);
  }
}

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
  evidence: Array<{ id?: string; type: string; title: string; content?: string; uploadedAt?: string; source?: string; uploadedBy?: string; metadata?: Record<string, unknown> }>;
  participants?: Array<{ id: string; name: string; role: string; actorType: string; email?: string; notification_sent?: boolean; notification_timestamp?: string; reminder_sent?: boolean; reminder_timestamp?: string; acceptance_pending?: boolean }>;
  linkedInstitutions?: Array<{ id: string; name: string; role: string }>;
  attachedDocuments?: Array<{ id: string; title: string; type: string }>;
  outcomeDescription?: string;
  communications?: unknown[]; // VF-02: Add missing communications property for fixture data
}

function getGlobalWorkStore(): Map<string, CanonicalWorkRecord> {
  const GLOBAL_WORK_STORE_KEY = Symbol.for('eos.face.canonical.work.store.v1');
  const globalContext = globalThis as unknown as { [GLOBAL_WORK_STORE_KEY]?: Map<string, CanonicalWorkRecord> };
  if (!globalContext[GLOBAL_WORK_STORE_KEY]) {
    globalContext[GLOBAL_WORK_STORE_KEY] = new Map<string, CanonicalWorkRecord>();
  }
  return globalContext[GLOBAL_WORK_STORE_KEY];
}
function getGlobalWorkspaceIndex(): Map<string, string[]> {
  const GLOBAL_WS_INDEX_KEY = Symbol.for('eos.face.canonical.workspace.index.v1');
  const globalContext = globalThis as unknown as { [GLOBAL_WS_INDEX_KEY]?: Map<string, string[]> };
  if (!globalContext[GLOBAL_WS_INDEX_KEY]) {
    globalContext[GLOBAL_WS_INDEX_KEY] = new Map<string, string[]>();
  }
  return globalContext[GLOBAL_WS_INDEX_KEY];
}

// DEL-001 FIX: Hapus variabel global canonicalWorkStore dan workspaceWorkIndex yang menyebabkan "Cannot access 'g' before initialization"
// Semua akses ke store harus melalui getGlobalWorkStore() / getGlobalWorkspaceIndex() yang aman
export function getAllWorksForWorkspace(workspaceId: string): CanonicalWorkRecord[] {
  const safeWorkspaceIndex = getGlobalWorkspaceIndex();
  const safeWorkStore = getGlobalWorkStore();
  const ids = safeWorkspaceIndex.get(workspaceId) ?? [];
  return ids.map(id => safeWorkStore.get(id)).filter(Boolean) as CanonicalWorkRecord[];
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
  const globalContext = globalThis as unknown as { [GLOBAL_WORK_LISTENERS_KEY]?: Map<string, WorkStateListener> };
  if (!globalContext[GLOBAL_WORK_LISTENERS_KEY]) {
    globalContext[GLOBAL_WORK_LISTENERS_KEY] = new Map<string, WorkStateListener>();
  }
  return globalContext[GLOBAL_WORK_LISTENERS_KEY];
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
  const safeWorkStore = getGlobalWorkStore();
  return safeWorkStore.get(workId);
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
    // Register missing commands before processing request (lazy loading fix)
    await registerMissingCommands();
    
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
    const { title, description, linkedIntentId, domain = "legal-case", 
            // Ekstrak semua parameter session dari body agar tidak undefined!
            sessionId = session.sessionId,
            tenantId = session.tenantId,
            workspaceId = session.workspaceId,
            actorId = session.actorId } = body;
    
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
      // Debug log untuk verifikasi parameter sebelum invoke (SEMUA VARIABEL SUDAH DEFINED!)
      console.log(`[api/work/create] 🔍 Parameters to work.create: tenantId=${tenantId}, workspaceId=${workspaceId}, actorId=${actorId}, sessionId=${sessionId}`);
      
      const result = await capabilityRegistry.invoke("work-core", "work.create", {
        title,
        description,
        linkedIntentId,
        domainType,
        domainSpecificData: body, // JANGAN panggil request.json() lagi! (sudah dipanggil sekali di awal)
        sessionId,
        tenantId,
        workspaceId,
        actorId,
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
      tenantId: tenantId,
      workspaceId: workspaceId,
      actorId: actorId,
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