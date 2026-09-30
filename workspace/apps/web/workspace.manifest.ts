// Configure persistent storage paths FIRST, before any imports that use them!
// These are overridden by .env.local in Next.js but kept for compatibility

import { StaticRegistry } from "@repo/core-capability-registry";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/core-kernel";
// import {
//   RequirementView,
//   default as RequirementViewDefault,
// } from "../../capabilities/requirement-management/experience/views/RequirementView.js"; (temporarily disabled)
// import * as RequirementServiceImplModule from "@repo/capabilities-requirement-management"; // Package not yet registered
import { identityCommands } from "@repo/capabilities-identity";
import {
  getUserRepositoryPostgres,
  getTenantRepositoryPostgres,
  getWorkspaceRepositoryPostgres,
  getMembershipRepositoryPostgres,
  getSessionRepositoryPostgres,
  passwordService
} from "@repo/capabilities-identity";
import * as ConsultationServiceImplModule from "../../capabilities/consultation/implementation/service.js";
import { 
  createConsultation, 
  triageConsultation, 
  listConsultationsByWorkspace, 
  resolveConsultation, 
  pauseConsultation, 
  resumeConsultation
} from "../../capabilities/consultation/implementation/commands/consultation.commands.js";
// const RequirementViewComponent = RequirementView ?? RequirementViewDefault; (temporarily disabled)

// const requirementImplementation: CapabilityImplementation = {
//   commands: RequirementServiceImplModule.requirementCommands,
//   queries: RequirementServiceImplModule.requirementQueries,
//   repositories: RequirementServiceImplModule.requirementService.repositories,
//   services: { RequirementService: RequirementServiceImplModule.requirementService },
//   entry: RequirementServiceImplModule,
// };

// const requirementManagement: CapabilityDescriptor = Object.freeze({
//   id: "requirement-management",
//   version: "1.0.0",
//   name: "Requirement Management",
//   experience: { view: RequirementViewComponent },
//   implementation: requirementImplementation
// });

// Import requirement management modules
import { requirementCommands } from "../../capabilities/requirement-management/implementation/commands/index.js";
import { requirementQueries } from "../../capabilities/requirement-management/implementation/queries/index.js";
import { requirementService } from "../../capabilities/requirement-management/implementation/services/requirement.service.js";
import { getRequirementRepositoryPostgres } from "../../capabilities/requirement-management/implementation/repository/requirement.repository.js";
// Requirement View import
import RequirementView from "../../capabilities/requirement-management/experience/views/RequirementView.js";

// Identity capability implementation
const identityImplementation: CapabilityImplementation = {
  commands: identityCommands,
  queries: {},
  repositories: {
    UserRepository: getUserRepositoryPostgres(),
    TenantRepository: getTenantRepositoryPostgres(),
    WorkspaceRepository: getWorkspaceRepositoryPostgres(),
    MembershipRepository: getMembershipRepositoryPostgres(),
    SessionRepository: getSessionRepositoryPostgres(),
  },
  services: { passwordService },
  entry: {},
};

// Requirement Management capability implementation - BATTLE-1D
const requirementImplementation: CapabilityImplementation = {
  commands: requirementCommands,
  queries: requirementQueries,
  repositories: { RequirementRepository: getRequirementRepositoryPostgres() },
  services: { RequirementService: requirementService },
  entry: {},
};

const requirementManagement: CapabilityDescriptor = Object.freeze({
  id: "requirement-management",
  version: "1.0.0",
  name: "Requirement Management",
  experience: { view: RequirementView },
  implementation: requirementImplementation
});

const identity: CapabilityDescriptor = Object.freeze({
  id: "identity",
  version: "1.0.0",
  name: "Identity",
  experience: {},
  implementation: identityImplementation,
});

// Import evidence registry queries dengan properti lengkap
import { getEvidenceRecord, searchEvidenceRegistry } from "../../capabilities/evidence-registry/implementation/queries/evidence-registry.queries.js";
import * as EvidenceRegistryServiceImplModule from "../../capabilities/evidence-registry/implementation/service.js";

// Evidence Registry capability implementation
const evidenceRegistryImplementation: CapabilityImplementation = {
  commands: EvidenceRegistryServiceImplModule.evidenceRegistryCommands,
  queries: {
    "evidence.get": { ...getEvidenceRecord, kind: "query", name: "evidence.get" },
    "evidence.search": { ...searchEvidenceRegistry, kind: "query", name: "evidence.search" },
  },
  repositories: { EvidenceRegistryRepository: EvidenceRegistryServiceImplModule.EvidenceRegistryRepositoryFileSystem },
  services: {},
  entry: EvidenceRegistryServiceImplModule,
};

const evidenceRegistry: CapabilityDescriptor = Object.freeze({
  id: "evidence-registry",
  version: "0.1.0",
  name: "Evidence Registry",
  experience: {},
  implementation: evidenceRegistryImplementation,
});

// Consultation capability implementation
const consultationImplementation: CapabilityImplementation = {
  commands: {
    "consultation.create": createConsultation,
    "consultation.triage": triageConsultation,
    "consultation.listByWorkspace": listConsultationsByWorkspace,
    "consultation.resolve": resolveConsultation,
    "consultation.pause": pauseConsultation,
    "consultation.resume": resumeConsultation,
  },
  queries: {
  },
  repositories: { ConsultationRepository: ConsultationServiceImplModule.ConsultationRepositoryInMemory },
  services: {},
  entry: ConsultationServiceImplModule,
};

