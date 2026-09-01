"use client";

import React from 'react';
import { Card, Button } from '@repo/presentation-ui-system';

const RobotIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </svg>
);

const BottleneckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const DeadlineIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IssueIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
  </svg>
);

interface Insight {
  icon: React.ReactNode;
  intent: 'danger' | 'warning' | 'info';
  text: string;
  details: string;
}

const insights: Insight[] = [
  {
    icon: <BottleneckIcon />,
    intent: 'danger',
    text: '3 bottleneck memerlukan perhatian segera',
    details: 'Zendesk ticket menunggu paling lama (6h)',
  },
  {
    icon: <DeadlineIcon />,
    intent: 'warning',
    text: '1 PR review mendekati deadline',
    details: 'PR #127 sudah 30h menunggu review',
  },
  {
    icon: <IssueIcon />,
    intent: 'warning',
    text: 'Shopee order bermasalah',
    details: '1 pesanan terlambat dikirim',
  },
];

const intentIconWrap: Record<Insight['intent'], string> = {
  danger: 'bg-status-danger/10 text-status-danger-fg',
  warning: 'bg-status-warning/10 text-status-warning-fg',
  info: 'bg-status-info/10 text-status-info-fg',
};

export function EOSCompanionCard() {
  return (
    <Card
      size="md"
      title="EOS Companion"
      subtitle="Orrioq"
      headerActions={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-success-fg bg-status-success/10 border border-status-success/20 px-2.5 py-1 rounded-full">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-status-success-fg animate-pulse" aria-hidden="true" />
          Aktif
        </span>
      }
      footer={
        <Button intent="primary" variant="soft" block size="sm">
          Lihat Insight Lengkap
        </Button>
      }
    >
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center flex-shrink-0" aria-hidden="true">
          <RobotIcon />
        </div>
        <p className="text-sm text-text-secondary leading-relaxed">
          Saya memantau 12 pekerjaan Anda di 3 platform. Berikut ringkasan kondisi saat ini.
        </p>
      </div>

      <ul className="space-y-3" role="list" aria-label="Insight companion">
        {insights.map((insight, index) => (
          <li key={index} className="flex items-start gap-3 p-3 rounded-lg bg-surface-sunken hover:bg-surface-elevated transition-colors">
            <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${intentIconWrap[insight.intent]}`} aria-hidden="true">
              {insight.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-text-primary text-sm leading-snug">{insight.text}</p>
              <p className="text-xs text-text-muted mt-1">{insight.details}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
