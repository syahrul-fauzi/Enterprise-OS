import { compose } from "@repo/composition";
import type { ExecutionGraphReport } from "@repo/core-capability-registry";
import { Runtime } from "@repo/core-runtime";
import type { CapabilityDescriptor } from "@repo/core-kernel";
import { Workspace } from "@repo/presentation-ui-system";
import type { ComponentType } from "react";
import Link from "next/link";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compositionDescriptor } from "../composition.descriptor";
import { workspace } from "../workspace.binding";
import { registry } from "../workspace.manifest";
const EXECUTION_GRAPH_PATH = resolve(
  process.cwd(),
  "foundation/evidence/verification/execution-graph.json",
);

function resolveCapabilityView(
  descriptor: CapabilityDescriptor | undefined,
): ComponentType<object> | null {
  const presentation = descriptor?.presentation as { readonly view?: unknown } | undefined;
  const experience = descriptor?.experience as { readonly view?: unknown } | undefined;
  const view = presentation?.view ?? experience?.view;
  return typeof view === "function" ? (view as ComponentType<object>) : null;
}

function loadExecutionGraphSnapshot(): ExecutionGraphReport | null {
  if (!existsSync(EXECUTION_GRAPH_PATH)) {
    return null;
  }
  return JSON.parse(readFileSync(EXECUTION_GRAPH_PATH, "utf8")) as ExecutionGraphReport;
}

export default async function Page() {
  const wv = workspace.validate();
  if (!wv.ok) {
    throw new Error(`workspace.manifest.ts invalid: ${wv.error.message}`);
  }

  const rv = registry.validate();
  if (!rv.ok) {
    throw new Error(
      `registry invalid: ${rv.errors.map((entry) => entry.error.message).join("; ")}`,
    );
  }
  const executionGraph = loadExecutionGraphSnapshot();

  const composed = compose({
    ...compositionDescriptor,
    resolver: {
      actor: { roles: ["admin"], permissions: [] },
      features: { flags: {} },
      capabilityEntries: Object.fromEntries(
        registry.list().map((descriptor) => [descriptor.id, { id: descriptor.id, available: true }]),
      ),
      executionGraph: executionGraph ?? undefined,
      requestId: "lawyershub-runtime-root",
    },
  });

  const runtime = new Runtime({
    extractComponent: ({ capabilityId }) =>
      resolveCapabilityView(registry.resolve(capabilityId)),
  });
  runtime.load(composed.resolved);
  const mountResult = await runtime.mount();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {workspace.definition.id.charAt(0).toUpperCase() +
                  workspace.definition.id.slice(1)}{" "}
                Dashboard
              </h1>
              <p className="text-gray-500 mt-2">
                EOS Alpha M2 · Architecture Stabilized · CapabilityDescriptor as
                single runtime contract · Runtime as sole orchestration layer
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                href="/platform"
              >
                Open Platform Console
              </Link>
              <a
                className="rounded-lg border border-indigo-600 bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                href="/api/platform"
              >
                API Platform
              </a>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-400 font-mono space-y-1">
            <div>
              workspace id:{" "}
              <span className="text-gray-700">{workspace.definition.id}</span>{" "}
              · requested:{" "}
              <span className="text-gray-700">
                {workspace.definition.capabilities.length}
              </span>{" "}
              ·
              mounted:{" "}
              <span className="text-gray-700">{mountResult.mountedCount}</span>
            </div>
            <div>
              registry:{" "}
              <span className="text-gray-700">{registry.kind}</span> · compose
              resolved:{" "}
              <span
                className={
                  mountResult.ok ? "text-emerald-600" : "text-red-600"
                }
              >
                {String(mountResult.ok)}
              </span>{" "}
              · errors:{" "}
              <span className="text-gray-700">{mountResult.errors.length}</span>
            </div>
            <div>
              lifecycle:{" "}
              <span className="text-gray-700">
                defineWorkspace {">"} validate {">"} compose {">"} Runtime.load{" "}
                {">"} Runtime.mount {">"} Workspace.render
              </span>
            </div>
            <div>
              architecture:{" "}
              <span className="text-gray-700">
                Kernel (Contract: CapabilityDescriptor) → Registry Interface →
                Registry Adapter → Composition → Runtime Orchestration →
                Workspace Renderer (pure) → App Host (shell)
              </span>
            </div>
          </div>
        </header>

        <Workspace mountResult={mountResult} />

        <footer className="mt-16 pt-8 border-t border-gray-200 text-center">
          <div className="text-[10px] text-gray-400 font-mono leading-relaxed">
            EOS Alpha M2 Boundary Lock ·{" "}
            {"CapabilityDescriptor IS the single runtime ABI"} ·{" "}
            {"App owns composition root (Runtime lifecycle)"} ·{" "}
            {"Workspace component is pure render (no side effects)"} ·{" "}
            tomorrow FilesystemRegistry / GitRegistry / MarketplaceRegistry can
            be swapped in WITHOUT modifying Runtime, Kernel, or Workspace
            renderer
          </div>
        </footer>
      </div>
    </main>
  );
}
