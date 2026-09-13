"use client";

import React from 'react';
import { WorkItemCard, type WorkItemCardProps } from './WorkItemCard';

export interface WorkListProps {
  workItems: WorkItemCardProps[];
}

export function WorkList({ workItems }: WorkListProps) {
  return (
    <div className="space-y-4">
      {workItems.map((item) => (
        <WorkItemCard key={item.workId} {...item} />
      ))}
    </div>
  );
}