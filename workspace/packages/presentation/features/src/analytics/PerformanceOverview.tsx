"use client";

import React, { useState } from 'react';
import { Card, Button } from '@repo/presentation-ui-system';

const overviewData = {
  '7D': {
    responseTime: { value: '4.2h', change: '23%', trend: 'down' as const, positiveInterpretation: true },
    workCompletion: { value: '83%', change: '12%', trend: 'up' as const, positiveInterpretation: true },
    bottleneckResolved: { value: '7', change: '75%', trend: 'up' as const, positiveInterpretation: true },
  },
  '30D': {
    responseTime: { value: '4.8h', change: '15%', trend: 'down' as const, positiveInterpretation: true },
    workCompletion: { value: '81%', change: '8%', trend: 'up' as const, positiveInterpretation: true },
    bottleneckResolved: { value: '25', change: '60%', trend: 'up' as const, positiveInterpretation: true },
  },
  '90D': {
    responseTime: { value: '5.1h', change: '10%', trend: 'down' as const, positiveInterpretation: true },
    workCompletion: { value: '79%', change: '5%', trend: 'up' as const, positiveInterpretation: true },
    bottleneckResolved: { value: '78', change: '55%', trend: 'up' as const, positiveInterpretation: true },
  },
} as const;

type Period = '7D' | '30D' | '90D';
type MetricKey = keyof typeof overviewData['7D'];

const TrendIcon = ({ trend, positive }: { trend: 'up' | 'down'; positive: boolean }) => {
  const color = positive ? 'text-status-success-fg' : 'text-status-danger-fg';
  return trend === 'up' ? (
    <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  ) : (
    <svg className={`w-4 h-4 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  );
};

const metricLabels: Record<MetricKey, string> = {
  responseTime: 'Response Time',
  workCompletion: 'Work Completion',
  bottleneckResolved: 'Bottleneck Resolved',
};

function MiniSparkline() {
  return (
    <div className="h-16 mt-4 bg-surface-sunken rounded-md flex items-end gap-0.5 p-2" role="img" aria-label="Grafik tren mini 7 titik data">
      {[0.3, 0.5, 0.4, 0.7, 0.55, 0.8, 0.65].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-brand-primary/40 hover:bg-brand-primary/70 transition-colors"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}

export function PerformanceOverview() {
  const [period, setPeriod] = useState<Period>('7D');
  const data = overviewData[period];
  const periods: Period[] = ['7D', '30D', '90D'];

  return (
    <Card
      size="md"
      title="Performance Overview"
      headerActions={
        <div
          role="tablist"
          aria-label="Periode overview performa"
          className="flex items-center gap-1 bg-surface-sunken p-1 rounded-lg border border-surface-border"
        >
          {periods.map((p) => {
            const isSelected = period === p;
            return (
              <Button
                key={p}
                size="xs"
                variant={isSelected ? 'solid' : 'ghost'}
                intent={isSelected ? 'primary' : 'neutral'}
                onClick={() => setPeriod(p)}
                role="tab"
                aria-selected={isSelected}
                aria-controls={`panel-${p}`}
                id={`tab-${p}`}
                className="min-w-[3rem]"
              >
                {p}
              </Button>
            );
          })}
        </div>
      }
    >
      <div
        role="tabpanel"
        id={`panel-${period}`}
        aria-labelledby={`tab-${period}`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(data) as MetricKey[]).map((key) => {
            const metric = data[key];
            const metricCardId = `metric-${period}-${key}`;
            return (
              <div
                key={key}
                id={metricCardId}
                className="p-4 rounded-lg bg-surface-sunken border border-surface-border hover:border-brand-primary/20 transition-colors"
                role="group"
                aria-labelledby={`${metricCardId}-label`}
              >
                <p id={`${metricCardId}-label`} className="text-sm text-text-muted mb-2 font-medium">
                  {metricLabels[key]}
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold text-text-primary tracking-tight">{metric.value}</p>
                  <div className="flex items-center gap-1">
                    <TrendIcon trend={metric.trend} positive={metric.positiveInterpretation} />
                    <span className={`text-sm font-semibold ${metric.positiveInterpretation ? 'text-status-success-fg' : 'text-status-danger-fg'}`}>
                      {metric.change}
                    </span>
                  </div>
                </div>
                <MiniSparkline />
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
