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
  UserRepositoryFileBacked,
  TenantRepositoryFileBacked,
  WorkspaceRepositoryFileBacked,
  MembershipRepositoryFileBacked,
  SessionRepositoryFileBacked,
} from "../../capabilities/identity/implementation/repositories";
import { passwordService } from "../../capabilities/identity/implementation/services/password.service";
// Evidence Registry capability imports
import * as EvidenceRegistryServiceImplModule from "../../capabilities/evidence-registry/implementation/service";
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
    UserRepository: UserRepositoryFileBacked,
    TenantRepository: TenantRepositoryFileBacked,
    WorkspaceRepository: WorkspaceRepositoryFileBacked,
    MembershipRepository: MembershipRepositoryFileBacked,
    SessionRepository: SessionRepositoryFileBacked,
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

// Evidence Registry capability implementation
const evidenceRegistryImplementation: CapabilityImplementation = {
  commands: {},
  queries: EvidenceRegistryServiceImplModule.evidenceRegistryQueries,
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

export const registry = new StaticRegistry({
  entries: {
    "requirement-management": requirementManagement,
    "identity": identity,
    "evidence-registry": evidenceRegistry,
  },
});