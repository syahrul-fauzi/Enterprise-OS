import { ExecutionContext } from './execution-context.js';
import { InvocationEvidence } from './invocation-evidence.js';

export class EvidenceService {
  async recordInvocationEvidence(context: ExecutionContext, data: Record<string, any>) {
    return InvocationEvidence.record(context, 'invocation', data);
  }

  async getEvidenceByContext(context: ExecutionContext) {
    return InvocationEvidence.getByContext(context);
  }
}