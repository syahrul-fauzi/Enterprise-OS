"use client";

import React from "react";
import type { RealityWorkItem } from "../contracts/my-reality.contracts";
import { MyRealityWorkListItem } from "./MyRealityWorkListItem";

interface MyRealityWorkListProps {
  items: RealityWorkItem[];
  title?: string;
  maxItems?: number;
  onWorkClick?: (workId: string) => void;
}

/**
 * MyRealityWorkList - Comprehensive work list for all priority buckets
 * Location: experience/my-reality/components/MyRealityWorkList.tsx
 * Reuses MyRealityWorkListItem for consistent rendering across all sections
 * Maintains platform-as-context rule: platform details are secondary to work
 */
export function MyRealityWorkList({
  items,
  title = "Semua Pekerjaan Anda",
  maxItems,
  onWorkClick,
}: MyRealityWorkListProps) {
  // Limit items and filter out any null/undefined work objects
  const displayItems = maxItems 
    ? items.filter(Boolean).slice(0, maxItems) 
    : items.filter(Boolean);

  if (displayItems.length === 0) {
    return (
      <div className="bg-surface-sunken rounded-xl p-8 border border-surface-border text-center">
        <p className="text-text-secondary italic">Tidak ada pekerjaan untuk ditampilkan.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-text-primary border-b border-surface-border pb-3">
        {title}
        <span className="ml-2 text-sm font-normal text-text-muted">
          ({displayItems.length} total)
        </span>
      </h2>
      <div className="space-y-3">
        {displayItems.map((work) => (
          <div 
            key={work.workId} 
            onClick={() => onWorkClick?.(work.workId)}
            className="cursor-pointer"
          >
            <MyRealityWorkListItem
              work={work}
              onNextActionExecute={() => {}}
            />
          </div>
        ))}
      </div>
    </div>
  );
}