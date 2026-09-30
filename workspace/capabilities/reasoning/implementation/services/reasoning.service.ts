import { recordRuntimeInvocation } from "@repo/core-runtime";
import { ReasoningContractRepositoryInMemory } from "../repository/reasoning.repository.ts";
import type { 
  CognitiveAdapter, 
  CognitiveCapability, 
  SemanticWorkContext, 
  WorkPlanProposal,
  CognitiveWakeSignal
} from "../contracts/reasoning.contracts.ts";

export class ReasoningService {
  // Repository pattern sesuai dengan agent-orchestration.service.ts
  // Diperbarui: Cognitive Adapter sebagai entitas utama, bukan ReasoningProvider
  readonly repositories = {
    CognitiveAdapter: ReasoningContractRepositoryInMemory,
  } as const;

  /**
   * Daftarkan semua cognitive adapter yang tersedia (SLM/human/planner)
   * Mengikuti pola recordRuntimeInvocation dari agent-orchestration
   * Prinsip: Semua model kognitif adalah ADAPTER, bukan sumber otoritas
   */
  listAdapters(): readonly CognitiveAdapter[] {
    const result = this.repositories.CognitiveAdapter.list();
    
    // Catat invokasi runtime untuk audit (sesuai EOS evidence requirement)
    recordRuntimeInvocation({
      capabilityId: "reasoning",
      operationId: "list-adapters",
      sourceRef: "ReasoningService.listAdapters",
      success: true,
      input: {},
      result: {
        count: result.length,
        adapterIds: result.map(adapter => adapter.adapterId),
      },
    });

    return result;
  }

  /**
   * Cari cognitive adapter yang mendukung capability tertentu
   * Hanya mengembalikan adapter yang aktif dan tersedia (state DORMANT)
   */
  findAdaptersForCapability(capability: CognitiveCapability): readonly CognitiveAdapter[] {
    const result = this.repositories.CognitiveAdapter.findByCapability(capability)
      ? [this.repositories.CognitiveAdapter.findByCapability(capability)!]
      : [];
    
    recordRuntimeInvocation({
      capabilityId: "reasoning",
      operationId: "find-adapters-for-capability",
      sourceRef: "ReasoningService.findAdaptersForCapability",
      success: true,
      input: { capability },
      result: {
        count: result.length,
        adapterIds: result.map(adapter => adapter.adapterId),
      },
    });

    return result;
  }

