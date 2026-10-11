
import type {
  ContainerTrackingData,
  ProvisionContainerInput,
} from '../contracts/tracking.contracts';

// In-memory store for demonstration purposes.
const store: Record<string, ContainerTrackingData> = {};

export class ContainerTrackingRepositoryInMemory {
  async save(data: ContainerTrackingData): Promise<void> {
    store[data.work_id] = data;
  }

  async findByWorkId(work_id: string): Promise<ContainerTrackingData | null> {
    const data = store[work_id];
    return data ? data : null;
  }

  async findByContainerId(container_id: string): Promise<ContainerTrackingData | null> {
    const entry = Object.values(store).find(
      (data) => data.container_id === container_id
    );
    return entry || null;
  }

  // Helper to clear the store for tests
  async _clear(): Promise<void> {
    for (const key in store) {
      delete store[key];
    }
  }
}

// Export a singleton instance
export const containerTrackingRepository = new ContainerTrackingRepositoryInMemory();