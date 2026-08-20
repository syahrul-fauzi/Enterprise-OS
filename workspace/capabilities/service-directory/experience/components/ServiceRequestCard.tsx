import React from "react";
import { Card } from "@repo/presentation-ui-system";
import type { ServiceRequestAggregate } from "../../implementation/contracts.js";

export interface ServiceRequestCardProps {
  readonly item: ServiceRequestAggregate;
}

const STATUS_LABEL: Record<ServiceRequestAggregate["status"], string> = {
  draft: "Draft",
  accepted: "Accepted",
  in_service: "In Service",
  delivered: "Delivered",
  verified: "Verified",
};

const CATEGORY_LABEL: Record<ServiceRequestAggregate["category"], string> = {
  "Cloud Services": "Cloud Services",
  "IT Support": "IT Support",
  "Infrastructure": "Infrastructure",
  "Cybersecurity": "Cybersecurity",
  "Software Development": "Software Development",
  "Managed Services": "Managed Services",
  "Data & Analytics": "Data & Analytics",
};

// P0-PROFESSIONAL-FIX: External system labels for World Truth status tracking
const EXTERNAL_SYSTEM_LABEL: Record<string, string> = {
  oss: "OSS",
  kemenkumham: "Kemenkumham",
  djp: "DJP",
};

export function ServiceRequestCard({ item }: ServiceRequestCardProps) {
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
        {item.budget && (
          <p className="text-sm font-medium text-emerald-700">
            Budget: {item.budget}
          </p>
        )}
        {/* P0-PROFESSIONAL-FIX: Display external system status for World Truth tracking */}
        {item.externalResponses && item.externalResponses.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">External System Status</p>
            <div className="flex flex-wrap gap-1">
              {item.externalResponses.map((resp, idx) => (
                <span 
                  key={idx} 
                  className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {EXTERNAL_SYSTEM_LABEL[resp.system] || resp.system}: {resp.status}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* P0-PROFESSIONAL-FIX: Display actorId audit trail for professional accountability */}
        {item.actorId && (
          <div className="pt-1 border-t">
            <p className="text-[10px] font-mono opacity-60">Last updated by: {item.actorId}</p>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium">
            <span>{STATUS_LABEL[item.status]}</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border">
              {CATEGORY_LABEL[item.category]}
            </span>
            {item.providerId !== undefined && (
              <span className="text-[10px] font-mono normal-case tracking-normal opacity-70">
                Provider: {item.providerId}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono opacity-60">{item.id}</span>
        </div>
      </div>
    </Card>
  );
}

export default ServiceRequestCard;