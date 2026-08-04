import React from "react";
import { Card } from "@repo/presentation-ui-system";
import type {
  RequirementAggregate,
  RequirementPriority,
  RequirementStatus,
  RequirementVerificationStatus,
} from "../../implementation/contracts";

const STATUS_LABEL: Record<
  RequirementStatus,
  { readonly label: string; readonly style: string }
> = {
  draft: { label: "Draft", style: "bg-gray-100 text-gray-700 border-gray-300" },
  approved: {
    label: "Approved",
    style: "bg-blue-50 text-blue-700 border-blue-300",
  },
  in_delivery: {
    label: "In Delivery",
    style: "bg-amber-50 text-amber-800 border-amber-300",
  },
  implemented: {
    label: "Implemented",
    style: "bg-indigo-50 text-indigo-700 border-indigo-300",
  },
  verified: {
    label: "Verified",
    style: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
};

const PRIORITY_LABEL: Record<RequirementPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const VERIFICATION_LABEL: Record<RequirementVerificationStatus, string> = {
  not_ready: "Not Ready",
  pending: "Pending",
  passed: "Passed",
  failed: "Failed",
};

export type RequirementAction =
  | "approve"
  | "start_delivery"
  | "mark_implemented"
  | "verify";

export interface RequirementCardProps {
  readonly item: RequirementAggregate;
  readonly onAction?: (id: string, action: RequirementAction) => void | Promise<void>;
  readonly busy?: boolean;
}

export function RequirementCard({
  item,
  onAction,
  busy = false,
}: RequirementCardProps) {
  const status = STATUS_LABEL[item.status];
  const nextAction: RequirementAction | null =
    item.status === "draft"
      ? "approve"
      : item.status === "approved"
        ? "start_delivery"
        : item.status === "in_delivery"
          ? "mark_implemented"
          : item.status === "implemented"
            ? "verify"
            : null;

  const actionLabel =
    nextAction === "approve"
      ? "Approve"
      : nextAction === "start_delivery"
        ? "Start Delivery"
        : nextAction === "mark_implemented"
          ? "Mark Implemented"
          : nextAction === "verify"
            ? "Verify"
            : null;

  return (
    <Card
      title={
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold leading-snug text-slate-900">
              {item.title}
            </h3>
            {item.summary && (
              <p className="mt-1 text-sm text-slate-600">{item.summary}</p>
            )}
          </div>
          <span
            className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border shrink-0 ${status.style}`}
          >
            {status.label}
          </span>
        </div>
      }
    >
      <div className="space-y-3">
        {item.description && (
          <p className="text-sm leading-relaxed text-slate-600">
            {item.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            Priority: {PRIORITY_LABEL[item.priority]}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
            Verification: {VERIFICATION_LABEL[item.verificationStatus]}
          </span>
          {item.owner && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              Owner: {item.owner}
            </span>
          )}
        </div>

        {item.linkedCapabilityIds.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Linked Capabilities
            </div>
            <div className="flex flex-wrap gap-1">
              {item.linkedCapabilityIds.map((capabilityId) => (
                <span
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-mono"
                  key={capabilityId}
                >
                  {capabilityId}
                </span>
              ))}
            </div>
          </div>
        )}

        {item.acceptanceCriteria.length > 0 && (
          <div className="space-y-1">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Acceptance Criteria
            </div>
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
              {item.acceptanceCriteria.map((criterion) => (
                <li key={criterion}>{criterion}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-[10px] font-mono text-slate-400">{item.id}</span>
          {nextAction && onAction ? (
            <button
              className="rounded-xl bg-slate-950 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
              disabled={busy}
              onClick={() => void onAction(item.id, nextAction)}
              type="button"
            >
              {busy ? "Working..." : actionLabel}
            </button>
          ) : (
            <span className="text-[11px] text-slate-400">
              {item.status === "verified" ? "Ready to present" : "No action"}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

export default RequirementCard;
