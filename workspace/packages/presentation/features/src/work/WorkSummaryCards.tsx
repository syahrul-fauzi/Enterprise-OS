"use client";

import React from 'react';
import { Card } from '@repo/presentation-ui-system';

interface IconProps {
  className?: string;
  ariaHidden?: boolean;
}

export interface WorkSummaryCardsProps {
  total: number;
  inProgress: number;
  bottlenecked: number;
  completed: number;
  aiProcessing?: number;
  aiFailed?: number;
  avgResponseTimeHours?: number;
  deltas?: Partial<Record<'total' | 'inProgress' | 'bottlenecked' | 'completed' | 'aiProcessing' | 'aiFailed' | 'responseTime', { value: number; positive: boolean; label?: string }>>;
  onMetricClick?: (metric: 'total' | 'inProgress' | 'bottlenecked' | 'completed' | 'aiTasks') => void;
  workspaceId?: string;
  compact?: boolean;
}

type StatusIntent = 'neutral' | 'warning' | 'danger' | 'success' | 'info';

interface SummaryItem {
  id: 'total' | 'inProgress' | 'bottlenecked' | 'completed' | 'aiTasks';
  label: string;
  value: number | string;
  description: string;
  intent: StatusIntent;
  suffix?: string;
  delta?: { value: number | string; positive: boolean; label?: string };
  Icon: React.ComponentType<IconProps>;
  weight: 'primary' | 'emphasis' | 'default' | 'muted';
  onClick?: () => void;
}

const IconTotal = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 6.75h13.5m-13.5 5.25h13.5m-13.5 5.25h13.5" />
  </svg>
);

const IconProgress = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconBottleneck = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.376L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const IconBottleneckClear = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconCheck = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const IconTrendUp = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
  </svg>
);

const IconTrendDown = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" />
  </svg>
);

const IconAI = ({ className, ariaHidden = true }: IconProps) => (
  <svg className={className} aria-hidden={ariaHidden} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 11.25l.5-.5m-.5 3.5l.5-.5m-3.5-3.5l.5-.5m0 6.5l.5-.5m6-5.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
  </svg>
);

const intentIconWrap: Record<StatusIntent, string> = {
  neutral: 'bg-surface-sunken text-text-secondary',
  warning: 'bg-status-warning/10 text-status-warning',
  danger: 'bg-status-danger/10 text-status-danger',
  success: 'bg-status-success/10 text-status-success',
  info: 'bg-status-info/10 text-status-info',
};

const intentValueColor: Record<StatusIntent, string> = {
  neutral: 'text-text-primary',
  warning: 'text-text-primary',
  danger: 'text-status-danger',
  success: 'text-status-success',
  info: 'text-status-info',
};

const weightCardStyles: Record<SummaryItem['weight'], { container: string; iconSize: string; valueSize: string; labelSize: string; desc: string }> = {
  primary: {
    container: 'border-surface-border-strong shadow-token-md',
    iconSize: 'w-8 h-8',
    valueSize: 'text-xl sm:text-2xl',
    labelSize: 'text-xs font-semibold',
    desc: 'text-[11px]',
  },
  emphasis: {
    container: 'border-surface-border shadow-token-sm',
    iconSize: 'w-7 h-7',
    valueSize: 'text-lg sm:text-xl',
    labelSize: 'text-xs font-medium',
    desc: 'text-[11px]',
  },
  default: {
    container: 'border-surface-border',
    iconSize: 'w-6 h-6',
    valueSize: 'text-base sm:text-lg',
    labelSize: 'text-[11px] font-medium',
    desc: 'text-[11px]',
  },
  muted: {
    container: 'border-surface-border/70 bg-surface-sunken/40',
    iconSize: 'w-5 h-5',
    valueSize: 'text-sm sm:text-base',
    labelSize: 'text-[11px]',
    desc: 'text-[11px]',
  },
};

