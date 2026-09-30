import type { CognitiveAdapter, CognitiveCapability } from "../contracts/reasoning.contracts.js";

// In-memory repository untuk menyimpan registered cognitive adapters
// Sesuai pola yang digunakan di agent-orchestration + Cognitive Adapter ontology
export const ReasoningContractRepositoryInMemory = {
  adapters: new Map<string, CognitiveAdapter>(),

  register(adapter: CognitiveAdapter): void {
    this.adapters.set(adapter.adapterId, adapter);
    console.log(`[ReasoningRepository] Registered cognitive adapter: ${adapter.adapterName} (${adapter.adapterId})`);
  },

  unregister(adapterId: string): boolean {
    return this.adapters.delete(adapterId);
  },

  get(adapterId: string): CognitiveAdapter | undefined {
    return this.adapters.get(adapterId);
  },

  list(): readonly CognitiveAdapter[] {
    return Array.from(this.adapters.values());
  },

  findByCapability(capability: CognitiveCapability): CognitiveAdapter | undefined {
    return Array.from(this.adapters.values()).find(adapter => 
      adapter.supportedCapabilities.includes(capability) && adapter.currentState === "DORMANT"
    );
  }
};