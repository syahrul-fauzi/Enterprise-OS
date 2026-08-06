"use client";

import React, { useState } from "react";
import type {
  PrepareReleaseOutput,
  PrepareReleaseReadinessStatus,
} from "@procedures/prepare-release";

interface ReleaseReadinessWorkspaceProps {
  readonly defaultReleaseId?: string;
}

const PROCEDURE_API_PATH = "/api/procedure/prepare-release";

function getReadinessColor(status: PrepareReleaseReadinessStatus | boolean | string) {
  if (status === "ready" || status === "passed" || status === true) {
    return "text-green-700 bg-green-50";
  }
  if (status === "pending_ai_investigation" || status === "requires_human") {
    return "text-amber-700 bg-amber-50 border-amber-200";
  }
  if (status === "blocked" || status === "failed" || status === false) {
    return "text-red-700 bg-red-50 border-red-200";
  }
  return "text-yellow-700 bg-yellow-50";
}

function getReadinessCardClass(status: PrepareReleaseReadinessStatus) {
  switch (status) {
    case "ready":
      return "bg-green-50 border-green-200";
    case "blocked":
      return "bg-red-50 border-red-200";
    case "pending_ai_investigation":
      return "bg-amber-50 border-amber-200";
    default:
      return "bg-gray-50 border-gray-200";
  }
}

function getStepIcon(status: string, index: number) {
  if (status === "passed") return "✓";
  if (status === "failed") return "✗";
  if (status === "requires_human") return "⏸";
  return String(index + 1);
}

function getStepBadgeClass(status: string) {
  if (status === "passed") return "bg-green-100 text-green-700";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "requires_human") return "bg-amber-100 text-amber-700";
  return "bg-gray-100 text-gray-700";
}

