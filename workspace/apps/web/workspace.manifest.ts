import { StaticRegistry } from "@repo/core-capability-registry";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/core-kernel";
import {
  RequirementView,
  default as RequirementViewDefault,
} from "../../capabilities/requirement-management/experience/views/RequirementView";
import * as RequirementServiceImplModule from "../../capabilities/requirement-management/implementation/service";

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

export const registry = new StaticRegistry({
  entries: {
    "requirement-management": requirementManagement,
  },
});