function deriveIntentAndWeight(
  id: 'total' | 'inProgress' | 'bottlenecked' | 'completed' | 'aiTasks',
  value: number
): { intent: StatusIntent; weight: SummaryItem['weight'] } {
  switch (id) {
    case 'total':
      return { intent: 'neutral', weight: value > 0 ? 'default' : 'muted' };
    case 'inProgress':
      if (value === 0) return { intent: 'neutral', weight: 'muted' };
      if (value >= 5) return { intent: 'warning', weight: 'primary' };
      return { intent: 'info', weight: 'emphasis' };
    case 'bottlenecked':
      if (value === 0) return { intent: 'success', weight: 'muted' };
      if (value >= 2) return { intent: 'danger', weight: 'primary' };
      return { intent: 'danger', weight: 'emphasis' };
    case 'completed':
      if (value === 0) return { intent: 'neutral', weight: 'muted' };
      return { intent: 'success', weight: 'default' };
    case 'aiTasks':
      // AI tasks use same logic as bottlenecked - failed tasks show danger
      if (value === 0) return { intent: 'success', weight: 'muted' };
      if (value >= 2) return { intent: 'danger', weight: 'primary' };
      return { intent: 'danger', weight: 'emphasis' };
    default:
      return { intent: 'neutral', weight: 'muted' };
  }
}

