// Configure persistent storage paths FIRST, before any imports that use them!
// These are overridden by .env.local in Next.js but kept for compatibility

import { StaticRegistry } from "@repo/core-capability-registry";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/core-kernel";
import {
  RequirementView,
  default as RequirementViewDefault,
} from "../../capabilities/requirement-management/experience/views/RequirementView";
import * as RequirementServiceImplModule from "../../capabilities/requirement-management/implementation/service";
// Identity capability imports
import { identityCommands } from "../../capabilities/identity/implementation/commands";
import {
  UserRepositoryPostgres,
  TenantRepositoryPostgres,
  WorkspaceRepositoryPostgres,
  MembershipRepositoryPostgres,
  SessionRepositoryPostgres,
} from "../../capabilities/identity/implementation/repositories";
import { passwordService } from "../../capabilities/identity/implementation/services/password.service";
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
  resumeConsultation,
  getConsultation,
  searchConsultations
} from "../../capabilities/consultation/implementation/commands/consultation.commands";
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
    "consultation.get": getConsultation,
    "consultation.search": searchConsultations,
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
    "observability": observability,
  },
});