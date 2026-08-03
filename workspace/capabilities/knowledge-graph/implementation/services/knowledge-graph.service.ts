import { agentOrchestrationService } from "../../../agent-orchestration/implementation/services/agent-orchestration.service";
import { evidenceRegistryService } from "../../../evidence-registry/implementation/services/evidence-registry.service";
import { requirementService } from "../../../requirement-management/implementation/services/requirement.service";
import { workflowEngineService } from "../../../workflow-engine/implementation/services/workflow-engine.service";
import type { KnowledgeEdge, KnowledgeGraphSnapshot, KnowledgeNode } from "../contracts";
import { recordRuntimeInvocation } from "@repo/core-runtime";

export class KnowledgeGraphService {
  getSnapshot(): KnowledgeGraphSnapshot {
    const requirements = requirementService.searchRequirements({ limit: 100, offset: 0 }).items;
    const evidence = evidenceRegistryService.searchEvidenceRegistry({ limit: 50, offset: 0 }).items;
    const workflows = workflowEngineService.listWorkflowDefinitions();
    const plans = agentOrchestrationService.listPlans();

    const nodes: KnowledgeNode[] = [
      ...requirements.map((item) => ({
        id: `requirement:${item.id}`,
        type: "requirement" as const,
        label: item.title,
        attributes: { status: item.status, verificationStatus: item.verificationStatus },
      })),
      ...evidence.map((item) => ({
        id: `evidence:${item.id}`,
        type: "evidence" as const,
        label: item.path,
        attributes: { kind: item.kind, scope: item.scope },
      })),
      ...workflows.map((item) => ({
        id: `workflow:${item.id}`,
        type: "workflow" as const,
        label: item.name,
        attributes: { steps: item.steps.length },
      })),
      ...plans.map((item) => ({
        id: `plan:${item.id}`,
        type: "plan" as const,
        label: item.name,
        attributes: { workItems: item.workItems.length },
      })),
    ];

    const edges: KnowledgeEdge[] = [
      ...requirements.flatMap((item) =>
        item.linkedCapabilityIds.map((capabilityId) => ({
          id: `edge:req:${item.id}:${capabilityId}`,
          from: `requirement:${item.id}`,
          to: `workflow:requirement-delivery-readiness`,
          relation: `supports:${capabilityId}`,
        })),
      ),
      ...plans.flatMap((plan) =>
        plan.workItems.map((item) => ({
          id: `edge:plan:${plan.id}:${item.workflowId}`,
          from: `plan:${plan.id}`,
          to: `workflow:${item.workflowId}`,
          relation: "dispatches",
        })),
      ),
      ...evidence.flatMap((item) =>
        item.requirementRefs.map((ref) => ({
          id: `edge:evidence:${item.id}:${ref}`,
          from: `evidence:${item.id}`,
          to: "requirement:req-003",
          relation: "proves",
        })),
      ),
    ];

    const result = { nodes, edges };
    recordRuntimeInvocation({
      capabilityId: "knowledge-graph",
      operationId: "get-snapshot",
      sourceRef: "KnowledgeGraphService.getSnapshot",
      success: true,
      input: {},
      result: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
      },
    });
    return result;
  }

  getNode(id: string): KnowledgeNode | undefined {
    const result = this.getSnapshot().nodes.find((node) => node.id === id);
    recordRuntimeInvocation({
      capabilityId: "knowledge-graph",
      operationId: "get-node",
      sourceRef: "KnowledgeGraphService.getNode",
      success: result !== undefined,
      input: { id },
      result: result ?? { error: "node_not_found", id },
    });
    return result;
  }
}

export const knowledgeGraphService = new KnowledgeGraphService();

export * from "../contracts";
