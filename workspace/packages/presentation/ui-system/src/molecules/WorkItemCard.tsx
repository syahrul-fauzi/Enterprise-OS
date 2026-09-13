"use client";

import React from 'react';
import Link from 'next/link';
import { Card } from '../atoms/card';

export interface WorkItemCardProps {
  workId: string;
  title: string;
  status: string;
  participantCount: number;
  lastActivity: string;
}

export function WorkItemCard({ workId, title, status, participantCount, lastActivity }: WorkItemCardProps) {
  return (
    <Link href={`/work/${workId}`} className="no-underline">
      <Card className="hover:bg-surface-hover transition-colors">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-lg text-text-primary">{title}</h3>
          <span className="text-sm font-medium bg-surface-subtle text-text-secondary px-2 py-1 rounded-md">{status}</span>
        </div>
        <div className="mt-4 flex justify-between items-center text-sm text-text-muted">
          <span>{participantCount} partisipan</span>
          <span>Aktivitas terakhir: {lastActivity}</span>
        </div>
      </Card>
    </Link>
  );
}