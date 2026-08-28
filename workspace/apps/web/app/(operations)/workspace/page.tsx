import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { listCasesByWorkspace } from "../../../../../capabilities/legal-case/implementation/commands/case.commands";
import { getAllWorksForWorkspace } from "../../api/work/create/route";

export default async function WorkspacePage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    redirect("/");
  }

  if (!session) {
    redirect("/");
  }

  let workItems: Array<{ id: string; title: string; description?: string; status: string }> = [];
  try {
    const result = await listCasesByWorkspace.execute({
      sessionId: session.sessionId!,
      tenantId: session.tenantId!,
      workspaceId: session.workspaceId!,
      actorId: session.actorId!,
      limit: 100,
      offset: 0,
    });
    workItems = (result.items || []).map((item: any) => ({
      id: String(item.id ?? item.workId ?? item.caseId ?? ''),
      title: item.title ?? 'Untitled Work',
      description: item.description ?? '',
      status: item.status ?? 'open',
    }));
  } catch (err) {
    console.error("[WorkspacePage] Failed to list work items:", err);
  }

  try {
    const canonicalWorks = getAllWorksForWorkspace(session.workspaceId);
    const existingIds = new Set(workItems.map(w => w.id));
    for (const cw of canonicalWorks) {
      if (!existingIds.has(cw.workId) && !existingIds.has(cw.id)) {
        workItems.unshift({
          id: cw.workId,
          title: cw.title,
          description: cw.description,
          status: cw.status,
        });
      }
    }
  } catch (err) {
    console.error("[WorkspacePage] Failed to merge canonical work items:", err);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">My Workspace</h1>
          <p className="mt-2 text-slate-600">Semua pekerjaan yang terikat dengan workspace Anda.</p>
        </header>

        {workItems.length === 0 ? (
          <div className="border rounded-2xl bg-white p-12 shadow-sm text-center">
            <p className="text-slate-500">Belum ada pekerjaan. Buat Work pertama melalui EOS Face.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workItems.map(work => (
              <Link
                key={work.id}
                href={`/work/${work.id}`}
                data-testid={`work-card-${work.id}`}
                className="block border rounded-xl bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-slate-900 line-clamp-1">{work.title}</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 ml-2">
                    {work.status}
                  </span>
                </div>
                {work.description && (
                  <p className="text-sm text-slate-600 line-clamp-2 mb-3">{work.description}</p>
                )}
                <div className="text-xs font-mono text-slate-400">ID: {work.id}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}