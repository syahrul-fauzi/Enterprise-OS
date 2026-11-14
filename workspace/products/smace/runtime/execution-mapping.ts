// @ts-nocheck
// SMACE-ARCH-003: Execution workflow layer - pemetaan SMACE workflow ke EOS execution primitives
import { WorkAggregate, createWorkId } from '../../../capabilities/work-core/contracts/work.contracts.js';
import { budgetEngineCommands } from '../../../capabilities/budget-engine/implementation/commands/index.js';
import { workflowEngineService } from '../../../capabilities/workflow-engine/implementation/services/workflow-engine.service.js';
import { CreativeBrief } from '../domain/creative-brief/contracts/creative-brief.contract.js';

export interface ExecutionRequest {
  canonicalWorkId: string;
  providerId: string;
  budgetAllocation: number;
  payload: any;
}

export async function submitWorkForExecution(brief: CreativeBrief): Promise<{ success: boolean; executionId: string }> {
  // 1. Validasi budget dengan EOS budget-engine (reuse primitive)
  const budgetValidation = await budgetEngineCommands['budget.allocate'].execute({
    tenantId: brief.tenantId,
    amount: brief.budget,
    workId: brief.canonicalWorkId!
  });

  if (!budgetValidation.approved) {
    throw new Error(`Budget tidak disetujui: ${budgetValidation.reason}`);
  }

  // 2. Submit ke EOS workflow-engine untuk dijalankan oleh provider
  const executionResult = await workflowEngineService.executeWorkflow({
    workId: brief.canonicalWorkId!,
    provider: brief.selectedProvider,
    input: brief.specifications,
    metadata: {
      briefId: brief.id,
      tenantId: brief.tenantId
    }
  });

  return {
    success: executionResult.accepted,
    executionId: executionResult.id
  };
}

// Helper untuk membuat EOS canonical Work dari brief
export function createCanonicalWorkFromBrief(brief: CreativeBrief): WorkAggregate {
  const workId = createWorkId();
  const eosWork: WorkAggregate = {
    id: workId,
    tenantId: brief.tenantId,
    actorId: brief.customerId,
    title: 'SMACE Product Photography Work',
    description: brief.briefDescription,
    status: 'draft',
    mode: 'domain',
    createdAt: new Date(),
    updatedAt: new Date(),
    compositionId: '' as any,
    platformMetadata: { 
      briefId: brief.id,
      provider: brief.selectedProvider
    }
  };
  
  return eosWork;
}