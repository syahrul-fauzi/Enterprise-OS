import React from "react";
import { Card } from "@repo/presentation-ui-system";
import { useLocale } from "@repo/presentation-hooks/use-locale/use-locale";
import type { ServiceRequestAggregate, ServiceRequestStatus, ServiceProviderCategory } from "../../implementation/contracts/service.contracts.js";

export interface ServiceRequestCardProps {
  readonly item: ServiceRequestAggregate;
}

// Map internal values to locale-aware translation keys
const statusKeyMap: Record<ServiceRequestStatus, string> = {
  "draft": "services.status.draft",
  "accepted": "services.status.accepted",
  "in_service": "services.status.in_service",
  "delivered": "services.status.delivered",
  "verified": "services.status.verified",
};

const categoryKeyMap: Record<ServiceProviderCategory, string> = {
  "Cloud Services": "services.category.cloud",
  "IT Support": "services.category.it",
  "Infrastructure": "services.category.infrastructure",
  "Cybersecurity": "services.category.cybersecurity",
  "Software Development": "services.category.software",
  "Managed Services": "services.category.managed",
  "Data & Analytics": "services.category.data",
};

export function ServiceRequestCard({ item }: ServiceRequestCardProps) {
  const { t } = useLocale();

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
        <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider font-medium">
            <span>{t(statusKeyMap[item.status])}</span>
            <span className="text-[10px] font-normal px-1.5 py-0.5 rounded border">
              {t(categoryKeyMap[item.category])}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default ServiceRequestCard;