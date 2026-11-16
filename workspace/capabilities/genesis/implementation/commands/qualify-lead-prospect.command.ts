import { GenesisRepository } from '../repository/genesis.repository'
import { QualifyLeadProspectInput, LeadProspect, ActorReference, EvidenceReference, LeadProspectStatus } from '../contracts/genesis.contracts'

export class QualifyLeadProspectCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: QualifyLeadProspectInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<LeadProspect> {
    const prospect = await this.repository.getLeadProspectById(input.prospectId, input.tenantId)
    if (!prospect || prospect.logicalWorkId !== logicalWorkId) {
      throw new Error('LeadProspect not found or logicalWorkId mismatch')
    }
    if (prospect.status === LeadProspectStatus.QUALIFIED && prospect.qualificationScore === input.qualificationScore) {
      return prospect
    }
    const updatedProspect = await this.repository.updateLeadProspectStatus(
      input.prospectId,
      LeadProspectStatus.QUALIFIED,
      evidence.map(e => e.ref)
    )
    if (!updatedProspect) {
      throw new Error('Failed to update LeadProspect status')
    }
    updatedProspect.qualificationScore = input.qualificationScore
    return updatedProspect
  }
}