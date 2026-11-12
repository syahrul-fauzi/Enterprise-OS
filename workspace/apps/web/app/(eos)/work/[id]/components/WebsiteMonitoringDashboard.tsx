"use client";

import React, { useEffect, useState } from 'react';
import { Card, Badge, Spinner } from '@repo/presentation-ui-system';
import { observabilityService, type ObservabilitySnapshot } from '../../../../../../../capabilities/observability/implementation/services/observability.service';

interface WebsiteMonitoringDashboardProps {
  workId: string;
  tenantId: string;
  packageType: "digital-care" | "managed-digital-operations";
}

export function WebsiteMonitoringDashboard({ workId, tenantId, packageType }: WebsiteMonitoringDashboardProps) {
  const [snapshot, setSnapshot] = useState<ObservabilitySnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [websiteStatus, setWebsiteStatus] = useState<"healthy" | "warning" | "critical">("healthy");

  useEffect(() => {
    // Ambil snapshot observability yang sudah ada (reuse capability)
    const loadObservabilityData = async () => {
      try {
        const data = observabilityService.getSnapshot();
        setSnapshot(data);
        
        // Hitung status website berdasarkan metrics yang ada
        const errorLogs = data.logs.filter(log => log.level === "error");
        if (errorLogs.length > 5) setWebsiteStatus("critical");
        else if (errorLogs.length > 2) setWebsiteStatus("warning");
        else setWebsiteStatus("healthy");
        
        setLoading(false);
      } catch (error) {
        console.error("[WebsiteMonitoringDashboard] Gagal memuat data monitoring:", error);
        setLoading(false);
      }
    };

    loadObservabilityData();
    // Refresh setiap 60 detik (reuse polling logic yang sudah ada)
    const interval = setInterval(loadObservabilityData, 60000);
    return () => clearInterval(interval);
  }, [workId, tenantId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
        <p className="ml-3 text-text-muted">Memuat monitoring website...</p>
      </div>
    );
  }

  const statusConfig = {
    healthy: { label: "Sehat", color: "green" },
    warning: { label: "Peringatan", color: "yellow" },
    critical: { label: "Kritis", color: "red" }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-text-primary">Monitoring Website Anda</h2>
        <Badge variant={statusConfig[websiteStatus].color as any}>
          Status: {statusConfig[websiteStatus].label}
        </Badge>
      </div>

      {/* Grid metrics - reuse observability metrics yang sudah ada */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-muted">Total Logs</h3>
          <p className="text-3xl font-bold text-text-primary mt-2">{snapshot?.logs.length || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-muted">Total Metrics</h3>
          <p className="text-3xl font-bold text-text-primary mt-2">{snapshot?.metrics.length || 0}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-text-muted">Active Traces</h3>
          <p className="text-3xl font-bold text-text-primary mt-2">{snapshot?.traces.length || 0}</p>
        </Card>
      </div>

      {/* Recent Error Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Log Aktivitas Terbaru</h3>
        <div className="space-y-3">
          {snapshot?.logs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 bg-surface-subtle rounded-md">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${log.level === "error" ? "bg-red-100 text-red-800" : log.level === "warning" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}>
                {log.level.toUpperCase()}
              </span>
              <div>
                <p className="text-sm text-text-primary">{log.message}</p>
                <p className="text-xs text-text-muted mt-1">{new Date(log.timestamp).toLocaleString("id-ID")}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Package-specific footer - Digital Care vs MDO */}
      <div className="text-sm text-text-muted text-center p-4 border-t border-border-subtle">
        {packageType === "digital-care" 
          ? "📊 Managed Outcome Loop aktif - Tim operasional EOS memantau website Anda 24/7" 
          : "🚀 Enterprise Monitoring aktif - Tim dedicated Anda memantau infrastruktur digital"}
      </div>
    </div>
  );
}