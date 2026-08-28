export {
  createCase,
  closeCase,
  assignLawyer,
  addEvidenceToCase,
  markCaseCompleted,
  caseCommands,
  // Canonical Work aliases - Case = Work specialization for legal domain
  // Menyelaraskan dengan EOS Face context: Intent → Work
  createCase as createWork,
  closeCase as closeWork,
  markCaseCompleted as markWorkCompleted,
  addEvidenceToCase as addEvidenceToWork
} from "./case.commands";
export { getCaseByIdCommand } from "./get-case-by-id.command";
// Hanya export yang dibutuhkan untuk EOS Face Spine
export type * from "./case.commands";
// Re-export semua type dari contracts untuk compatibility
export type * from "../../contracts/index";