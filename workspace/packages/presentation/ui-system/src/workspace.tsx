import React from "react";
import type { RuntimeMountResult } from "@repo/core-runtime";

export interface WorkspaceProps {
  readonly mountResult: RuntimeMountResult;
}

export function Workspace({ mountResult }: WorkspaceProps) {
  return (
    <div className="space-y-6">
      {mountResult.errors.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-red-800 text-sm">
            Runtime Mount Errors
          </h3>
          {mountResult.errors.map((e, i) => (
            <div key={i} className="text-sm text-red-700">
              <span className="font-mono">[{e.capabilityId}]</span>{" "}
              {e.error.message}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {mountResult.mounted.map(({ capabilityId, Component, status, graphNodeId }) => (
          <section key={capabilityId} className="space-y-2">
            <header className="flex items-baseline justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {capabilityId}
                </h2>
                {status && (
                  <div className="text-xs text-gray-500 font-mono">
                    status={String(status)}
                    {graphNodeId ? ` · graphNodeId=${String(graphNodeId)}` : ""}
                  </div>
                )}
              </div>
            </header>
            <Component />
          </section>
        ))}
      </div>
    </div>
  );
}
