import { GenesisRepository } from '../repository/genesis.repository'
import { CreateSolutionArtifactInput, SolutionArtifact, ActorReference, EvidenceReference, SolutionArtifactStatus } from '../contracts/genesis.contracts'

export class CreateSolutionArtifactCommand {
  private repository: GenesisRepository

  constructor(repository: GenesisRepository) {
    this.repository = repository
  }

  async execute(input: CreateSolutionArtifactInput, logicalWorkId: string, actor: ActorReference, evidence: EvidenceReference[]): Promise<SolutionArtifact> {
    const prospect = await this.repository.getLeadProspectById(input.prospectId, input.tenantId)
    if (!prospect || prospect.logicalWorkId !== logicalWorkId) {
      throw new Error('LeadProspect not found or logicalWorkId mismatch')
    }
    const idempotencySeed = `${input.idempotencyKey || ''}-${logicalWorkId}-${actor.type}-${actor.id}`
    const artifact = await this.repository.createSolutionArtifact({
      tenantId: input.tenantId,
      logicalWorkId,
      leadProspectId: input.prospectId,
      title: input.title,
      description: input.description,
      status: SolutionArtifactStatus.PROPOSED,
      evidenceRefs: evidence.map(e => e.ref),
      idempotencySeed
    } as any)
    return artifact
  }
}