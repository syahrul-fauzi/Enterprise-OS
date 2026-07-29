import { Runtime } from "@repo/core-runtime";
import { Workspace } from "@repo/presentation-ui-system";
import { workspace, registry } from "../workspace.manifest";

export default async function Page() {
  const wv = workspace.validate();
  if (!wv.ok) {
    throw new Error(`workspace.manifest.ts invalid: ${wv.error.message}`);
  }

  const runtime = new Runtime({ registry });
  runtime.load(workspace.definition);
  const compose = await runtime.compose();

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-gray-800">
            {workspace.definition.id.charAt(0).toUpperCase() +
              workspace.definition.id.slice(1)}{" "}
            Dashboard
          </h1>
          <p className="text-gray-500 mt-2">
            EOS Alpha M2 · Architecture Stabilized · CapabilityDescriptor as
            single runtime contract · Runtime as sole orchestration layer
          </p>
          <div className="mt-4 text-xs text-gray-400 font-mono space-y-1">
            <div>
              workspace id:{" "}
              <span className="text-gray-700">{workspace.definition.id}</span>{" "}
              · requested:{" "}
              <span className="text-gray-700">{compose.requestedCount}</span> ·
              mounted:{" "}
              <span className="text-gray-700">{compose.resolvedCount}</span>
            </div>
            <div>
              registry:{" "}
              <span className="text-gray-700">{compose.registryKind}</span> ·
              compose ok:{" "}
              <span
                className={
                  compose.ok ? "text-emerald-600" : "text-red-600"
                }
              >
                {String(compose.ok)}
              </span>{" "}
              · errors:{" "}
              <span className="text-gray-700">{compose.errors.length}</span>
            </div>
            <div>
              lifecycle:{" "}
              <span className="text-gray-700">
                defineWorkspace → validate → new Runtime → load → compose →
                Workspace.render
              </span>
            </div>
            <div>
              architecture:{" "}
              <span className="text-gray-700">
                Kernel (Contract: CapabilityDescriptor) → Registry Interface →
                Registry Adapter → Runtime Orchestration → Workspace Renderer
                (pure) → App Host (shell)
              </span>
            </div>
          </div>
        </header>

        <Workspace composeResult={compose} />

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
