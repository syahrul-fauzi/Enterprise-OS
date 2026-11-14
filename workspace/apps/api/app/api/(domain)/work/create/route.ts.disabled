import { NextResponse } from "next/server";
import { z } from "zod";
import {
  readWorkspaceSessionFromRequest,
  type WorkspaceSession,
} from "@repo/core-kernel";

// Lazy load capabilityRegistry sesuai pattern yang digunakan di semua route EOS (hindari module cycle)
async function getCapabilityRegistry() {
  const loaded = await import("@repo/core-kernel/registry/capability-command-registry.js");
  return (loaded as { capabilityRegistry?: { invoke?: (...args: unknown[]) => Promise<unknown> } }).capabilityRegistry;
}

const CreateWorkRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  domainType: z.enum(["legal", "cross-domain-case", "consultation", "administrative"]),
  specialization: z.string().min(1),
});

export async function POST(request: Request) {
  // Canonical auth validation: gunakan readWorkspaceSessionFromRequest untuk memproses request context (ini route yang mengkonsumsi session, bukan membuat session)
  const session = readWorkspaceSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing workspace session" }, { status: 401 });
  }
  
  // Dapatkan capability registry untuk invoke canonical work.create capability
  const capabilityRegistry = await getCapabilityRegistry();
  if (!capabilityRegistry?.invoke) {
    return NextResponse.json({ error: "Capability registry unavailable" }, { status: 503 });
  }
  
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateWorkRequestSchema.safeParse(payload);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return NextResponse.json({ error: `Validation failed: ${messages}` }, { status: 422 });
  }

  try {
    // Invoke canonical work.create capability (pure adapter pattern) - gunakan type assertion
    const creationResult = await capabilityRegistry.invoke("work.create", {
      ...parsed.data,
      requestOrigin: request.headers.get("origin"),
      actorContext: session // Berikan context session yang sudah didecode secara kanonis
    }) as {
      success: boolean;
      work?: {
        workId: string;
        title: string;
        description: string;
        status: string;
        createdAt: string;
        tenantId: string;
        workspaceId: string;
        actorId: string;
      };
      error?: string;
    };
    
    if (!creationResult.success || !creationResult.work) {
      console.error("[WORK CREATE FAIL] Work creation failed:", creationResult.error);
      return NextResponse.json({ error: creationResult.error || "Failed to create work" }, { status: 400 });
    }
    
    const newWork = creationResult.work;
    console.log("[WORK CREATE SUCCESS] Work created via canonical capability:", newWork.workId);

    return NextResponse.json(
      {
        ok: true,
        workCreated: true,
        workId: newWork.workId,
        title: newWork.title,
        status: newWork.status,
        tenantId: newWork.tenantId,
        workspaceId: newWork.workspaceId,
        redirectUrl: `/work/${newWork.workId}`,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[work-create-api] Error:", err);
    if (err instanceof Error) {
      console.error("[work-create-api] Stack trace:", err.stack);
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}