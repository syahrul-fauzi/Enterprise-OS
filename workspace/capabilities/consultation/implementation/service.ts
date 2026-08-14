export type {
  ConsultationStatus,
  ConsultationPriority,
  ConsultationTriageResult,
  ConsultationAggregate,
  CreateConsultationInput,
  CreateConsultationOutput,
  TriageConsultationInput,
  TriageConsultationOutput,
  GetConsultationInput,
  GetConsultationOutput,
  SearchConsultationsInput,
  SearchConsultationsOutput,
  ConsultationRepository,
} from "./contracts/consultation.contracts.js";
export { ConsultationId } from "./contracts/consultation.contracts.js";
export * from "./commands/index.js";
export * from "./queries/index.js";
export * from "./repository/consultation.repository.js";