import type { WorkId, ActorId } from "@capabilities/work-core/contracts/work.contracts";
import { ExecutionProvider, ProviderSelectionMetadata } from "../types.js";
import fetch from 'node-fetch';

// Type definition untuk response API Ruflo (tidak mengubah core Ruflo, hanya mendeklarasikan tipe yang dibutuhkan adapter)
interface RufloExecutedTask {
  taskId: string;
  agentId: string;
  status: "SUCCEEDED" | "FAILED" | "PARTIAL";
  executionTimeMs: number;
}

interface RufloSwarmResponse {
  success: boolean;
  executionId: string;
  executedTasks: RufloExecutedTask[];
  swarmMetrics: {
    agentsUsed: number;
    totalExecutionTimeMs: number;
    tasksCompleted: number;
    tasksFailed: number;
  };
  metadata: Record<string, unknown>;
}

/**
 * Ruflo Swarm Execution Adapter - ISOLATED IMPLEMENTATION
 * Mematuhi semua locked boundaries dari mandat evaluasi Ruflo:
 * - Tidak mengubah work-core
 * - Tidak membuat Work primitive baru
 * - Tidak mengganti logicalWorkId
 * - Tidak menjadikan Ruflo canonical authority
 * - Tidak menjalankan ruflo init pada root monorepo
 * - Hanya berjalan sebagai adapter terpisah dari Paperclip
 * 
 * Mengikuti pola Paperclip adapter untuk interoperabilitas yang konsisten:
 * - atomicClaim untuk durable deduplication (restart, multi-instance, race conditions)
 * - Side effect continuity tracking untuk crash recovery
 * - Consistent return contract dengan Paperclip adapter
 * - Integrasi API Ruflo yang terisolasi
 */
export class RufloSwarmAdapter {
  private maxSwarmRetries = 3;
  private backoffMs = 1500; // Lebih lama untuk swarm coordination
  private logs: string[] = [];
  // In-memory cache + atomicClaim untuk deduplikasi lintas instance/restart (sesuai Paperclip pattern)
  activeSwarmExecutions: Map<string, Promise<any>> = new Map();
  crashMidSwarm = false; // Flag untuk simulasi crash recovery test
  private workRepository: any; // Inject work-core repository (tidak membuat dependensi baru)
  private rufloApiBase: string;
  private rufloApiKey: string;

  constructor(
    private context: { actorId: ActorId; workRepository?: any }, 
    workRepositoryOverride?: any,
    rufloApiConfig?: { baseUrl: string; apiKey: string }
  ) {
    this.workRepository = workRepositoryOverride || context.workRepository;
    // Konfigurasi API Ruflo dari environment atau parameter (isolated, tidak hardcode)
    this.rufloApiBase = rufloApiConfig?.baseUrl || process.env.RUFLO_API_BASE || 'http://localhost:3005/api';
    this.rufloApiKey = rufloApiConfig?.apiKey || process.env.RUFLO_API_KEY || 'ruflo-dev-key';
  }

  private log(message: string, workId: WorkId): void {
    this.logs.push(`[${new Date().toISOString()}] [RUFLO] [Work: ${workId}] ${message}`);
  }

  getSwarmLogs(): string[] {
    return [...this.logs];
  }

