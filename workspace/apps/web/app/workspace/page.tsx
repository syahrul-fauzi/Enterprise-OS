import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel";

export default async function WorkspacePage() {
  // Read and validate session cookie
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

  // Fetch user's work list via capability registry - use legal-case.listByWorkspace which implements single Work Reality model
  let workList = [];
  try {
    // Use correct session.sessionId (matches API route implementation and command schema requirements)
    const legalResult = await capabilityRegistry.invokeAsync("legal-case", "case.listByWorkspace", {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
      actorId: session.actorId,
    });
    workList = legalResult?.items || [];
  } catch (error) {
    console.error("[WorkspacePage] Failed to fetch legal cases:", error);
    workList = [];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workspace</h1>
            <p className="text-sm text-gray-500">{session.actorLabel || "User"} • {session.workspaceName || "Professional Workspace"}</p>
          </div>
          <a
            href="/work/new"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create New Work
          </a>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {workList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No work yet</h2>
            <p className="text-gray-500 mb-6">Create your first work item to get started with EOS.</p>
            <a
              href="/work/new"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Your First Work
            </a>
          </div>
        ) : (
          <div className="grid gap-4">
            {workList.map((work: any) => (
              <div key={work.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-medium text-gray-900">{work.title || "Untitled Work"}</h3>
                <p className="text-sm text-gray-500 mt-1">{work.currentState || "In Progress"}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}