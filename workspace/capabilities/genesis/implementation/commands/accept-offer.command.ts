import { GenesisRepository } from '../repository/genesis.repository'
import { AcceptOfferInput, ConversionAsset, ActorReference, EvidenceReference, OfferStatus } from '../contracts/genesis.contracts'

export class AcceptOfferCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: AcceptOfferInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<ConversionAsset> {
    const asset = await this.repository.getConversionAssetById(input.offerId, input.tenantId)
    if (!asset || asset.logicalWorkId !== logicalWorkId) {
      throw new Error('ConversionAsset not found or logicalWorkId mismatch')
    }

    if (asset.status === OfferStatus.ACCEPTED) {
      return asset
    }

    const updatedAsset = await this.repository.updateConversionAssetStatus(
      input.offerId,
      OfferStatus.ACCEPTED,
      evidence.map(e => e.ref)
    )

    if (!updatedAsset) {
      throw new Error('Failed to update ConversionAsset status')
    }

    return updatedAsset
  }
}