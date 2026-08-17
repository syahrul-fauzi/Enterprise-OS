import { evidenceRegistryService } from "../../../evidence-registry/implementation/services/evidence-registry.service.js";
import { requirementService } from "../../../requirement-management/implementation/services/requirement.service.js";
import { workflowEngineService } from "../../../workflow-engine/implementation/services/workflow-engine.service.js";
import type { ConnectorDefinition, ConnectorSyncResult } from "../contracts/index.js";
import { recordRuntimeInvocation } from "@repo/core-runtime";

const CONNECTORS: readonly ConnectorDefinition[] = Object.freeze([
  {
    id: "requirements-json-export",
    name: "Requirements JSON Export",
    direction: "export",
    target: "downstream-systems",
    description: "Exports requirement inventory for external delivery consumers.",
  },
  {
    id: "evidence-registry-sync",
    name: "Evidence Registry Sync",
    direction: "sync",
    target: "governance-audit",
    description: "Synchronizes accepted evidence records to external governance readers.",
  },
  {
    id: "workflow-status-export",
    name: "Workflow Status Export",
    direction: "export",
    target: "operations-dashboards",
    description: "Exports workflow definitions and operational readiness to dashboards.",
  },
]);

export class ConnectorEcosystemService {
  listConnectors(): readonly ConnectorDefinition[] {
    const result = CONNECTORS.map((connector) => ({ ...connector }));
    recordRuntimeInvocation({
      capabilityId: "connector-ecosystem",
      operationId: "list-connectors",
      sourceRef: "ConnectorEcosystemService.listConnectors",
      success: true,
      input: {},
      result: {
        count: result.length,
        connectorIds: result.map((connector) => connector.id),
      },
    });
    return result;
  }

  getConnector(id: string): ConnectorDefinition | undefined {
    const result = CONNECTORS.find((connector) => connector.id === id);
    recordRuntimeInvocation({
      capabilityId: "connector-ecosystem",
      operationId: "get-connector",
      sourceRef: "ConnectorEcosystemService.getConnector",
      success: result !== undefined,
      input: { id },
      result: result ?? { error: "connector_not_found", connectorId: id },
    });
    return result;
  }

  sync(id: string): ConnectorSyncResult {
    if (id === "requirements-json-export") {
      const requirements = requirementService.searchRequirements({ limit: 100, offset: 0 });
      const result: ConnectorSyncResult = {
        connectorId: id,
        status: "completed",
        exportedCount: requirements.matched,
        payload: {
          items: requirements.items.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
          })),
        },
      };
      recordRuntimeInvocation({
        capabilityId: "connector-ecosystem",
        operationId: "sync",
        sourceRef: "ConnectorEcosystemService.sync",
        success: true,
        input: { connectorId: id },
        result,
      });
      return result;
    }

    if (id === "evidence-registry-sync") {
      const evidence = evidenceRegistryService.searchEvidenceRegistry({ limit: 200, offset: 0 });
      const result: ConnectorSyncResult = {
        connectorId: id,
        status: "completed",
        exportedCount: evidence.matched,
        payload: {
          items: evidence.items.map((item) => ({
            id: item.id,
            kind: item.kind,
            path: item.path,
          })),
        },
      };
      recordRuntimeInvocation({
        capabilityId: "connector-ecosystem",
        operationId: "sync",
        sourceRef: "ConnectorEcosystemService.sync",
        success: true,
        input: { connectorId: id },
        result,
      });
      return result;
    }

    if (id === "workflow-status-export") {
      const workflows = workflowEngineService.listWorkflowDefinitions();
      const result: ConnectorSyncResult = {
        connectorId: id,
        status: "completed",
        exportedCount: workflows.length,
        payload: {
          items: workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            steps: workflow.steps.length,
          })),
        },
      };
      recordRuntimeInvocation({
        capabilityId: "connector-ecosystem",
        operationId: "sync",
        sourceRef: "ConnectorEcosystemService.sync",
        success: true,
        input: { connectorId: id },
        result,
      });
      return result;
    }

    const result: ConnectorSyncResult = {
      connectorId: id,
      status: "failed",
      exportedCount: 0,
      payload: { error: "connector_not_found" },
    };
    recordRuntimeInvocation({
      capabilityId: "connector-ecosystem",
      operationId: "sync",
      sourceRef: "ConnectorEcosystemService.sync",
      success: false,
      input: { connectorId: id },
      result,
    });
    return result;
  }
}

export const connectorEcosystemService = new ConnectorEcosystemService();

export * from "../contracts/index.js";
