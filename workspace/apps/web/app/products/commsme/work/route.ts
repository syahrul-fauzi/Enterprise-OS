import { NextResponse } from "next/server";
import { RequirementRepositoryCurrent } from "requirement-management/implementation/repository";
import { SessionRepositoryInMemory } from "identity/implementation/repositories";
import { getSessionRepositoryPostgres } from "identity/implementation/repositories/session.repository";

const COM_SESSION_ID = "session-test-001";
const COM_TENANT_ID = "tenant-001";
const COM_WORKSPACE_ID = "workspace-001";
const COM_ACTOR_ID = "user-001";

const sessionRepository = process.env.DATABASE_URL
  ? getSessionRepositoryPostgres()
  : SessionRepositoryInMemory;

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const workId = searchParams.get("workId");
    if (!workId) {
      return NextResponse.json(
        { ok: false, error: "Parameter workId wajib diisi: ?workId=req-XXX" },
        { status: 400 },
      );
    }

    const session = await sessionRepository.byId(COM_SESSION_ID as any);
    if (!session || session.revokedAt !== null || session.tenantId !== COM_TENANT_ID) {
      return NextResponse.json({ ok: false, error: "Invalid atau revoked session" }, { status: 401 });
    }

    const aggregate = await RequirementRepositoryCurrent.byId(workId as any);
    if (!aggregate) {
      return NextResponse.json(
        { ok: false, error: `Work Item dengan id=${workId} tidak ditemukan` },
        { status: 404 },
      );
    }

    const plain = JSON.parse(JSON.stringify(aggregate));
    return NextResponse.json({
      ok: true,
      workId: plain.id,
      status: plain.status,
      verificationStatus: plain.verificationStatus,
      title: plain.title,
      summary: plain.summary,
      description: plain.description,
      owner: plain.owner,
      priority: plain.priority,
      source: plain.source,
      acceptanceCriteria: plain.acceptanceCriteria ?? [],
      linkedCapabilityIds: plain.linkedCapabilityIds ?? [],
      dates: {
        createdAt: plain.createdAt,
        approvedAt: plain.approvedAt ?? null,
        implementedAt: plain.implementedAt ?? null,
        verifiedAt: plain.verifiedAt ?? null,
        updatedAt: plain.updatedAt ?? null,
      },
      handoffReady: typeof plain.summary === "string" && plain.summary.startsWith("[HANDOFF READY]"),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}