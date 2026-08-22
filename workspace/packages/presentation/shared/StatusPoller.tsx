"use client";

import { useEffect, useState, useCallback } from 'react';

interface StatusPollerProps {
  readonly executionId: string;
  readonly pollInterval?: number;
  readonly onStatusChange?: (status: string) => void;
  readonly children?: (status: string) => React.ReactNode;
}

export function StatusPoller({
  executionId,
  pollInterval = 2000,
  onStatusChange,
  children
}: StatusPollerProps) {
  const [status, setStatus] = useState<string>('loading');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/status/${executionId}`);
      if (!res.ok) throw new Error('Failed to fetch status');
      
      const data = await res.json();
      const newStatus = data.status;
      
      if (newStatus !== status) {
        setStatus(newStatus);
        setLastUpdated(new Date().toISOString());
        onStatusChange?.(newStatus);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [executionId, status, onStatusChange]);

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up polling interval
    const interval = setInterval(fetchStatus, pollInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, pollInterval]);

  // SSE fallback for browsers that support it
  useEffect(() => {
    if (typeof EventSource === 'undefined') return;

    const eventSource = new EventSource(`/api/status/sse/${executionId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setStatus(data.status);
      setLastUpdated(new Date().toISOString());
      onStatusChange?.(data.status);
    };

    eventSource.onerror = () => {
      // Fallback to polling if SSE fails
      eventSource.close();
    };

    return () => eventSource.close();
  }, [executionId, onStatusChange]);

  if (children) return <>{children(status)}</>;

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium">
      <span 
        className={`w-2 h-2 rounded-full ${
          status === 'completed' ? 'bg-emerald-500' :
          status === 'failed' ? 'bg-red-500' :
          'bg-amber-500 animate-pulse'
        }`}
      />
      <span className="capitalize">{status}</span>
      {error && <span className="text-red-500 text-xs">{error}</span>}
    </div>
  );
}

export default StatusPoller;