  /**
   * Internal API request wrapper untuk Ruflo API (sesuai pola staging-gate6-blackbox.ts)
   * Mempertahankan boundary EOS: hanya HTTP request, tidak mengubah core Ruflo
   */
  private async rufloApiRequest<T>(
            endpoint: string,
            options?: {
              method?: 'GET' | 'POST';
              params?: Record<string, unknown>;
              body?: Record<string, unknown>;
            }
          ): Promise<T> {
            const { method = 'GET', params, body } = options || {};
            const url = new URL(`${this.rufloApiBase}/${endpoint}`);
            
            if (params && method === 'GET') {
              Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) {
                  url.searchParams.set(key, String(value));
                }
              });
            }

            const fetchOptions: any = {
              method,
              headers: {
                'x-ruflo-api-key': this.rufloApiKey,
                'Content-Type': 'application/json',
              },
              ...(body ? { body: JSON.stringify(body) } : {}),
            };

            const response = await fetch(url.toString(), fetchOptions);

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`Ruflo API request failed: ${response.status} ${response.statusText}\n${errorText}`);
            }

            return await response.json() as T;
          }

  /**
   * Execute swarm tasks dengan durable deduplication dan side effect tracking
   * Menyelesaikan catatan teknis user tentang atomicClaim untuk kondisi multi-instance/restart/race
   * Integrasi penuh dengan Ruflo API untuk eksekusi swarm yang sebenarnya
   */
  async executeSwarmTasks(input: {
    taskIds: string[];
    compositionId: string;
    workId: WorkId;
    swarmSize: number;
    selectionMetadata: Omit<ProviderSelectionMetadata, "workId">
  }): Promise<{
    success: boolean;
    executionId: string;
    executedSideEffects: string[];
    providerMetadata: ProviderSelectionMetadata;
    deduplicated?: boolean;
    durableDeduplicationApplied?: boolean;
    rufloApiResponse?: any;
  }> {
    // 1. Buat execution key unik untuk deduplikasi
    const executionKey = `${input.compositionId}:${input.workId}`;
    const eventId = `ruflo:execute:${executionKey}`;

    // 2. Fast path: reuse in-memory execution jika sudah ada
    if (this.activeSwarmExecutions.has(executionKey)) {
      this.log(`[DEDUPLICATE.INMEM] Reuse existing swarm execution ${executionKey}`, input.workId);
      return this.activeSwarmExecutions.get(executionKey);
    }

    // 3. Durable deduplication dengan atomicClaim (sesuai Paperclip pattern)
    if (this.workRepository) {
      try {
        await this.workRepository.atomicClaim(
          input.workId,
          this.context.actorId,
          `ruflo:${executionKey}`,
          0,
          ["provider-selected", "composition-executed"], // Hanya boleh claim Work dalam status ini
          eventId,
          false,
          3600000 // Lease 1 jam untuk long-running swarm execution
        );
        this.log(`[DEDUPLICATE.DURABLE] Berhasil claim Work ${input.workId}, memulai swarm execution`, input.workId);
      } catch (err: any) {
        // Jika duplicate_event → deduplikasi berhasil, event sudah pernah diproses
        if (err.message.includes("duplicate_event")) {
          this.log(`[DEDUPLICATE.DURABLE] Deduplikasi aktif untuk ${executionKey}, eventId ${eventId} sudah diproses`, input.workId);
          const activeExecution = this.activeSwarmExecutions.get(executionKey);
          if (activeExecution) return activeExecution;

          // Jika tidak ada di in-memory (restart scenario), ambil status dari work-core
          const currentWork = await this.workRepository.getById(input.workId);
          return {
            success: true,
            executionId: `ruflo:${executionKey}`,
            executedSideEffects: currentWork.metadata?.executedSideEffects || [],
            providerMetadata: {
              ...input.selectionMetadata,
              workId: input.workId
            },
            deduplicated: true,
            durableDeduplicationApplied: true
          };
        }
        throw err; // Error lain (work not found, version mismatch) tetap dilempar
      }
    }

    // 4. Simulasi CRASH jika flag crashMidSwarm aktif (untuk test crash recovery)
    if (this.crashMidSwarm) {
      this.log("[CRASH.SIMULATION] Ruflo swarm crashed mid-execution", input.workId);
      throw new Error("RufloSwarm crashed mid-execution (simulasi untuk test recovery)");
    }

    // 5. Jalankan swarm execution dan simpan ke in-memory cache
    const executionPromise = this.runSwarmExecution(input);
    this.activeSwarmExecutions.set(executionKey, executionPromise);
    return executionPromise;
  }

  /**
   * Internal swarm execution logic - mempertahankan side effect continuity
   * Integrasi penuh dengan Ruflo API /swarm/execute endpoint untuk eksekusi sebenarnya
   */
  private async runSwarmExecution(input: {
    taskIds: string[];
    compositionId: string;
    workId: WorkId;
    swarmSize: number;
    selectionMetadata: Omit<ProviderSelectionMetadata, "workId">
  }): Promise<{
    success: boolean;
    executionId: string;
    executedSideEffects: string[];
    providerMetadata: ProviderSelectionMetadata;
    rufloApiResponse: any;
  }> {
    const executedSideEffects: string[] = [];
    const executionId = `ruflo:${input.compositionId}:${input.workId}:${Date.now()}`;

    try {
      this.log(`Memanggil Ruflo API untuk eksekusi swarm ${input.compositionId} dengan ${input.taskIds.length} task`, input.workId);
      
      // Panggil Ruflo API /swarm/execute (sesuai dokumentasi API Ruflo yang terisolasi)
              const rufloApiResponse = await this.rufloApiRequest<RufloSwarmResponse>('swarm/execute', {
                method: 'POST',
                body: {
                  taskIds: input.taskIds,
                  compositionId: input.compositionId,
                  swarmSize: input.swarmSize,
                  metadata: {
                    eosWorkId: input.workId,
                    eosActorId: this.context.actorId
                  }
                }
              });

              this.log(`Ruflo API response sukses: ${JSON.stringify(rufloApiResponse)}`, input.workId);
              
              // Proses side effects dari response API Ruflo
              if (rufloApiResponse?.executedTasks) {
                for (const task of rufloApiResponse.executedTasks) {
                  const sideEffectId = `ruflo:swarm-agent-${task.agentId}:task-${task.taskId}:executed`;
                  executedSideEffects.push(sideEffectId);
                  this.log(`Task ${task.taskId} selesai oleh agent ${task.agentId}, side effect tercatat: ${sideEffectId}`, input.workId);
                }
              }

      // Simpan executedSideEffects ke Work.metadata untuk recovery (side effect continuity)
      if (this.workRepository) {
        await this.workRepository.updateMetadata(input.workId, {
          executedSideEffects: [
            ...(this.workRepository.getById(input.workId)?.metadata?.executedSideEffects || []),
            ...executedSideEffects
          ]
        });
        this.log(`Side effects disimpan ke work-core untuk Work ${input.workId}`, input.workId);
      }

      this.log(`Semua ${input.taskIds.length} task selesai dieksekusi oleh swarm ${input.swarmSize} agent via Ruflo API`, input.workId);
      return {
        success: true,
        executionId,
        executedSideEffects,
        providerMetadata: {
          ...input.selectionMetadata,
          workId: input.workId
        },
        rufloApiResponse
      };
    } catch (err: any) {
      this.log(`Swarm execution gagal: ${err.message}`, input.workId);
      throw err;
    }
  }
}