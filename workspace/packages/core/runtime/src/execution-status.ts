// FIX-UI-001: Minimal execution status tracking for real-time UI updates
import Redis from 'ioredis';
import type { ObservedExecution } from "./execution-observability.js";

// Redis client initialization - single instance per application
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true
});

export interface ExecutionStatus {
  executionId: string;
  current: "loading" | "running" | "completed" | "failed";
  updatedAt: string;
  transitions: Array<{
    status: string;
    timestamp: string;
    actor?: string;
  }>;
  lastObserved?: ObservedExecution;
}

// Redis key prefix for execution statuses
const REDIS_KEY_PREFIX = 'eos:execution:';

// Get Redis key for specific execution
const getRedisKey = (executionId: string) => `${REDIS_KEY_PREFIX}${executionId}`;

export const ExecutionStatusRepository = {
  async create(executionId: string, actor?: string): Promise<ExecutionStatus> {
    const initialStatus: ExecutionStatus = {
      executionId,
      current: "loading",
      updatedAt: new Date().toISOString(),
      transitions: [{
        status: "loading",
        timestamp: new Date().toISOString(),
        actor
      }]
    };
    
    await redis.set(getRedisKey(executionId), JSON.stringify(initialStatus));
    return initialStatus;
  },

  async getStatus(executionId: string): Promise<ExecutionStatus | undefined> {
    const data = await redis.get(getRedisKey(executionId));
    if (!data) return undefined;
    return JSON.parse(data) as ExecutionStatus;
  },

  async updateStatus(
    executionId: string, 
    newStatus: ExecutionStatus["current"], 
    actor?: string
  ): Promise<ExecutionStatus | undefined> {
    const existing = await this.getStatus(executionId);
    if (!existing) return undefined;

    const updated: ExecutionStatus = {
      ...existing,
      current: newStatus,
      updatedAt: new Date().toISOString(),
      transitions: [
        ...existing.transitions,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          actor
        }
      ]
    };

    await redis.set(getRedisKey(executionId), JSON.stringify(updated));
    return updated;
  },

  async linkObservedExecution(
    executionId: string,
    observed: ObservedExecution
  ): Promise<ExecutionStatus | undefined> {
    const existing = await this.getStatus(executionId);
    if (!existing) return undefined;

    // Auto-derive status from observed execution
    let derivedStatus: ExecutionStatus["current"] = observed.success ? "completed" : "failed";
    
    const updated: ExecutionStatus = {
      ...existing,
      current: derivedStatus,
      updatedAt: observed.timestamp_utc,
      lastObserved: observed,
      transitions: [
        ...existing.transitions,
        {
          status: derivedStatus,
          timestamp: observed.timestamp_utc,
          actor: observed.logicalWorkId
        }
      ]
    };

    await redis.set(getRedisKey(executionId), JSON.stringify(updated));
    return updated;
  }
};

// Export types for external usage via index.ts only