export function WorkSummaryCards({
  total,
  inProgress,
  bottlenecked,
  completed,
  aiProcessing: propsAiProcessing = 0,
  aiFailed: propsAiFailed = 0,
  deltas,
  onMetricClick,
  workspaceId,
  compact = false,
}: WorkSummaryCardsProps) {
  // Extract AI metrics from props or deltas (for Fase 1 dashboard)
  const aiProcessing = (propsAiProcessing ?? (deltas as any)?.aiProcessing?.value) ?? 0;
  const aiCompleted = (deltas as any)?.aiCompleted?.value ?? 0;
  const aiFailed = (propsAiFailed ?? (deltas as any)?.aiFailed?.value) ?? 0;
  
  // Handle AI metric click - navigasi ke halaman AI tasks dengan workspaceId
  const handleAIMetricClick = () => {
    if (onMetricClick) {
      onMetricClick('aiTasks');
    } else if (workspaceId) {
      window.location.href = `/ai-tasks?workspaceId=${encodeURIComponent(workspaceId)}`;
    } else {
      window.location.href = "/ai-tasks";
    }
  };
  
  const rawItems: Array<Omit<SummaryItem, 'intent' | 'weight'>> = [
    {
      id: 'inProgress',
      label: 'Pekerjaan Aktif',
      value: inProgress,
      description: inProgress === 0
        ? 'Tidak ada pekerjaan berjalan'
        : deltas?.inProgress?.label ?? `${inProgress} sedang dikerjakan`,
      delta: deltas?.inProgress ? { value: deltas.inProgress.value, positive: deltas.inProgress.positive, label: deltas.inProgress.label } : undefined,
      Icon: IconProgress,
    },
    {
      id: 'bottlenecked',
      label: bottlenecked === 0 ? 'Semua Lancar' : 'Perlu Perhatian',
      value: bottlenecked,
      description: bottlenecked > 0 ? 'Membutuhkan tindakan segera' : 'Tidak ada hambatan terdeteksi',
      Icon: bottlenecked === 0 ? IconBottleneckClear : IconBottleneck,
    },
    {
      id: 'total',
      label: 'Menunggu',
      value: total - inProgress - bottlenecked - completed,
      description: 'Pekerjaan yang siap dimulai',
      delta: deltas?.total ? { value: deltas.total.value, positive: deltas.total.positive, label: deltas.total.label } : undefined,
      Icon: IconTotal,
    },
    {
      id: 'completed',
      label: 'Selesai',
      value: completed,
      description: completed === 0
        ? 'Belum ada penyelesaian'
        : deltas?.completed?.label ?? `Berhasil diselesaikan`,
      delta: deltas?.completed ? { value: deltas.completed.value, positive: deltas.completed.positive, label: deltas.completed.label } : undefined,
      Icon: IconCheck,
    },
    // Fase 1: AI Agent-specific cards jika ada AI tasks
    ...(aiProcessing > 0 ? [{
      id: 'aiTasks' as const,
      label: 'AI Sedang Proses',
      value: aiProcessing,
      description: aiProcessing === 0 ? 'Tidak ada AI yang aktif' : `${aiProcessing} AI agent sedang bekerja`,
      Icon: IconAI,
      onClick: handleAIMetricClick,
    }] : []),
    ...(aiFailed > 0 ? [{
      id: 'aiTasks' as const,
      label: 'AI Gagal',
      value: aiFailed,
      description: `${aiFailed} AI task membutuhkan review segera`,
      Icon: IconBottleneck,
      onClick: handleAIMetricClick,
    }] : []),
  ];

  const summaryItems: SummaryItem[] = rawItems.map((item) => {
    const numericValue = typeof item.value === 'number' ? item.value : 0;
    const derived = deriveIntentAndWeight(item.id, numericValue);
    return { ...item, intent: derived.intent, weight: derived.weight };
  });

  const primaryOrder: Array<SummaryItem['weight']> = ['primary', 'emphasis', 'default', 'muted'];
  const orderedItems = [...summaryItems].sort(
    (a, b) => primaryOrder.indexOf(a.weight) - primaryOrder.indexOf(b.weight)
  );

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 w-full max-w-none"
      role="list"
      aria-label="Ringkasan status pekerjaan: Aktif, Perlu Perhatian, Menunggu, Selesai"
    >
      {orderedItems.map((item) => {
        const { Icon } = item;
        const styles = weightCardStyles[item.weight];
        const itemHasCustomClick = !!item.onClick;
        const isClickable = onMetricClick !== undefined || itemHasCustomClick;
        const numericValue = typeof item.value === 'number' ? item.value : 0;

        return (
          <div key={item.id} role="listitem" className="min-w-0">
            <Card
              size="sm"
              hoverable={isClickable}
              onClick={itemHasCustomClick ? item.onClick : (onMetricClick ? () => onMetricClick(item.id) : undefined)}
              className={[
                'h-full transition-all duration-eos-fast',
                compact ? '!px-3 !py-2.5 sm:!px-3.5 sm:!py-3' : '',
                styles.container,
                item.weight === 'primary' && numericValue > 0 ? 'ring-1 ring-offset-1 ring-offset-surface' : '',
                item.id === 'bottlenecked' && numericValue > 0 ? 'ring-status-danger/30' : '',
                item.id === 'inProgress' && numericValue >= 5 ? 'ring-status-warning/30' : '',
              ].join(' ')}
              aria-label={`${item.label}: ${item.value}. ${item.description}`}
            >
              <div className="flex items-start gap-2 sm:gap-2.5">
                <div
                  className={[
                    'rounded-md flex items-center justify-center shrink-0 mt-0.5',
                    item.weight === 'primary' ? 'w-8 h-8 sm:w-9 sm:h-9' : '',
                    item.weight === 'emphasis' ? 'w-7 h-7 sm:w-8 sm:h-8' : '',
                    item.weight === 'default' ? 'w-6 h-6 sm:w-7 sm:h-7' : '',
                    item.weight === 'muted' ? 'w-5 h-5 sm:w-6 sm:h-6' : '',
                    intentIconWrap[item.intent],
                  ].join(' ')}
                >
                  <Icon className={styles.iconSize} ariaHidden={true} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <p className={[
                    'text-text-muted truncate',
                    compact ? 'text-[10px] sm:text-[11px]' : styles.labelSize,
                  ].join(' ')}>
                    {item.label}
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-1 flex-wrap">
                    <p
                      className={[
                        'font-bold tracking-tight tabular-nums leading-none',
                        compact ? 'text-base sm:text-lg' : styles.valueSize,
                        intentValueColor[item.intent],
                      ].join(' ')}
                      aria-label={`${item.value}`}
                    >
                      {item.value}
                      {item.suffix && (
                        <span className="text-xs font-semibold text-text-muted ml-0.5">{item.suffix}</span>
                      )}
                    </p>
                    {item.delta && (
                      <div
                        className={[
                          'inline-flex items-center gap-0.5 font-semibold rounded',
                          compact ? 'text-[9px] px-1 py-px' : 'text-[10px] px-1.5 py-0.5',
                          item.delta.positive
                            ? 'bg-status-success/10 text-status-success'
                            : 'bg-status-danger/10 text-status-danger',
                        ].join(' ')}
                        aria-label={`Perubahan ${item.delta.positive ? 'naik' : 'turun'} ${item.delta.value}`}
                      >
                        {item.delta.positive
                          ? <IconTrendUp className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ariaHidden={true} />
                          : <IconTrendDown className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ariaHidden={true} />
                        }
                        <span>{item.delta.positive ? '+' : ''}{item.delta.value}</span>
                      </div>
                    )}
                  </div>
                  <p className={[
                    'mt-1 text-text-muted line-clamp-1 leading-snug',
                    compact ? 'text-[10px] sm:text-[11px] opacity-90' : 'text-[11px]',
                  ].join(' ')}>
                    {item.description}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}