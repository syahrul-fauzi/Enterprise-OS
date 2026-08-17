// Configure persistent storage paths FIRST, before any imports that use them!
// These are overridden by .env.local in Next.js but kept for compatibility

import { StaticRegistry } from "@repo/core-capability-registry";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/core-kernel";
import {
  RequirementView,
  default as RequirementViewDefault,
} from "../../capabilities/requirement-management/experience/views/RequirementView.js";
import * as RequirementServiceImplModule from "../../capabilities/requirement-management/implementation/service.js";
// Identity capability imports
import { identityCommands } from "../../capabilities/identity/implementation/commands";
import {
  UserRepositoryPostgres,
  TenantRepositoryPostgres,
  WorkspaceRepositoryPostgres,
  MembershipRepositoryPostgres,
  SessionRepositoryPostgres,
} from "../../capabilities/identity/implementation/repositories/index.js";
import { passwordService } from "../../capabilities/identity/implementation/services/password.service.js";
// Evidence Registry capability imports
import * as EvidenceRegistryServiceImplModule from "../../capabilities/evidence-registry/implementation/service";
// Consultation capability imports
import * as ConsultationServiceImplModule from "../../capabilities/consultation/implementation/service";
import { 
  createConsultation, 
  triageConsultation, 
  listConsultationsByWorkspace, 
  resolveConsultation, 
  pauseConsultation, 
  resumeConsultation
} from "../../capabilities/consultation/implementation/commands/consultation.commands.js";
const RequirementViewComponent = RequirementView ?? RequirementViewDefault;

const requirementImplementation: CapabilityImplementation = {
  commands: RequirementServiceImplModule.requirementCommands,
  queries: RequirementServiceImplModule.requirementQueries,
  repositories: RequirementServiceImplModule.requirementService.repositories,
  services: { RequirementService: RequirementServiceImplModule.requirementService },
  entry: RequirementServiceImplModule,
};

const requirementManagement: CapabilityDescriptor = Object.freeze({
  id: "requirement-management",
  version: "0.1.0",
  name: "Requirement Management",
  experience: { view: RequirementViewComponent },
  implementation: requirementImplementation,
});

// Identity capability implementation
const identityImplementation: CapabilityImplementation = {
  commands: identityCommands,
  queries: {},
  repositories: {
    UserRepository: UserRepositoryPostgres,
    TenantRepository: TenantRepositoryPostgres,
    WorkspaceRepository: WorkspaceRepositoryPostgres,
    MembershipRepository: MembershipRepositoryPostgres,
    SessionRepository: SessionRepositoryPostgres,
  },
  services: { passwordService },
  entry: {},
};

const identity: CapabilityDescriptor = Object.freeze({
  id: "identity",
  version: "1.0.0",
  name: "Identity",
  experience: {},
  implementation: identityImplementation,
});

// Import evidence registry queries dengan properti lengkap
import { getEvidenceRecord, searchEvidenceRegistry } from "../../capabilities/evidence-registry/implementation/queries/evidence-registry.queries";

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
import { CaseWorkspace } from "../../capabilities/legal-case/experience/workspaces/CaseWorkspace";
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
import { documentCommands } from "../../capabilities/legal-document/implementation/commands/document.commands";
import { DocumentRepositoryInMemory } from "../../capabilities/legal-document/implementation/repository/document.repository.js";

// Legal Document capability implementation
const legalDocumentImplementation: CapabilityImplementation = {
  commands: documentCommands,
  queries: {},
  repositories: { DocumentRepository: DocumentRepositoryInMemory },
  services: {},
  entry: {},
};

const legalDocument: CapabilityDescriptor = Object.freeze({
  id: "legal-document",
  version: "0.1.0",
  name: "Legal Document Management",
  experience: {},
  implementation: legalDocumentImplementation,
});

// Observability capability imports
import * as ObservabilityServiceImplModule from "../../capabilities/observability/implementation/service";

// Observability capability implementation
const observabilityImplementation: CapabilityImplementation = {
  commands: ObservabilityServiceImplModule.observabilityCommands,
  queries: {},
  repositories: {},
  services: {},
  entry: ObservabilityServiceImplModule,
};

const observability: CapabilityDescriptor = Object.freeze({
  id: "observability",
  version: "0.1.0",
  name: "Observability & Incident Management",
  experience: {},
  implementation: observabilityImplementation,
});

export const registry = new StaticRegistry({
  entries: {
    "requirement-management": requirementManagement,
    "identity": identity,
    "evidence-registry": evidenceRegistry,
    "consultation": consultation,
    "legal-case": legalCase,
    "legal-document": legalDocument,
    "observability": observability,
  },
});