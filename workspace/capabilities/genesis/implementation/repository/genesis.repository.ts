import {
  LeadProspect,
  SolutionArtifact,
  FinancialAssessment,
  ConversionAsset,
  ClientAccount,
  LeadProspectStatus,
  SolutionArtifactStatus,
  FinancialAssessmentStatus,
  OfferStatus,
  ClientAccountStatus
} from '../contracts/genesis.contracts'

export const CURRENT_SCHEMA_VERSION = 1

export interface GenesisRepositoryState {
  schemaVersion: number
  leadProspects: Record<string, LeadProspect>
  solutionArtifacts: Record<string, SolutionArtifact>
  financialAssessments: Record<string, FinancialAssessment>
  conversionAssets: Record<string, ConversionAsset>
  clientAccounts: Record<string, ClientAccount>
}

export class GenesisRepository {
  private leadProspects: Map<string, LeadProspect> = new Map()
  private solutionArtifacts: Map<string, SolutionArtifact> = new Map()
  private financialAssessments: Map<string, FinancialAssessment> = new Map()
  private conversionAssets: Map<string, ConversionAsset> = new Map()
  private clientAccounts: Map<string, ClientAccount> = new Map()

  async createLeadProspect(prospect: Omit<LeadProspect, 'id' | 'createdAt' | 'updatedAt'>, idempotencySeed?: string): Promise<LeadProspect> {
    const seed = idempotencySeed || (prospect as any).idempotencySeed || (prospect as any).idempotencyKey
    const id = this.generateId(seed)
    const existing = this.leadProspects.get(id)
    if (existing) {
      return existing
    }
    const now = new Date().toISOString()
    const newProspect: LeadProspect = {
      ...prospect,
      id,
      createdAt: now,
      updatedAt: now,
      status: LeadProspectStatus.CAPTURED
    }
    this.leadProspects.set(id, newProspect)
    return newProspect
  }

  async updateLeadProspectStatus(id: string, status: LeadProspectStatus, evidenceRefs: string[]): Promise<LeadProspect | null> {
    const prospect = this.leadProspects.get(id)
    if (!prospect) return null
    prospect.status = status
    prospect.updatedAt = new Date().toISOString()
    prospect.evidenceRefs.push(...evidenceRefs)
    return prospect
  }

  async getLeadProspect(id: string, tenantId: string): Promise<LeadProspect | null> {
    const prospect = this.leadProspects.get(id)
    if (!prospect || prospect.tenantId !== tenantId) return null
    return prospect
  }

  async getLeadProspectById(id: string, tenantId: string): Promise<LeadProspect> {
    const prospect = await this.getLeadProspect(id, tenantId)
    if (!prospect) {
      throw new Error('LeadProspect not found or tenant mismatch')
    }
    return prospect
  }

  async createSolutionArtifact(artifact: Omit<SolutionArtifact, 'id' | 'createdAt' | 'updatedAt'>): Promise<SolutionArtifact> {
    const seed = (artifact as any).idempotencySeed || (artifact as any).idempotencyKey
    const id = this.generateId(seed)
    const existing = this.solutionArtifacts.get(id)
    if (existing) {
      return existing
    }
    const now = new Date().toISOString()
    const newArtifact: SolutionArtifact = {
      ...artifact,
      id,
      createdAt: now,
      updatedAt: now,
      status: SolutionArtifactStatus.PROPOSED
    }
    this.solutionArtifacts.set(id, newArtifact)
    return newArtifact
  }

  async updateSolutionArtifactStatus(id: string, status: SolutionArtifactStatus, evidenceRefs: string[]): Promise<SolutionArtifact | null> {
    const artifact = this.solutionArtifacts.get(id)
    if (!artifact) return null
    artifact.status = status
    artifact.updatedAt = new Date().toISOString()
    artifact.evidenceRefs.push(...evidenceRefs)
    return artifact
  }

  async getSolutionArtifact(id: string, tenantId: string): Promise<SolutionArtifact | null> {
    const artifact = this.solutionArtifacts.get(id)
    if (!artifact || artifact.tenantId !== tenantId) return null
    return artifact
  }

  async getSolutionArtifactById(id: string, tenantId: string): Promise<SolutionArtifact> {
    const artifact = await this.getSolutionArtifact(id, tenantId)
    if (!artifact) {
      throw new Error('SolutionArtifact not found or tenant mismatch')
    }
    return artifact
  }

