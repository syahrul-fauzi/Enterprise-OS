
"use client";

import React from 'react';
import Link from 'next/link';
import { Card, Button } from '@repo/presentation-ui-system';
import { useRouter } from 'next/navigation';

export interface WorkItemCardProps {
  workId: string;
  tags: { label: string; color: string }[];
  title: string;
  intent: string;
  reality: string;
  nextStep: string;
  status: string; // <-- SLICE-001-W05: ADDED
  currentUserRoles: string[]; // <-- SLICE-001-W05: ADDED
}

export function WorkItemCard({ workId, tags, title, intent, reality, nextStep, status, currentUserRoles }: WorkItemCardProps) {
  const router = useRouter();

  // SLICE-001-W05: Logic to determine if the Approve button should be shown
  const canApprove = status === 'review-initiated' && currentUserRoles.includes('executive-authority');
  
  // SLICE-002-W04: Logic to determine if the Archive button should be shown
  const canArchive = status !== 'archived' && (currentUserRoles.includes('work-owner') || currentUserRoles.includes('requirement-manager'));

  const handleApprove = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling

    try {
      const response = await fetch('/api/requirements/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workId: workId,
          nextStatus: 'authorized-for-execution',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve the work item.');
      }

      alert('Work item approved successfully!');
      router.refresh(); // Refresh the page to show the updated status
    } catch (error) {
      console.error('Approval Error:', error);
      alert('An error occurred during approval.');
    }
  };

  // SLICE-002-W04: Handler for archive action
  const handleArchive = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Stop event bubbling

    if (!confirm('Apakah Anda yakin ingin mengarsipkan work item ini?')) {
      return;
    }

    try {
        const response = await fetch('/api/requirements/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workId: workId,
          nextStatus: 'archived',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive the work item.');
      }

      alert('Work item berhasil diarsipkan!');
      router.refresh(); // Refresh the page to show the updated status
    } catch (error) {
      console.error('Archive Error:', error);
      alert('Terjadi kesalahan saat mengarsipkan work item.');
    }
  };

  return (
    <Link href={`/work/${workId}`} className="no-underline text-current block">
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
        {/* Conditional action buttons container (Approve + Archive) */}
        {(canApprove || canArchive) && (
          <div className="mt-4 pt-4 border-t border-border-default flex justify-end gap-3">
            {canApprove && (
              <Button variant="primary" onClick={handleApprove}>
                Approve
              </Button>
            )}
            {canArchive && (
              <Button variant="secondary" onClick={handleArchive}>
                Arsipkan
              </Button>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}