import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  capabilityRegistry,
} from "@repo/core-kernel";

// Work list status labels in Indonesian
const STATUS_LABELS: Record<string, string> = {
  "intake": "Intake",
  "review": "Dalam Review",
  "document_preparation": "Persiapan Dokumen",
  "notary_review": "Review Notaris",
  "submission": "Diajukan",
  "government_processing": "Proses Pemerintah",
  "completed": "Selesai",
  "archived": "Diarsipkan"
};

// Work list status colors
const STATUS_COLORS: Record<string, string> = {
  "intake": "bg-blue-100 text-blue-800",
  "review": "bg-yellow-100 text-yellow-800",
  "document_preparation": "bg-purple-100 text-purple-800",
  "notary_review": "bg-orange-100 text-orange-800",
  "submission": "bg-indigo-100 text-indigo-800",
  "government_processing": "bg-cyan-100 text-cyan-800",
  "completed": "bg-green-100 text-green-800",
  "archived": "bg-gray-100 text-gray-800"
};

export default async function WorkListPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);
  
  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  // Fetch all work items for this user - use legal-case.listByWorkspace which implements single Work Reality model
  let workList = [];
  try {
    // Use correct session.sessionId (matches API route implementation and command schema requirements)
    const result = await capabilityRegistry.invokeAsync("legal-case", "case.listByWorkspace", {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });
    workList = result?.items || [];
  } catch (error) {
    console.error("[WorkListPage] Failed to fetch legal cases:", error);
    workList = [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Semua Pekerjaan</h1>
              <p className="mt-1 text-sm text-gray-500">Kelola semua pekerjaan hukum Anda dalam satu tempat</p>
            </div>
            <Link
              href="/work/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Buat Pekerjaan Baru
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to workspace link */}
        <Link
          href="/workspace"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Workspace
        </Link>

        {workList.length === 0 ? (
          /* Empty state */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Belum ada pekerjaan</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Mulailah dengan membuat pekerjaan hukum pertama Anda. Semua proses pendirian PT dapat dilacak dari awal hingga selesai.
            </p>
            <Link
              href="/work/new"
              className="mt-6 inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Buat Pekerjaan Pertama
            </Link>
          </div>
        ) : (
          /* Work list */
          <div className="grid gap-4">
            {workList.map((work: any) => (
              <Link
                key={work.id}
                href={`/work/${work.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">{work.title}</h3>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[work.currentState] || "bg-gray-100 text-gray-800"}`}>
                        {STATUS_LABELS[work.currentState] || work.currentState}
                      </span>
                    </div>
                    {work.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{work.description}</p>
                    )}
                    <div className="mt-4 flex items-center gap-6 text-xs text-gray-500">
                      <span>Dibuat: {new Date(work.createdAt).toLocaleDateString('id-ID')}</span>
                      {work.nextAction && (
                        <span>Aksi berikutnya: {work.nextAction}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}