export function ReleaseReadinessWorkspace({
  defaultReleaseId = "EOS-003",
}: ReleaseReadinessWorkspaceProps) {
  const [releaseId, setReleaseId] = useState(defaultReleaseId);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<PrepareReleaseOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runPrepareRelease = async () => {
    setIsRunning(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(PROCEDURE_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, limit: 100 }),
      });

      const data = (await response.json()) as PrepareReleaseOutput | { error: string; detail?: string };

      if (!response.ok || "error" in data) {
        const detail = "detail" in data ? data.detail : undefined;
        throw new Error(detail ?? ("error" in data ? String(data.error) : "Procedure request failed"));
      }

      setResult(data as PrepareReleaseOutput);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run prepare_release procedure");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Release Readiness Workspace</h1>
          <p className="text-gray-600">
            Governed Release Readiness — the prepare_release procedure evaluates operational readiness
            using real capabilities: Requirement Traceability, RTM, and Evidence Registry.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Execution entry point: <code className="bg-gray-100 px-1 rounded">{PROCEDURE_API_PATH}</code>
            {" "}— shared with Chat surface.
          </p>
        </div>

        {/* Release Input */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label htmlFor="releaseId" className="block text-sm font-medium text-gray-700 mb-1">
                Release ID
              </label>
              <input
                type="text"
                id="releaseId"
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter release ID (e.g., EOS-003)"
              />
            </div>
            <div className="pt-6">
              <button
                onClick={runPrepareRelease}
                disabled={isRunning || !releaseId}
                className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isRunning ? "Running..." : "Prepare Release"}
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Main Status Card */}
            <div className={`rounded-lg shadow p-6 mb-6 border ${getReadinessCardClass(result.readiness.status)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Release {result.releaseId}</h2>
                  <p className="text-gray-600">
                    Procedure: prepare_release · Executed via shared API
                  </p>
                  {result.generatedAt && (
                    <p className="text-xs text-gray-500 mt-1">Generated at: {new Date(result.generatedAt).toLocaleString()}</p>
                  )}
                </div>
                <div
                  className={`px-4 py-2 rounded-full font-bold text-lg ${getReadinessColor(result.readiness.status)}`}
                >
                  {result.readiness.status.replace(/_/g, " ").toUpperCase()}
                </div>
              </div>
            </div>

            {/* AI Investigation Banner */}
            {result.ai.invoked && (
              <div className="rounded-lg shadow p-4 mb-6 border border-amber-200 bg-amber-50">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🤖</span>
                  <div>
                    <h3 className="font-semibold text-amber-800">
                      AI Investigation Triggered — Dynamic SOP branched to intelligence path
                    </h3>
                    <p className="text-sm text-amber-700 mt-1">
                      Plan: <code className="bg-amber-100 px-1 rounded">{result.ai.planId ?? "N/A"}</code>
                      {" "}· Status: {result.ai.invocationStatus ?? "N/A"}
                    </p>
                    {result.ai.ambiguousRequirements.length > 0 && (
                      <p className="text-sm text-amber-700 mt-1">
                        Ambiguous requirements ({result.ai.ambiguousRequirements.length}):{" "}
                        {result.ai.ambiguousRequirements.join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-amber-600 mt-2">
                      This is the AI-on-demand path. The deterministic happy path does not require LLM;
                      AI is only invoked when verification status is UNKNOWN.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Requirements */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total</span>
                    <span className="font-bold text-xl">{result.requirements.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Verified</span>
                    <span className="font-bold text-xl text-green-600">{result.requirements.verified}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Blocked</span>
                    <span
                      className={`font-bold text-xl ${
                        result.requirements.blocked > 0 ? "text-red-600" : "text-gray-400"
                      }`}
                    >
                      {result.requirements.blocked}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Unknown (AI)</span>
                    <span
                      className={`font-bold text-xl ${
                        result.requirements.unknown > 0 ? "text-amber-600" : "text-gray-400"
                      }`}
                    >
                      {result.requirements.unknown}
                    </span>
                  </div>
                </div>
              </div>

              {/* Traceability */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Traceability</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Complete</span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${getReadinessColor(
                        String(result.traceability.complete),
                      )}`}
                    >
                      {result.traceability.complete ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Gaps</span>
                    <span
                      className={`font-bold text-xl ${
                        result.traceability.gaps > 0 ? "text-yellow-600" : "text-green-600"
                      }`}
                    >
                      {result.traceability.gaps}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Gap Requirements</span>
                    <span className="text-xs text-gray-500 max-w-[60%] text-right truncate" title={result.traceability.gapRequirementIds.join(", ")}>
                      {result.traceability.gapRequirementIds.length > 0
                        ? result.traceability.gapRequirementIds.join(", ")
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Evidence */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Evidence</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Complete</span>
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${getReadinessColor(
                        String(result.evidence.complete),
                      )}`}
                    >
                      {result.evidence.complete ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Records</span>
                    <span className="font-bold text-xl">{result.evidence.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 text-sm">Evidence Paths</span>
                    <span
                      className="text-xs text-gray-500 max-w-[60%] text-right truncate"
                      title={result.evidence.paths.join("\n")}
                    >
                      {result.evidence.paths.length > 0
                        ? `${result.evidence.paths.length} path(s)`
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blockers */}
            {result.blockers.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Blocking Items</h3>
                <ul className="space-y-2">
                  {result.blockers.map((blocker, index) => (
                    <li
                      key={index}
                      className={`flex items-start gap-2 p-3 rounded-md ${
                        blocker.toLowerCase().includes("ai investigation")
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      <span className="mt-0.5">
                        {blocker.toLowerCase().includes("ai investigation") ? "⏸" : "⚠️"}
                      </span>
                      <span>{blocker}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Execution Steps */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Procedure Execution Steps (Dynamic SOP)
              </h3>
              <div className="space-y-3">
                {result.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-md">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${getStepBadgeClass(
                        step.status,
                      )}`}
                    >
                      {getStepIcon(step.status, index)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{step.stepId}</p>
                      <p className="text-sm text-gray-600">{step.summary}</p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getReadinessColor(
                        step.status,
                      )}`}
                    >
                      {step.status.replace(/_/g, " ").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Initial State */}
        {!result && !isRunning && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Governed Release Readiness — EOS Vertical Slice V1
            </h3>
            <p className="text-gray-500 max-w-lg mx-auto">
              Enter a release ID and click <strong>Prepare Release</strong>. The procedure
              prepare_release will orchestrate three real capabilities:
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3 max-w-md mx-auto text-xs text-gray-600">
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                📋 Requirement Management
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                🔗 RTM / Traceability
              </div>
              <div className="bg-gray-50 p-2 rounded border border-gray-200">
                🔍 Evidence Registry
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Same procedure, same execution path, same evidence — accessible from Workspace or Chat.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isRunning && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Running prepare_release Procedure
            </h3>
            <p className="text-gray-500">
              Calling procedure via <code className="bg-gray-100 px-1 rounded">{PROCEDURE_API_PATH}</code>
              … assessing release readiness.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReleaseReadinessWorkspace;
