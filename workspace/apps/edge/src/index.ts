/**
 * EOS Edge Runtime Entrypoint
 * Execution surface untuk Work Continuity di perangkat lokal
 * AUDIT-005 compliant: hanya execution surface, tidak merubah semantic authority
 */
import { capabilityRegistry } from "../../packages/core/kernel/src/registry/capability-command-registry";
// Import evidence-registry commands secara synchronous di top-level (fix race condition di test)
import { evidenceRegistryCommands } from '../../../capabilities/evidence-registry/implementation/commands/evidence-registry.commands';
import { continue_work, type WorkHandoffEnvelope } from "../../packages/core/runtime/src/work-continuity";
import { WebSocketAdapter } from "./websocket-adapter.service";

// Register evidence-registry commands IMMEDIATELY untuk test environment (tidak menunggu initialize())
if (typeof process !== 'undefined' && (process.env.NODE_ENV === 'test' || process.env.STANDALONE === 'true')) {
  console.log("[EdgeRuntime] Test/standalone environment detected - registering evidence registry commands");
  Object.values(evidenceRegistryCommands).forEach(command => {
    capabilityRegistry.register(command as any);
    console.log(`[EdgeRuntime] ✅ Registered command: ${command.capability}.${command.name}`);
  });
  console.log("[EdgeRuntime] ✅ All evidence registry commands registered successfully");
  // Log semua command yang terdaftar untuk debug Gate A
  console.log("[EdgeRuntime] 📋 All registered commands:", capabilityRegistry.listCommandKeys());
}

// EdgeRuntime class - sederhana sesuai kebutuhan EDGE-002/REAL-001
export class EdgeRuntime {
  private actorId: string = "edge-runtime";
  private activeWorks: Map<string, any> = new Map();
  private pendingSyncQueue: string[] = [];
  public initialized: boolean = false;

  constructor() {
    console.log("[EdgeRuntime] 🚀 EOS Edge Runtime initialized");
    console.log("[EdgeRuntime] 📋 Actor ID registered:", this.actorId);
    this.initialize();
  }

  // Inisialisasi event listener untuk online/offline sync otomatis (REAL-001 requirement)
  private initialize(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncPendingWork());
      console.log("[EdgeRuntime] 🌐 Online event listener registered for automatic sync");
    }
    this.initialized = true;
    console.log("[EdgeRuntime] ✅ EdgeRuntime fully initialized");
  }

  // Sinkronkan semua work yang tertunda ketika koneksi kembali (REAL-001 offline-to-online)
  private async syncPendingWork(): Promise<void> {
    if (this.pendingSyncQueue.length === 0) {
      console.log("[EdgeRuntime] ℹ️ No pending work to sync");
      return;
    }

    console.log(`[EdgeRuntime] 🔄 Attempting to sync ${this.pendingSyncQueue.length} pending works...`);
    const toProcess = [...this.pendingSyncQueue];
    this.pendingSyncQueue = [];

    for (const workId of toProcess) {
      const work = this.activeWorks.get(workId);
      if (work) {
        try {
          await this.syncWork(workId, work.sourceActorId, work.tenantId, work.executionId);
        } catch (error) {
          console.error(`[EdgeRuntime] ❌ Failed to sync pending work ${workId}:`, error);
          this.pendingSyncQueue.push(workId); // Kembalikan ke antrian jika gagal
        }
      }
    }
  }

  // Sinkronkan Work dari core ke edge - implementasi work.sync
  async syncWork(workId: string, sourceActorId: string, tenantId: string, sessionId: string): Promise<boolean> {
    const executionId = `edge-execution-${Date.now()}`;
    
    console.log(`[EdgeRuntime] 🔄 Attempting to sync work ${workId} from source actor ${sourceActorId}`);
    
    try {
      // Panggil sync capability dari work-core - hanya memakai existing capability, tidak membuat semantic baru
      const syncResult = await capabilityRegistry.invoke(
                "work-core",
                "sync",
                {
                  workId,
                  sourceActorId,
                  targetActorId: this.actorId,
                  tenantId,
                  sessionId,
                  executionId,
                  statePath: `./.eos-state/execution/edge-work-${workId}.json`,
                  metadata: {
                    runtime: "edge",
                    deviceType: "desktop",
                    offlineSupport: true
                  },
                  actor_id: this.actorId,
                  decision_id: "REAL-001"
                }
              );

      if ((syncResult as any).success) {
        // Lanjutkan Work di edge runtime
        const continued = continue_work(workId);
        if (continued) {
          this.activeWorks.set(workId, {
            syncedAt: new Date().toISOString(),
            sourceActorId,
            executionId,
            tenantId
          });
          
          console.log(`[EdgeRuntime] ✅ Work ${workId} successfully synced and resumed on edge`);
          console.log(`[EdgeRuntime] 📊 Active works on edge: ${this.activeWorks.size}`);
          return true;
        }
      }
      
      console.error(`[EdgeRuntime] ❌ Failed to continue work ${workId} after sync`);
      return false;
    } catch (error) {
      // Jika gagal sync (misal offline), tambahkan ke antrian untuk sync nanti
      this.pendingSyncQueue.push(workId);
      console.error(`[EdgeRuntime] ❌ Sync failed for work ${workId} - added to pending queue:`, error);
      return false;
    }
  }

  // Dapatkan daftar Work yang aktif di edge
  getActiveWorks(): string[] {
    return Array.from(this.activeWorks.keys());
  }

  // Dapatkan daftar Work yang menunggu sync
  getPendingSyncWorks(): string[] {
    return [...this.pendingSyncQueue];
  }

  // Shutdown runtime
  shutdown(): void {
    console.log(`[EdgeRuntime] 🛑 Shutting down EOS Edge Runtime, ${this.activeWorks.size} active works preserved, ${this.pendingSyncQueue.length} pending works queued`);
    this.activeWorks.clear();
    this.pendingSyncQueue = [];
  }
}

// Export untuk digunakan oleh aplikasi lain
export const edgeRuntime = new EdgeRuntime();
console.log("[EdgeRuntime] 🎯 EdgeRuntime instance created and exported");

// Inisialisasi WebSocketAdapter untuk Phase 3 WSS pipeline (EDGE-DEVICE-001)
export const websocketAdapter = new WebSocketAdapter(edgeRuntime);
console.log("[WebSocketAdapter] 🎯 WebSocketAdapter instance initialized and linked to EdgeRuntime");

// Auto-connect jika environment variable WSS_URL diset (Node.js environment)
if (typeof process !== 'undefined' && process.env?.WSS_URL) {
  websocketAdapter.connect(process.env.WSS_URL).then(success => {
    if (success) console.log("[WebSocketAdapter] ✅ Auto-connected to WSS server:", process.env.WSS_URL);
  });
}