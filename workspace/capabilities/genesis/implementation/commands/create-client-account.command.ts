import { GenesisRepository } from '../repository/genesis.repository'
import { CreateClientAccountInput, ClientAccount, ActorReference, EvidenceReference, ClientAccountStatus } from '../contracts/genesis.contracts'

export class CreateClientAccountCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: CreateClientAccountInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<ClientAccount> {
    const asset = await this.repository.getConversionAssetById(input.offerId, input.tenantId)
    if (!asset || asset.logicalWorkId !== logicalWorkId) {
      throw new Error('ConversionAsset not found or logicalWorkId mismatch')
    }

    const idempotencySeed = `${input.idempotencyKey || ''}-${logicalWorkId}-${actor.type}-${actor.id}`
    const account = await this.repository.createClientAccount({
      tenantId: input.tenantId,
      logicalWorkId,
      conversionAssetId: input.offerId,
      name: input.clientName,
      email: input.clientEmail,
      status: ClientAccountStatus.CREATED,
      evidenceRefs: evidence.map(e => e.ref),
      idempotencySeed
    } as any)

    return account
  }
}