// Communication Repository Factory - Environment-based implementation selection
// Maintains identical interface regardless of storage backend (in-memory/Postgres)
import { CommunicationRepositoryInMemory } from "./communication.repository";
import { CommunicationRepositoryPostgres } from "./communication.postgres.repository";
import type { CommunicationEvent, CommunicationEventId } from "../contracts/communication.contracts";
import { CommunicationEventStatus } from "../contracts/communication.contracts";

// Determine which repository implementation to use based on environment
const USE_POSTGRES = process.env.NODE_ENV === "production" || process.env.USE_POSTGRES === "true";

// Export the repository that matches the environment, with 100% identical interface
export const CommunicationRepository = USE_POSTGRES 
  ? CommunicationRepositoryPostgres 
  : CommunicationRepositoryInMemory;

// Re-export all types and utilities from contracts to maintain API compatibility
export {
  newCommunicationEventId,
  defaultCommunicationStatus,
  CommunicationEventStatus,
  type CommunicationEvent,
  type CommunicationEventId,
} from "../contracts/communication.contracts.js";

// Expose both implementations for testing/migration purposes
export {
  CommunicationRepositoryInMemory,
  CommunicationRepositoryPostgres
};