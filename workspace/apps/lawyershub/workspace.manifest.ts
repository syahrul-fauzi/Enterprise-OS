import { defineWorkspace, StaticRegistry } from "@repo/core-capability-registry";
import type { CapabilityDescriptor, CapabilityImplementation } from "@repo/core-kernel";
import {
  CaseView,
  default as CaseViewDefault,
} from "../../capabilities/legal-case/experience/views/CaseView";
import * as CaseServiceImplModule from "../../capabilities/legal-case/implementation/service";
import {
  DocumentView,
  default as DocumentViewDefault,
} from "../../capabilities/legal-document/experience/views/DocumentView";
import * as DocumentServiceImplModule from "../../capabilities/legal-document/implementation/service";

export const workspace = defineWorkspace({
  id: "lawyershub",
  capabilities: ["legal-case", "legal-document"],
});

const CaseViewComponent = CaseView ?? CaseViewDefault;
const DocumentViewComponent = DocumentView ?? DocumentViewDefault;

const caseImplementation: CapabilityImplementation = {
  commands: CaseServiceImplModule.caseCommands,
  queries: CaseServiceImplModule.caseQueries,
  repositories: CaseServiceImplModule.caseService.repositories,
  services: { CaseService: CaseServiceImplModule.caseService },
  entry: CaseServiceImplModule,
};

const documentImplementation: CapabilityImplementation = {
  commands: DocumentServiceImplModule.documentCommands,
  queries: DocumentServiceImplModule.documentQueries,
  repositories: DocumentServiceImplModule.documentService.repositories,
  services: { DocumentService: DocumentServiceImplModule.documentService },
  entry: DocumentServiceImplModule,
};

const legalCase: CapabilityDescriptor = Object.freeze({
  id: "legal-case",
  version: "0.1.0",
  name: "Case Management",
  experience: { view: CaseViewComponent },
  implementation: caseImplementation,
});

const legalDocument: CapabilityDescriptor = Object.freeze({
  id: "legal-document",
  version: "0.1.0",
  name: "Legal Documents",
  experience: { view: DocumentViewComponent },
  implementation: documentImplementation,
});

export const registry = new StaticRegistry({
  entries: {
    "legal-case": legalCase,
    "legal-document": legalDocument,
  },
});