  /**
   * Eksekusi cognitive capability dengan adapter yang dipilih
   * PENTING: SELALU menghasilkan PROPOSAL, bukan keputusan final
   * Hanya boleh dijalankan SETELAH EOS Policy memberikan ALLOW
   * Mematuhi Cognitive Adapter lifecycle: DORMANT → ACTIVE (wake) → RELEASE
   */
  async executeCognitiveCapability<TInput, TOutput>(
    capability: CognitiveCapability,
    input: TInput,
    context: SemanticWorkContext,
    wakeReason: CognitiveWakeSignal["wakeReason"],
    adapterId?: string
  ): Promise<TOutput> {
    // 1. Pilih adapter: jika adapterId diberikan, gunakan itu; jika tidak, pilih yang pertama tersedia
    let adapter: CognitiveAdapter | undefined;
    
    if (adapterId) {
      adapter = this.repositories.CognitiveAdapter.get(adapterId);
    } else {
      const availableAdapters = this.findAdaptersForCapability(capability);
      adapter = availableAdapters[0];
    }

    if (!adapter) {
      const error = new Error(`[ReasoningService] No available cognitive adapter for capability: ${capability}`);
      
      recordRuntimeInvocation({
        capabilityId: "reasoning",
        operationId: "execute-cognitive-capability",
        sourceRef: "ReasoningService.executeCognitiveCapability",
        success: false,
        input: { capability, contextWorkId: context.workId, wakeReason },
        result: { error: error.message },
        work_id: context.workId,
        tenant_id: context.tenantId,
        actor_id: context.actorId,
        inputRefs: [context.workId]
      });

      throw error;
    }

    // 2. Verifikasi adapter mendukung capability yang diminta
    if (!adapter.supportedCapabilities.includes(capability)) {
      const error = new Error(`[ReasoningService] Adapter ${adapter.adapterName} does not support capability: ${capability}`);
      
      recordRuntimeInvocation({
          capabilityId: "reasoning",
          operationId: "execute-cognitive-capability",
          sourceRef: "ReasoningService.executeCognitiveCapability",
          success: false,
          input: { capability, adapterId: adapter.adapterId, wakeReason },
          result: { error: error.message },
          work_id: context.workId,
          tenant_id: context.tenantId,
          actor_id: context.actorId,
          inputRefs: [context.workId, adapter.adapterId]
        });

      throw error;
    }

    // 3. Cek apakah adapter tersedia (harus dalam state DORMANT)
    const isAvailable = await adapter.isAvailable();
    if (!isAvailable) {
      const error = new Error(`[ReasoningService] Adapter ${adapter.adapterName} is not available`);
      
      recordRuntimeInvocation({
          capabilityId: "reasoning",
          operationId: "execute-cognitive-capability",
          sourceRef: "ReasoningService.executeCognitiveCapability",
          success: false,
          input: { capability, adapterId: adapter.adapterId, wakeReason },
          result: { error: error.message },
          work_id: context.workId,
          tenant_id: context.tenantId,
          actor_id: context.actorId,
          inputRefs: [context.workId, adapter.adapterId]
        });

      throw error;
    }

    try {
      // 4. WAKE adapter: transisi dari DORMANT → ACTIVE (sesuai Cognitive Adapter lifecycle)
      const wakeSignal: CognitiveWakeSignal = {
        signalId: `wake-${Date.now()}`,
        workId: context.workId,
        tenantId: context.tenantId,
        wakeReason: wakeReason,
        timestamp: new Date(),
        maxActiveDurationMs: 300000, // 5 menit maksimal aktif
        constraints: context.constraints
      };
      await adapter.wake(wakeSignal);

      // 5. Eksekusi cognitive capability - HANYA MENGHASILKAN PROPOSAL
      // NEVER menjadi sumber otoritas, hanya mengembalikan usulan yang perlu divalidasi EOS
      const result = await adapter.execute<TInput, TOutput>(capability, input, context);
      
      // 6. RELEASE adapter: transisi dari ACTIVE → RELEASED → DORMANT (selesai digunakan)
      await adapter.release();
      
      recordRuntimeInvocation({
        capabilityId: "reasoning",
        operationId: "execute-cognitive-capability",
        sourceRef: "ReasoningService.executeCognitiveCapability",
        success: true,
        input: { capability, contextWorkId: context.workId, adapterId: adapter.adapterId, wakeReason },
        result: { executed: true, proposalId: (result as WorkPlanProposal).proposalId },
        work_id: context.workId,
        tenant_id: context.tenantId,
        actor_id: context.actorId,
        inputRefs: [context.workId, adapter.adapterId],
        outputRefs: [(result as WorkPlanProposal).proposalId]
      });

      return result;
    } catch (error) {
      // Pastikan adapter selalu di-release meskipun terjadi error
      if (adapter) await adapter.release();
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      recordRuntimeInvocation({
        capabilityId: "reasoning",
        operationId: "execute-cognitive-capability",
        sourceRef: "ReasoningService.executeCognitiveCapability",
        success: false,
        input: { capability, contextWorkId: context.workId, wakeReason, adapterId: adapter?.adapterId },
        result: { error: errorMessage },
        work_id: context.workId,
        tenant_id: context.tenantId,
        actor_id: context.actorId,
        inputRefs: [context.workId]
      });

      throw error;
    }
  }

  /**
   * Khusus untuk work.decompose capability (contoh implementasi spesifik)
   * Memecah Work menjadi task yang lebih kecil - HANYA PROPOSAL
   */
  async decomposeWork(
    context: SemanticWorkContext,
    adapterId?: string
  ): Promise<WorkPlanProposal> {
    return this.executeCognitiveCapability<null, WorkPlanProposal>(
      "work.decompose",
      null,
      context,
      "reasoning_required",
      adapterId
    );
  }
}