const consultation: CapabilityDescriptor = Object.freeze({
  id: "consultation",
  version: "0.1.0",
  name: "Consultation Management",
  experience: {},
  implementation: consultationImplementation,
});

// Legal Case capability imports
import { CaseWorkspace } from "../../capabilities/legal-case/experience/workspaces/CaseWorkspace.js";
import * as LegalCaseServiceImplModule from "../../capabilities/legal-case/implementation/services/index.js";
import { caseCommands } from "../../capabilities/legal-case/implementation/commands/index.js";
import { getCase, searchCases } from "../../capabilities/legal-case/implementation/queries/case.queries.js";
import { CaseRepositoryPostgres } from "../../capabilities/legal-case/implementation/repository/case-postgres.repository.js";

// Legal Case capability implementation
const legalCaseImplementation: CapabilityImplementation = {
  commands: caseCommands,
  queries: {
    "case.get": { ...getCase, kind: "query", name: "case.get" },
    "case.search": { ...searchCases, kind: "query", name: "case.search" },
  },
  repositories: { CaseRepository: CaseRepositoryPostgres },
  services: { CaseService: LegalCaseServiceImplModule.caseService },
  entry: LegalCaseServiceImplModule,
};

const legalCase: CapabilityDescriptor = Object.freeze({
  id: "legal-case",
  version: "0.1.0",
  name: "Legal Case Management",
  experience: { view: CaseWorkspace },
  implementation: legalCaseImplementation,
});

// Legal Document capability imports

// Communication capability imports
import { communicationCommands, communicationQueries } from "../../capabilities/communication/implementation/commands/index.js";
import { CommunicationRepositoryInMemory } from "../../capabilities/communication/implementation/repository/index.js";
import { communicationService } from "../../capabilities/communication/implementation/services/communication.service.js";

// Communication capability implementation
const communicationImplementation: CapabilityImplementation = {
  commands: communicationCommands,
  queries: communicationQueries,
  repositories: { CommunicationRepository: CommunicationRepositoryInMemory },
  services: { CommunicationService: communicationService },
  entry: null,
};

const communication: CapabilityDescriptor = Object.freeze({
  id: "communication",
  version: "0.1.0",
  name: "Communication Adapter Layer",
  experience: {},
  implementation: communicationImplementation,
});

// Work Core capability imports (EOS Primitive: Work as continuity substrate)
import { createWorkCommand } from "../../capabilities/work-core/implementation/commands/work.commands.js";
import { WorkRepositoryPostgres } from "../../capabilities/work-core/implementation/repository/work-postgres.repository.js";

// Work Core capability implementation
const workCoreImplementation: CapabilityImplementation = {
  commands: {
    "work.create": createWorkCommand,
  },
  queries: {},
  repositories: {},
  services: {},
  entry: null,
};

const workCore: CapabilityDescriptor = Object.freeze({
  id: "work-core",
  version: "1.0.0",
  name: "Core Work Management (EOS Primitive)",
  experience: {},
  implementation: workCoreImplementation,
});

// Consultation capability imports (REMOVED - temporarily disabled to resolve spine flow build)
// import { consultationCommands } from "../../capabilities/consultation/implementation/commands/consultation.commands.js";

// Consultation capability implementation (DISABLED - unrelated to current spine flow)
// const consultationImplementation: CapabilityImplementation = {
//   commands: consultationCommands,
//   queries: {},
//   repositories: {},
//   services: {},
//   entry: null,
// };

// const consultation: CapabilityDescriptor = Object.freeze({
//   id: "consultation
//   version: "0.1.0",
//   name: "Consultation Management",
//   experience: {},
//   implementation: consultationImplementation,
// });
// import { documentCommands } from "../../capabilities/legal-document/implementation/commands/document.commands.js";
// import { DocumentRepositoryInMemory } from "../../capabilities/legal-document/implementation/repository/document.repository.js";

// // Legal Document capability implementation (temporarily disabled to unblock build)
// const legalDocumentImplementation: CapabilityImplementation = {
//   commands: documentCommands,
//   queries: {},
//   repositories: { DocumentRepository: DocumentRepositoryInMemory },
//   services: {},
//   entry: {},
// };

// const legalDocument: CapabilityDescriptor = Object.freeze({
//   id: "legal-document",
//   version: "0.1.0",
//   name: "Legal Document Management",
//   experience: {},
//   implementation: legalDocumentImplementation,
// });

// // Observability capability imports (temporarily disabled to unblock build)
// import * as ObservabilityServiceImplModule from "../../capabilities/observability/implementation/service.js";

// // Observability capability implementation
// const observabilityImplementation: CapabilityImplementation = {
//   commands: ObservabilityServiceImplModule.observabilityCommands,
//   queries: {},
//   repositories: {},
//   services: {},
//   entry: ObservabilityServiceImplModule,
// };

// const observability: CapabilityDescriptor = Object.freeze({
//   id: "observability",
//   version: "0.1.0",
//   name: "Observability & Incident Management",
//   experience: {},
//   implementation: observabilityImplementation,
// });

export const registry = new StaticRegistry({
  entries: {
    "requirement-management": requirementManagement,
    "identity": identity,
    "evidence-registry": evidenceRegistry,
    "work-core": workCore,
    "consultation": consultation,
    "legal-case": legalCase,
    "communication": communication,
  },
});