"use client";

import React, { useState, useMemo } from 'react';
import { WorkItemCard, WorkItemCardProps } from './WorkItemCard';
import { Card, Button } from "@repo/presentation-ui-system";

export interface PriorityWorkListProps {
  now: WorkItemCardProps[];
  next: WorkItemCardProps[];
  watching: WorkItemCardProps[];
  onViewAll?: () => void;
}

type TabId = 'now' | 'next' | 'watching';

export function PriorityWorkList({ now = [], next = [], watching = [], onViewAll }: PriorityWorkListProps) {
  const workItems: Record<TabId, WorkItemCardProps[]> = {
    now,
    next,
    watching,
  };

  const tabs: readonly { id: TabId; label: string; count: number }[] = [
    { id: 'now', label: 'NOW', count: now.length },
    { id: 'next', label: 'NEXT', count: next.length },
    { id: 'watching', label: 'WATCHING', count: watching.length },
  ] as const;

  const firstTabWithItems = useMemo(
    () => tabs.find(tab => tab.count > 0)?.id ?? 'now',
    [tabs]
  );

  const [currentTab, setCurrentTab] = useState<TabId>(firstTabWithItems);

  const handleTabClick = (tabId: TabId) => {
    if (workItems[tabId].length > 0) {
      setCurrentTab(tabId);
    }
  };

  return (
    <Card
      title="Prioritas Anda Hari Ini"
      size="md"
      headerActions={
        onViewAll ? (
          <Button
            intent="primary"
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            rightIcon={
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h10m0 0l-3-3m3 3l-3 3" />
              </svg>
            }
          >
            Lihat Semua
          </Button>
        ) : undefined
      }
    >
      <div className="flex space-x-2 mb-5 overflow-x-auto pb-1" role="tablist" aria-label="Prioritas pekerjaan">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            disabled={tab.count === 0}
            role="tab"
            aria-selected={currentTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            className={`shrink-0 px-3.5 py-2 text-sm font-semibold rounded-sm transition-all duration-eos-fast ease-eos-standard
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2
              ${
                currentTab === tab.id
                  ? 'bg-brand-primary text-text-inverse shadow-token-sm'
                  : 'bg-surface-sunken text-text-secondary hover:bg-surface-border/60 hover:text-text-primary'
              } ${tab.count === 0 ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
          >
            {tab.label}{' '}
            <span
              className={`ml-1.5 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-bold ${
                currentTab === tab.id
                  ? 'bg-surface/20 text-text-inverse'
                  : 'bg-surface text-text-secondary'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${currentTab}`}
        aria-labelledby={`tab-${currentTab}`}
      >
        {workItems[currentTab].length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-surface-sunken mb-3" aria-hidden="true">
              <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text-secondary">Tidak ada pekerjaan di tab ini</p>
            <p className="text-xs text-text-muted mt-1">Pilih tab lain atau buat pekerjaan baru</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-divider -mx-2">
            {workItems[currentTab].map((item) => (
              <WorkItemCard key={item.id} {...item} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}