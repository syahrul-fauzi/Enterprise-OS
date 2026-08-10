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
  UserRepositoryInMemory,
  TenantRepositoryInMemory,
  WorkspaceRepositoryInMemory,
  MembershipRepositoryInMemory,
  SessionRepositoryInMemory,
} from "../../capabilities/identity/implementation/repositories";
import { passwordService } from "../../capabilities/identity/implementation/services/password.service";

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
    UserRepository: UserRepositoryInMemory,
    TenantRepository: TenantRepositoryInMemory,
    WorkspaceRepository: WorkspaceRepositoryInMemory,
    MembershipRepository: MembershipRepositoryInMemory,
    SessionRepository: SessionRepositoryInMemory,
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

export const registry = new StaticRegistry({
  entries: {
    "requirement-management": requirementManagement,
    "identity": identity,
  },
});