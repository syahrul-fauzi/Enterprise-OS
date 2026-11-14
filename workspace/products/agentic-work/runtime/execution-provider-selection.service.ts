// @ts-nocheck
import type { Work } from "@repo/core-kernel";
import { ExecutionProvider } from "./types";
import { ProviderSelectionPolicy } from "./execution-provider-selection.policy";

/**
 * Execution Provider Selection Service
 * Memilih execution provider berdasarkan kebijakan formal yang terdefinisi
 * Sesuai ADAPT architecture: Paperclip untuk task sederhana, Ruflo untuk swarm/kompleks
 */
export class ExecutionProviderSelectionService {
  /**
   * Select execution provider for a given work using formal policy
   * @param work - Work item to evaluate
   * @returns Selection result dengan provider, alasan, dan rule yang cocok
   */
  static selectProvider(work: Work): {
    selectedProvider: ExecutionProvider;
    selectionReason: string;
    ruleMatched: string;
  } {
    return ProviderSelectionPolicy.evaluate(work);
  }
}