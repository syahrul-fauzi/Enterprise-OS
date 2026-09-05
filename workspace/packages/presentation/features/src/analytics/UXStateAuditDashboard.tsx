"use client";

import React, { useState, useEffect } from 'react';
import { Card, Button } from '@repo/presentation-ui-system';
import { UXStateComplianceRegistry } from "@repo/presentation-hooks";

// Type imports from compliance registry
interface ComplianceRecord {
  timestamp: string;
  pagePath: string;
  status: string;
  violationType?: string;
  violationDetails?: string;
}

const overviewData = {
  '7D': {
    complianceRate: { value: '100%', change: '0%', trend: 'up' as const, positiveInterpretation: true },
    registeredPages: { value: '19', change: '2', trend: 'up' as const, positiveInterpretation: true },
    violationCount: { value: '0', change: '0', trend: 'down' as const, positiveInterpretation: true },
  },
  '30D': {
    complianceRate: { value: '99.4%', change: '0.6%', trend: 'up' as const, positiveInterpretation: true },
    registeredPages: { value: '27', change: '8', trend: 'up' as const, positiveInterpretation: true },
    violationCount: { value: '1', change: '1', trend: 'down' as const, positiveInterpretation: true },
  },
  '90D': {
    complianceRate: { value: '98.2%', change: '1.8%', trend: 'up' as const, positiveInterpretation: true },
    registeredPages: { value: '42', change: '23', trend: 'up' as const, positiveInterpretation: true },
    violationCount: { value: '3', change: '3', trend: 'down' as const, positiveInterpretation: true },
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
  complianceRate: 'UX Compliance Rate',
  registeredPages: 'Registered Pages',
  violationCount: 'Invariant Violations',
};

function MiniSparkline() {
  return (
    <div className="h-16 mt-4 bg-surface-sunken rounded-md flex items-end gap-0.5 p-2" role="img" aria-label="Mini compliance trend chart">
      {[0.98, 0.985, 0.99, 0.99, 0.992, 0.994, 1.0].map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-brand-primary/40 hover:bg-brand-primary/70 transition-colors"
          style={{ height: `${h * 100}%` }}
        />
      ))}
    </div>
  );
}

function ViolationsList({ violations }: { violations: ComplianceRecord[] }) {
  if (violations.length === 0) {
    return (
      <div className="mt-6 p-4 rounded-lg bg-status-success/10 border border-status-success/20">
        <p className="text-sm text-status-success-fg font-medium">✅ No active invariant violations detected</p>
        <p className="text-xs text-text-muted mt-1">All pages maintain 100% compliance with UX state standards</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      <h3 className="text-sm font-semibold text-text-primary">Recent Violations</h3>
      {violations.slice(0, 5).map((violation, i) => (
        <div key={i} className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-status-danger-fg">{violation.violationType}</p>
              <p className="text-xs text-text-muted mt-1">{violation.pagePath} • {new Date(violation.timestamp).toLocaleString()}</p>
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">{violation.violationDetails}</p>
        </div>
      ))}
    </div>
  );
}

function RegisteredPagesList({ pages }: { pages: string[] }) {
  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Registered Pages ({pages.length})</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {pages.map((page, i) => (
          <div key={i} className="p-2 rounded bg-surface-sunken border border-surface-border text-xs text-text-secondary">
            {page}
          </div>
        ))}
      </div>
    </div>
  );
}

export function UXStateAuditDashboard() {
  const [period, setPeriod] = useState<Period>('7D');
  const [liveMetrics, setLiveMetrics] = useState({
    complianceRate: 100,
    registeredPages: 0,
    violationCount: 0,
    violations: [] as ComplianceRecord[],
    registeredPagesList: [] as string[],
  });
  const data = overviewData[period];
  const periods: Period[] = ['7D', '30D', '90D'];

  // Refresh live metrics from compliance registry every 5 seconds
  useEffect(() => {
    const refreshMetrics = () => {
      const complianceRate = UXStateComplianceRegistry.getComplianceRate();
      const violationCount = UXStateComplianceRegistry.getViolationCount();
      const registeredPagesList = UXStateComplianceRegistry.getRegisteredPages();
      const allRecords = UXStateComplianceRegistry.getRecords();
      const violations = allRecords.filter(r => r.status === "violation");

      setLiveMetrics({
        complianceRate,
        registeredPages: registeredPagesList.length,
        violationCount,
        violations,
        registeredPagesList,
      });
    };

    refreshMetrics();
    const interval = setInterval(refreshMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card
      size="lg"
      title="UX State Audit Dashboard"
      headerActions={
        <div
          role="tablist"
          aria-label="Compliance overview period"
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
        {/* Live metrics header */}
        <div className="mb-4 p-3 rounded-lg bg-status-info/10 border border-status-info/20">
          <p className="text-sm text-status-info-fg font-medium">
            📊 Live Metrics: {liveMetrics.registeredPages} pages registered • {liveMetrics.violationCount} violations • {liveMetrics.complianceRate.toFixed(1)}% compliance
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(Object.keys(data) as MetricKey[]).map((key) => {
            const metric = data[key];
            const metricCardId = `metric-${period}-${key}`;
            // Override with live values for 7D period
            const liveValue = key === 'complianceRate' ? `${liveMetrics.complianceRate.toFixed(1)}%` 
              : key === 'registeredPages' ? `${liveMetrics.registeredPages}`
              : `${liveMetrics.violationCount}`;
            
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
                  <p className="text-2xl font-bold text-text-primary tracking-tight">{liveValue}</p>
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

        {/* Violation list */}
        <ViolationsList violations={liveMetrics.violations} />
        
        {/* Registered pages list */}
        <RegisteredPagesList pages={liveMetrics.registeredPagesList} />
      </div>
    </Card>
  );
}