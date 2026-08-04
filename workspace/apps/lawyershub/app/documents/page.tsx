import React from "react";
import Link from "next/link";
import DocumentView from "../../../../capabilities/legal-document/experience/views/DocumentView";

export default function DocumentsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              LawyersHub Product Surface
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Legal Documents</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Reuses the canonical legal-document experience surface for direct
                document operations in LawyersHub.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 hover:bg-gray-100"
              href="/"
            >
              Open Workspace
            </Link>
            <Link
              className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500"
              href="/platform"
            >
              Platform Console
            </Link>
          </div>
        </header>

        <DocumentView />
      </div>
    </main>
  );
}
