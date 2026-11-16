import { GenesisRepository } from '../repository/genesis.repository'
import { CreateConversionAssetInput, ConversionAsset, ActorReference, EvidenceReference, OfferStatus } from '../contracts/genesis.contracts'

export class CreateConversionAssetCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: CreateConversionAssetInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<ConversionAsset> {
    const assessment = await this.repository.getFinancialAssessmentById(input.assessmentId, input.tenantId)
    if (!assessment || assessment.logicalWorkId !== logicalWorkId) {
      throw new Error('FinancialAssessment not found or logicalWorkId mismatch')
    }

    const idempotencySeed = `${input.idempotencyKey || ''}-${logicalWorkId}-${actor.type}-${actor.id}`
    const asset = await this.repository.createConversionAsset({
      tenantId: input.tenantId,
      logicalWorkId,
      financialAssessmentId: input.assessmentId,
      title: input.offerTitle,
      description: input.offerDescription,
      price: input.offerPrice,
      status: OfferStatus.CREATED,
      evidenceRefs: evidence.map(e => e.ref),
      idempotencySeed
    } as any)

    return asset
  }
}