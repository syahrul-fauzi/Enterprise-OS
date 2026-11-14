// @ts-nocheck
import type { WorkSemanticContract } from "../../../capabilities/work-core/contracts/work.contracts";
import { ExecutionProvider } from "./types";

/**
 * Formal kebijakan seleksi execution provider untuk Agentic Work
 * Sesuai ADAPT architecture: pilih provider terbaik berdasarkan karakteristik Work
 * Semua rule dapat di-audit, diuji, dan diperbarui tanpa mengubah core service
 */
export const ProviderSelectionPolicy = {
  /**
   * Rule dasar seleksi provider (sesuai mandat pengguna)
   */
  rules: {
    // Rule 1: Work kompleksitas tinggi → gunakan Ruflo
    highComplexity: {
      condition: (work: WorkSemanticContract & { metadata?: { complexity?: string; actorCount?: number; taskCount?: number } }) => work.metadata?.complexity === "high",
      provider: ExecutionProvider.RUFLO,
      reason: "Work memerlukan swarm orchestration untuk kompleksitas tinggi"
    },
    // Rule 2: Jumlah actor >3 → gunakan Ruflo
    manyActors: {
      condition: (work: WorkSemanticContract & { metadata?: { complexity?: string; actorCount?: number; taskCount?: number } }) => (work.metadata?.actorCount || 0) > 3,
      provider: ExecutionProvider.RUFLO,
      reason: "Ruflo memiliki kemampuan koordinasi swarm untuk tim besar (>3 actor)"
    },
    // Rule 3: Jumlah task >4 → gunakan Ruflo
    manyTasks: {
      condition: (work: WorkSemanticContract & { metadata?: { complexity?: string; actorCount?: number; taskCount?: number } }) => (work.metadata?.taskCount || 0) > 4,
      provider: ExecutionProvider.RUFLO,
      reason: "Workflow dengan banyak task (>4) memerlukan orchestration swarm Ruflo"
    },
    // Rule 4: Semua kondisi lain → gunakan Paperclip
    default: {
      condition: () => true,
      provider: ExecutionProvider.PAPERCLIP,
      reason: "Work sederhana cocok dengan Paperclip's agent organization"
    }
  },

  /**
   * Evaluasi semua rule dan return provider yang cocok pertama
   * Urutan rule penting: rule yang lebih spesifik dievaluasi lebih dulu
   */
  evaluate(work: WorkSemanticContract & { metadata?: { complexity?: string; actorCount?: number; taskCount?: number } }): {
    selectedProvider: ExecutionProvider;
    selectionReason: string;
    ruleMatched: string;
  } {
    // Urutan evaluasi: highComplexity → manyActors → manyTasks → default
    const ruleOrder = ["highComplexity", "manyActors", "manyTasks", "default"];
    
    for (const ruleId of ruleOrder) {
      const rule = this.rules[ruleId as keyof typeof this.rules];
      if (rule.condition(work)) {
        console.log(`[PROVIDER.POLICY] Work ${work.id} → ${rule.provider} (${rule.reason})`);
        return {
          selectedProvider: rule.provider,
          selectionReason: rule.reason,
          ruleMatched: ruleId
        };
      }
    }

    // Fallback (tidak seharusnya tercapai karena default rule selalu true)
    return {
      selectedProvider: ExecutionProvider.DEFAULT,
      selectionReason: "Fallback ke EOS native provider (tidak terduga)",
      ruleMatched: "fallback"
    };
  }
};