import { GenesisRepository } from '../repository/genesis.repository'
import { CaptureLeadProspectInput, LeadProspect, ActorReference, EvidenceReference, LeadProspectStatus } from '../contracts/genesis.contracts'

export class CaptureLeadProspectCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: CaptureLeadProspectInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<LeadProspect> {
    const idempotencySeed = `${input.idempotencyKey || ''}-${logicalWorkId}-${actor.type}-${actor.id}`
    const prospect = await this.repository.createLeadProspect({
      tenantId: input.tenantId,
      logicalWorkId,
      name: input.prospectName,
      email: input.email,
      company: input.company,
      signals: input.signals || [],
      status: LeadProspectStatus.QUALIFIED,
      evidenceRefs: evidence.map(e => e.ref),
      idempotencySeed
    } as any)

    return prospect
  }
}