  async createFinancialAssessment(assessment: Omit<FinancialAssessment, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialAssessment> {
    const seed = (assessment as any).idempotencySeed || (assessment as any).idempotencyKey
    const id = this.generateId(seed)
    const existing = this.financialAssessments.get(id)
    if (existing) {
      return existing
    }
    const now = new Date().toISOString()
    const newAssessment: FinancialAssessment = {
      ...assessment,
      id,
      createdAt: now,
      updatedAt: now,
      status: FinancialAssessmentStatus.CREATED
    }
    this.financialAssessments.set(id, newAssessment)
    return newAssessment
  }

  async updateFinancialAssessmentStatus(id: string, status: FinancialAssessmentStatus, updates?: Partial<FinancialAssessment>, evidenceRefs?: string[]): Promise<FinancialAssessment | null> {
    const assessment = this.financialAssessments.get(id)
    if (!assessment) return null
    assessment.status = status
    assessment.updatedAt = new Date().toISOString()
    if (updates) {
      Object.assign(assessment, updates)
    }
    if (evidenceRefs) {
      assessment.evidenceRefs.push(...evidenceRefs)
    }
    return assessment
  }

  async getFinancialAssessment(id: string, tenantId: string): Promise<FinancialAssessment | null> {
    const assessment = this.financialAssessments.get(id)
    if (!assessment || assessment.tenantId !== tenantId) return null
    return assessment
  }

  async getFinancialAssessmentById(id: string, tenantId: string): Promise<FinancialAssessment> {
    const assessment = await this.getFinancialAssessment(id, tenantId)
    if (!assessment) {
      throw new Error('FinancialAssessment not found or tenant mismatch')
    }
    return assessment
  }

  async createConversionAsset(asset: Omit<ConversionAsset, 'id' | 'createdAt' | 'updatedAt'>): Promise<ConversionAsset> {
    const seed = (asset as any).idempotencySeed || (asset as any).idempotencyKey
    const id = this.generateId(seed)
    const existing = this.conversionAssets.get(id)
    if (existing) {
      return existing
    }
    const now = new Date().toISOString()
    const newAsset: ConversionAsset = {
      ...asset,
      id,
      createdAt: now,
      updatedAt: now,
      status: OfferStatus.CREATED
    }
    this.conversionAssets.set(id, newAsset)
    return newAsset
  }

  async updateConversionAssetStatus(id: string, status: OfferStatus, evidenceRefs: string[]): Promise<ConversionAsset | null> {
    const asset = this.conversionAssets.get(id)
    if (!asset) return null
    asset.status = status
    asset.updatedAt = new Date().toISOString()
    asset.evidenceRefs.push(...evidenceRefs)
    return asset
  }

  async getConversionAsset(id: string, tenantId: string): Promise<ConversionAsset | null> {
    const asset = this.conversionAssets.get(id)
    if (!asset || asset.tenantId !== tenantId) return null
    return asset
  }

  async getConversionAssetById(id: string, tenantId: string): Promise<ConversionAsset> {
    const asset = await this.getConversionAsset(id, tenantId)
    if (!asset) {
      throw new Error('ConversionAsset not found or tenant mismatch')
    }
    return asset
  }

  async createClientAccount(account: Omit<ClientAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<ClientAccount> {
    const seed = (account as any).idempotencySeed || (account as any).idempotencyKey
    const id = this.generateId(seed)
    const existing = this.clientAccounts.get(id)
    if (existing) {
      return existing
    }
    const now = new Date().toISOString()
    const newAccount: ClientAccount = {
      ...account,
      id,
      createdAt: now,
      updatedAt: now,
      status: ClientAccountStatus.CREATED
    }
    this.clientAccounts.set(id, newAccount)
    return newAccount
  }

  async updateClientAccountStatus(id: string, status: ClientAccountStatus, evidenceRefs: string[]): Promise<ClientAccount | null> {
    const account = this.clientAccounts.get(id)
    if (!account) return null
    account.status = status
    account.updatedAt = new Date().toISOString()
    account.evidenceRefs.push(...evidenceRefs)
    return account
  }

  async getClientAccount(id: string, tenantId: string): Promise<ClientAccount | null> {
    const account = this.clientAccounts.get(id)
    if (!account || account.tenantId !== tenantId) return null
    return account
  }

  async getClientAccountById(id: string, tenantId: string): Promise<ClientAccount> {
    const account = await this.getClientAccount(id, tenantId)
    if (!account) {
      throw new Error('ClientAccount not found or tenant mismatch')
    }
    return account
  }

  exportState(): GenesisRepositoryState {
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      leadProspects: Object.fromEntries(this.leadProspects),
      solutionArtifacts: Object.fromEntries(this.solutionArtifacts),
      financialAssessments: Object.fromEntries(this.financialAssessments),
      conversionAssets: Object.fromEntries(this.conversionAssets),
      clientAccounts: Object.fromEntries(this.clientAccounts)
    }
  }

  importState(state: GenesisRepositoryState | Omit<GenesisRepositoryState, 'schemaVersion'>): void {
    const version = (state as GenesisRepositoryState).schemaVersion || 1
    
    if (version > CURRENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported schema version: ${version}. Current schema version: ${CURRENT_SCHEMA_VERSION}`)
    }
    
    const existingLeadProspects = this.leadProspects
    const existingSolutionArtifacts = this.solutionArtifacts
    const existingFinancialAssessments = this.financialAssessments
    const existingConversionAssets = this.conversionAssets
    const existingClientAccounts = this.clientAccounts
    
    try {
      const newLeadProspects = new Map(Object.entries(state.leadProspects))
      const newSolutionArtifacts = new Map(Object.entries(state.solutionArtifacts))
      const newFinancialAssessments = new Map(Object.entries(state.financialAssessments))
      const newConversionAssets = new Map(Object.entries(state.conversionAssets))
      const newClientAccounts = new Map(Object.entries(state.clientAccounts))
      
      this.leadProspects = newLeadProspects
      this.solutionArtifacts = newSolutionArtifacts
      this.financialAssessments = newFinancialAssessments
      this.conversionAssets = newConversionAssets
      this.clientAccounts = newClientAccounts
    } catch (error) {
      this.leadProspects = existingLeadProspects
      this.solutionArtifacts = existingSolutionArtifacts
      this.financialAssessments = existingFinancialAssessments
      this.conversionAssets = existingConversionAssets
      this.clientAccounts = existingClientAccounts
      throw error
    }
  }

  private generateId(seed?: string): string {
    if (seed) {
      let hash = 0
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
      }
      return `genesis-${Math.abs(hash).toString(36)}`
    }
    return `genesis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}