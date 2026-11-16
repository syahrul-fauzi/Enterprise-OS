import { GenesisRepository } from '../repository/genesis.repository'
import { CreateFinancialAssessmentInput, FinancialAssessment, ActorReference, EvidenceReference, FinancialAssessmentStatus } from '../contracts/genesis.contracts'

export class CreateFinancialAssessmentCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: CreateFinancialAssessmentInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<FinancialAssessment> {
    const artifact = await this.repository.getSolutionArtifactById(input.solutionId, input.tenantId)
    if (!artifact || artifact.logicalWorkId !== logicalWorkId) {
      throw new Error('SolutionArtifact not found or logicalWorkId mismatch')
    }

    const idempotencySeed = `${input.idempotencyKey || ''}-${logicalWorkId}-${actor.type}-${actor.id}`
    const assessment = await this.repository.createFinancialAssessment({
      tenantId: input.tenantId,
      logicalWorkId,
      solutionArtifactId: input.solutionId,
      estimatedCost: input.estimatedCost,
      estimatedRevenue: input.estimatedRevenue,
      riskScore: 0,
      riskLevel: input.riskLevel,
      riskDescription: input.riskDescription,
      status: FinancialAssessmentStatus.CREATED,
      evidenceRefs: evidence.map(e => e.ref),
      idempotencySeed
    } as any)

    return assessment
  }
}