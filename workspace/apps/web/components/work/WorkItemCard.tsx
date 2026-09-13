
"use client";

import React from 'react';
import Link from 'next/link';
import { Card } from '@repo/presentation-ui-system';

export interface WorkItemCardProps {
  workId: string;
  tags: { label: string; color: string }[];
  title: string;
  intent: string;
  reality: string;
  nextStep: string;
}

export function WorkItemCard({ workId, tags, title, intent, reality, nextStep }: WorkItemCardProps) {
  return (
    <Link href={`/work/${workId}`} className="no-underline text-current">
      <Card className="hover:bg-surface-hover transition-colors p-4">
        <div className="flex justify-between items-start gap-4">
          {/* Left Side */}
          <div className="flex-grow">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-text-muted">{workId}</span>
              {tags.map(tag => (
                <span key={tag.label} className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.color}`}>
                  {tag.label}
                </span>
              ))}
            </div>
            <h3 className="font-bold text-lg text-text-primary mb-1">{title}</h3>
            <p className="text-sm text-text-muted bg-surface-subtle p-2 rounded-md border border-border-default">{intent}</p>
          </div>

          {/* Right Side */}
          <div className="flex-shrink-0 w-1/3 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-orange-500">■</span>
              <div>
                <p className="font-semibold text-text-secondary">Reality</p>
                <p className="text-text-muted">{reality}</p>
              </div>
            </div>
            <div className="flex items-start gap-2 mt-2">
              <span className="text-green-500">▶</span>
              <div>
                <p className="font-semibold text-text-secondary">Next</p>
                <p className="text-text-muted">{nextStep}</p>
              </div>
            </div>
          </div>

        </div>
      </Card>
    </Link>
  );
}