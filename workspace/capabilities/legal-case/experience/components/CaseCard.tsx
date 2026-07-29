import React from "react";
import { Card } from "@repo/presentation-ui-system";
import type { CaseAggregate } from "../../implementation/contracts";

export interface CaseCardProps {
  readonly item: CaseAggregate;
}

const STATUS_LABEL: Record<CaseAggregate["status"], string> = {
  draft: "Draft",
  open: "Open",
  in_progress: "In Progress",
  closed: "Closed",
};

const PRIORITY_LABEL: Record<CaseAggregate["priority"], string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function CaseCard({ item }: CaseCardProps) {
  return (
    <Card
      title={
        <h3 className="font-semibold leading-tight" style={{ color: "inherit" }}>
          {item.title}
        </h3>
      }
    >
      <div className="space-y-3">
        {item.description && (
          <p className="text-sm leading-relaxed">{item.description}</p>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium">
            <span>{STATUS_LABEL[item.status]}</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border">
              {PRIORITY_LABEL[item.priority]}
            </span>
            {item.lawyerId !== undefined && (
              <span className="text-[10px] font-mono normal-case tracking-normal opacity-70">
                Assigned: {item.lawyerId}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono opacity-60">{item.id}</span>
        </div>
      </div>
    </Card>
  );
}

export default CaseCard;
