import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
  capabilityRegistry,
} from "@repo/core-kernel";
import { CaseDetailPage } from "@repo/presentation-widgets";

export default async function WorkDetailPage({ params }: { params: { id: string } }) {
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

  // Fetch the work/case from capability registry - session.id maps directly to session.sessionId in command schemas
  let workData = null;
  try {
    const result = await capabilityRegistry.invokeAsync("legal-case", "case.getById", {
      caseId: params.id,
      sessionId: session.sessionId, // Use correct session.sessionId (matches API route implementation)
    });
    workData = result;
  } catch (error) {
    console.error("[WorkDetailPage] Failed to fetch work:", error);
  }

  if (!workData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Work not found</h1>
          <p className="mt-2 text-gray-600">The work item you're looking for doesn't exist or you don't have access.</p>
          <a href="/workspace" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Back to Workspace
          </a>
        </div>
      </div>
    );
  }

  // Create the required binding for ProductPreviewShell
  const binding = {
    refresh: async () => {
      "use server";
      // Server-side refresh implementation
    },
    mutate: async () => {
      "use server";
      // Server-side mutate implementation
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CaseDetailPage
        productId="lawyershub"
        caseId={params.id}
        binding={binding}
      />
    </div>
  );
}