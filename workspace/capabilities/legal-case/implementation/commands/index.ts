import { commands } from "./case.commands.js";
export { commands as caseCommands };
export { getCaseByIdCommand } from "./get-case-by-id.command.js";
// Extract individual functions from commands object for backward compatibility
const {
  "create-case": createCase,
  "close-case": closeCase,
  "assign-lawyer-to-case": assignLawyerToCase,
  "add-evidence-to-case": addEvidenceToCase,
  "list-cases-for-tenant": listCasesForTenant
} = commands;
// Canonical Work aliases - Case = Work specialization for legal domain
// Menyelaraskan dengan EOS Face context: Intent → Work
export { 
  createCase, 
  closeCase, 
  assignLawyerToCase as assignLawyer,
  addEvidenceToCase,
  createCase as createWork,
  closeCase as closeWork,
  addEvidenceToCase as addEvidenceToWork
};
// Hanya export yang dibutuhkan untuk EOS Face Spine
export type * from "./case.commands.js";
// Re-export semua type dari contracts untuk compatibility
export type * from "../../contracts/index.js";