export type {
  CommunicationEvent,
  SendCommunicationInput,
  SendCommunicationOutput,
  CommunicationAdapter,
  CommunicationEventId,
  CommunicationAdapterType,
  CommunicationEventStatus
} from "./contracts/index.js";
export { communicationCommands } from "./commands/index.js";
export { CommunicationRepositoryInMemory } from "./repository/index.js";