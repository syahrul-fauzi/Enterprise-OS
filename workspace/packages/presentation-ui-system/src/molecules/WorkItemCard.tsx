"use client";

import Link from "next/link";
import { Card } from "../atoms";
import { ChevronRight } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  "draft": "Draf",
  "open": "Terbuka",
  "in_progress": "Sedang Diproses",
  "closed": "Selesai",
  "completed": "Selesai",
  "blocked": "Tertunda"
};

const STATUS_COLORS: Record<string, string> = {
  "draft": "bg-gray-100 text-gray-800 border-gray-300",
  "open": "bg-blue-100 text-blue-800 border-blue-300",
  "in_progress": "bg-amber-100 text-amber-800 border-amber-300",
  "closed": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "completed": "bg-emerald-100 text-emerald-800 border-emerald-300",
  "blocked": "bg-red-100 text-red-800 border-red-300"
};

import type { WorkListItem } from "@repo/presentation-experience/my-reality";

interface WorkItemCardProps {
  work: WorkListItem;
}

export function WorkItemCard({ work }: WorkItemCardProps) {
  return (
    <Link
      key={work.id}
      href={`/work/${work.id}`}
      className="block transition-transform hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-status-info focus:ring-offset-2 rounded-xl"
      aria-label={`Lihat detail pekerjaan: ${work.title}`}
    >
      <Card
        size="lg"
        hoverable
        className="transition-all shadow-sm hover:shadow-md"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-xl font-semibold text-text-primary truncate">{work.title}</h3>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold border ${STATUS_COLORS[work.status] || "bg-surface-muted text-text-secondary border-surface-muted"}`}>
                {STATUS_LABELS[work.status] || work.status}
              </span>
            </div>
            {work.description && (
              <p className="mt-3 text-base text-text-secondary line-clamp-2 leading-relaxed">{work.description}</p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-text-muted">
              <span className="flex items-center gap-1.5">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Dibuat: {new Date(work.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {work.lawyerId && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Advokat: {work.lawyerId}
                </span>
              )}
              {Array.isArray(work.evidence) && work.evidence.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Dokumen: {work.evidence.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 self-center">
            <ChevronRight className="h-6 w-6 text-text-muted" />
          </div>
        </div>
      </Card>
    </Link>
  );
}