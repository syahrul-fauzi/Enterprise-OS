import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { capabilityRegistry } from "@repo/core-kernel";

export default async function NewWorkPage() {
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <h1 className="text-2xl font-bold text-gray-900">Buat Pekerjaan Baru</h1>
            <p className="mt-1 text-sm text-gray-500">Pilih jenis layanan hukum yang Anda butuhkan</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to workspace link */}
        <a
          href="/workspace"
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 mb-6"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Kembali ke Workspace
        </a>

        <form 
          action={async (formData) => {
            "use server";
            const title = formData.get("title") as string;
            const description = formData.get("description") as string;
            const workType = formData.get("workType") as string;
            
            if (!title) return;
            
            // For all work types, use legal-case.create which properly handles all workflows
            // This maintains architectural integrity - all work items go through the same capability system
            await capabilityRegistry.invokeAsync("legal-case", "case.create", {
              title,
              description: workType === "pt-establishment" ? description + " | pt-regular-concierge" : description,
              sessionId: session.sessionId, // Use correct session.sessionId (matches API route implementation)
              tenantId: session.tenantId,
              workspaceId: session.workspaceId,
              actorId: session.actorId,
            });
            
            redirect("/work");
          }}
          className="space-y-6"
        >
          {/* Work Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Jenis Pekerjaan</h2>
            <div className="grid gap-4">
              <label className="flex items-start p-4 border-2 border-blue-200 rounded-lg bg-blue-50 cursor-pointer has-[:checked]:border-blue-600">
                <input
                  type="radio"
                  name="workType"
                  value="pt-establishment"
                  defaultChecked
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Pendirian PT (PT Regular Concierge)</span>
                  <span className="block text-sm text-gray-500 mt-1">Layanan lengkap pendirian Perseroan Terbatas dengan pendampingan profesional hingga terbit.</span>
                  <span className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                            GOLDEN WORK - LH-GOLDEN-001
                          </span>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded-lg bg-white cursor-pointer has-[:checked]:border-blue-600">
                <input
                  type="radio"
                  name="workType"
                  value="legal-review"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Review Kontrak Hukum</span>
                  <span className="block text-sm text-gray-500 mt-1">Review dan analisis kontrak atau dokumen hukum oleh pengacara berpengalaman.</span>
                </div>
              </label>

              <label className="flex items-start p-4 border border-gray-200 rounded-lg bg-white cursor-pointer has-[:checked]:border-blue-600">
                <input
                  type="radio"
                  name="workType"
                  value="other"
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="block text-sm font-medium text-gray-900">Lainnya</span>
                  <span className="block text-sm text-gray-500 mt-1">Kebutuhan hukum lain yang belum tercantum di atas.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Work Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Detail Pekerjaan</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Judul Pekerjaan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  id="title"
                  required
                  placeholder="Contoh: Pendirian PT Maju Jaya Abadi"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  name="description"
                  id="description"
                  rows={4}
                  placeholder="Jelaskan kebutuhan Anda secara detail..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-3">
            <a
              href="/workspace"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Batal
            </a>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Buat Pekerjaan
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}