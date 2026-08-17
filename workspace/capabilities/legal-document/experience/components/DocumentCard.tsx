import React from "react";
import { Card } from "@repo/presentation-ui-system";
import {
  type DocumentAggregate,
  type DocumentStatus,
} from "../../implementation/contracts/index.js";

const STATUS_LABEL: Record<DocumentStatus, { readonly label: string; readonly style: string }> = {
  draft: { label: "Draft", style: "bg-gray-100 text-gray-700 border-gray-300" },
  review: {
    label: "In Review",
    style: "bg-amber-50 text-amber-800 border-amber-300",
  },
  signed: {
    label: "Signed",
    style: "bg-emerald-50 text-emerald-800 border-emerald-300",
  },
  archived: {
    label: "Archived",
    style: "bg-slate-100 text-slate-600 border-slate-300",
  },
};

export interface DocumentCardProps {
  readonly item: DocumentAggregate;
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DocumentCard({ item }: DocumentCardProps) {
  const status = STATUS_LABEL[item.status];
  return (
    <Card
      title={
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-800 leading-snug">
            {item.title}
          </h3>
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
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span className="font-mono">{item.id}</span>
          <span>
            {item.author ? `by ${item.author} · ` : ""}
            {formatDate(item.createdAt)}
          </span>
        </div>
        {item.matterId !== undefined && (
          <div className="text-[10px] font-mono text-gray-400">
            matter: {item.matterId}
          </div>
        )}
      </div>
    </Card>
  );
}

export default DocumentCard;
