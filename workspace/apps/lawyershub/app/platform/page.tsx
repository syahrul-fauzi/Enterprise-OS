import React from "react";
import Link from "next/link";
import { apiPlatformService } from "../../../../capabilities/api-platform/implementation/services/api-platform.service";
import { evidenceRegistryService } from "../../../../capabilities/evidence-registry/implementation/services/evidence-registry.service";
import { requirementService } from "../../../../capabilities/requirement-management/implementation/services/requirement.service";
import { requirementsTraceabilityMatrixService } from "../../../../capabilities/requirements-traceability-matrix/implementation/services/traceability.service";
import { workflowEngineService } from "../../../../capabilities/workflow-engine/implementation/services/workflow-engine.service";

function SummaryCard(props: {
  readonly label: string;
  readonly value: string | number;
  readonly detail: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {props.label}
      </div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{props.value}</div>
      <div className="mt-1 text-sm text-gray-500">{props.detail}</div>
    </div>
  );
}

export default function PlatformPage() {
  const descriptor = apiPlatformService.getDescriptor();
  const requirements = requirementService.searchRequirements({ limit: 20, offset: 0 });
  const traceability = requirementsTraceabilityMatrixService.searchTraceabilityMatrix({
    coverage: "all",
  });
  const evidence = evidenceRegistryService.searchEvidenceRegistry({ limit: 12, offset: 0 });
  const workflows = workflowEngineService.listWorkflowDefinitions();

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              EOS-006 Enterprise UI
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Platform Console</h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Production-facing control surface for Requirements, RTM, Evidence
                Registry, Workflow Engine, and the authenticated API Platform.
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
            <a
              className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-500"
              href="/api/platform"
            >
              API Platform
            </a>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Requirements"
            value={requirements.matched}
            detail={`${requirements.items.filter((item) => item.status === "verified").length} verified`}
          />
          <SummaryCard
            label="RTM Rows"
            value={traceability.total}
            detail={`${traceability.summary.completeCount} complete`}
          />
          <SummaryCard
            label="Evidence Records"
            value={evidence.matched}
            detail={`${evidence.summary.kindBreakdown.acceptance} acceptance artifacts`}
          />
          <SummaryCard
            label="Workflows"
            value={workflows.length}
            detail="Deterministic engine definitions"
          />
          <SummaryCard
            label="Platform Endpoints"
            value={descriptor.endpoints.length}
            detail={`Auth via ${descriptor.auth.headerName}`}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">API Platform Surface</h2>
            <p className="mt-1 text-sm text-gray-500">
              Stable gateway endpoints for internal and external consumption.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Method</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Operation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {descriptor.endpoints.map((endpoint) => (
                    <tr key={endpoint.id}>
                      <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                        {endpoint.method}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {endpoint.path}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{endpoint.resource}</td>
                      <td className="px-4 py-3 text-gray-700">{endpoint.operation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Workflow Engine</h2>
            <p className="mt-1 text-sm text-gray-500">
              Canonical workflow definitions ready for orchestration.
            </p>
            <div className="mt-4 space-y-3">
              {workflows.map((workflow) => (
                <div
                  className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                  key={workflow.id}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">{workflow.name}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        {workflow.description}
                      </div>
                    </div>
                    <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-gray-600">
                      {workflow.steps.length} steps
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {workflow.requiredInputs.map((input) => (
                      <span
                        className="rounded-full bg-indigo-50 px-2 py-1 text-xs text-indigo-700"
                        key={input}
                      >
                        {input}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Requirements Snapshot</h2>
            <p className="mt-1 text-sm text-gray-500">
              Current delivery requirements and their verification posture.
            </p>
            <div className="mt-4 space-y-3">
              {requirements.items.map((requirement) => (
                <div
                  className="rounded-lg border border-gray-200 p-4"
                  key={requirement.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900">{requirement.title}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {requirement.id} · {requirement.owner ?? "Unassigned"}
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-700">
                        {requirement.status}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                        {requirement.verificationStatus}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Evidence Inventory</h2>
            <p className="mt-1 text-sm text-gray-500">
              Latest indexed evidence records available through the registry.
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Path</th>
                    <th className="px-4 py-3">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {evidence.items.map((record) => (
                    <tr key={record.id}>
                      <td className="px-4 py-3 text-gray-700">{record.kind}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {record.path}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{record.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
