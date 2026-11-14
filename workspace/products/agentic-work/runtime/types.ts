// @ts-nocheck
/**
 * Shared type definitions for Agentic Work execution
 */

/**
 * Enum for available execution providers
 */
export enum ExecutionProvider {
  PAPERCLIP = "paperclip",   // Simple agent organization & execution coordination
  RUFLO = "ruflo",           // Intelligence & swarm execution
  DEFAULT = "default"        // EOS native execution provider (legacy/simple cases)
}

/**
 * Provider selection metadata to attach to work
 */
export interface ProviderSelectionMetadata {
  selectedProvider: ExecutionProvider;
  selectedAt: string;
  selectionReason: string;
  workId: string;
}