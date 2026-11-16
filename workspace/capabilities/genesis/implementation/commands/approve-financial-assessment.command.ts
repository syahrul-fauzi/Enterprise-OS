import { GenesisRepository } from '../repository/genesis.repository'
import { ApproveFinancialAssessmentInput, FinancialAssessment, ActorReference, EvidenceReference, FinancialAssessmentStatus } from '../contracts/genesis.contracts'

export class ApproveFinancialAssessmentCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: ApproveFinancialAssessmentInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<FinancialAssessment> {
    const assessment = await this.repository.getFinancialAssessmentById(input.assessmentId, input.tenantId)
    if (!assessment || assessment.logicalWorkId !== logicalWorkId) {
      throw new Error('FinancialAssessment not found or logicalWorkId mismatch')
    }

    const statusMap: Record<string, FinancialAssessmentStatus> = {
      'APPROVE': FinancialAssessmentStatus.APPROVED,
      'REJECT': FinancialAssessmentStatus.REJECTED,
      'REVISE': FinancialAssessmentStatus.NEEDS_REVISION
    }

    const targetStatus = statusMap[input.decision]
    if (assessment.status === targetStatus && assessment.approvalScore === input.approvalScore && assessment.recommendation === input.decision) {
      return assessment
    }

    const updatedAssessment = await this.repository.updateFinancialAssessmentStatus(
      input.assessmentId,
      targetStatus,
      {
        approvalScore: input.approvalScore,
        recommendation: input.decision as 'APPROVE' | 'REJECT' | 'REVISE',
        reason: input.approvalReason
      },
      evidence.map(e => e.ref)
    )

    if (!updatedAssessment) {
      throw new Error('Failed to update FinancialAssessment status')
    }

    return updatedAssessment
  }
}