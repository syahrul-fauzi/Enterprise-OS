"use client";

import React, { useState, useEffect } from "react";
import ReleaseReadinessWorkspace from "@capabilities/requirement-management/experience/workspaces/ReleaseReadinessWorkspace";
import ReleaseReadinessChat from "@capabilities/requirement-management/experience/workspaces/ReleaseReadinessChat";

type Surface = "workspace" | "chat" | "split";

export default function ReleaseReadinessPage({
  searchParams,
}: {
  readonly searchParams: Promise<{
    readonly surface?: string;
    readonly releaseId?: string;
  }>;
}) {
  const [surface, setSurface] = useState<Surface>("split");
  const [initialReleaseId, setInitialReleaseId] = useState<string>("EOS-003");

  useEffect(() => {
    searchParams.then((params) => {
      if (params.surface === "workspace" || params.surface === "chat" || params.surface === "split") {
        setSurface(params.surface);
      }
      if (params.releaseId) {
        setInitialReleaseId(params.releaseId);
      }
    });
  }, [searchParams]);

  const changeSurface = (next: Surface) => {
    setSurface(next);
    const url = new URL(window.location.href);
    url.searchParams.set("surface", next);
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar — Architecture Proof */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
              E
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                EOS Vertical Slice V1 — Governed Release Readiness
              </div>
              <div className="text-xs text-gray-500">
                One Procedure · Two Surfaces · Same Execution Path · Shared Evidence
              </div>
            </div>
          </div>

          {/* Surface Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => changeSurface("workspace")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                surface === "workspace"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              📂 Workspace
            </button>
            <button
              onClick={() => changeSurface("chat")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                surface === "chat"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              💬 Chat
            </button>
            <button
              onClick={() => changeSurface("split")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                surface === "split"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              ⚖️ Both
            </button>
          </div>
        </div>

        {/* Architecture legend */}
        <div className="mx-auto max-w-7xl px-6 pb-3">
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-2 text-xs text-blue-800 flex items-center gap-3 flex-wrap">
            <span className="font-semibold">Architecture:</span>
            <code className="bg-white border border-blue-200 rounded px-1.5 py-0.5 font-mono">
              Workspace → /api/procedure/prepare-release
            </code>
            <span>↔</span>
            <code className="bg-white border border-blue-200 rounded px-1.5 py-0.5 font-mono">
              Chat → /api/chat/prepare-release → prepareReleaseProcedure()
            </code>
            <span>→</span>
            <span className="font-semibold">
              same procedure (shared), same 3 capabilities (Requirement + RTM + Evidence)
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={`mx-auto ${
          surface === "split" ? "max-w-[1600px]" : "max-w-5xl"
        } px-4 py-8`}
      >
        {surface === "workspace" && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <ReleaseReadinessWorkspace defaultReleaseId={initialReleaseId} />
          </div>
        )}

        {surface === "chat" && (
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            <ReleaseReadinessChat />
          </div>
        )}

        {surface === "split" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm h-[calc(100vh-10rem)] min-h-[700px] flex flex-col">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">📂 Workspace Surface</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    via /api/procedure/prepare-release
                  </span>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500" title="Live" />
              </div>
              <div className="flex-1 overflow-auto">
                <ReleaseReadinessWorkspace defaultReleaseId={initialReleaseId} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm h-[calc(100vh-10rem)] min-h-[700px] flex flex-col">
              <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700">💬 Chat Surface</span>
                  <span className="text-[10px] text-gray-500 font-mono">
                    via /api/chat/prepare-release → same procedure
                  </span>
                </div>
                <div className="h-2 w-2 rounded-full bg-green-500" title="Live" />
              </div>
              <div className="flex-1 overflow-auto">
                <ReleaseReadinessChat />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}