import { GenesisRepository, GenesisRepositoryState } from './repository'
import {
  CaptureLeadProspectCommand,
  QualifyLeadProspectCommand,
  CreateSolutionArtifactCommand,
  CreateFinancialAssessmentCommand,
  ApproveFinancialAssessmentCommand,
  CreateConversionAssetCommand,
  AcceptOfferCommand,
  CreateClientAccountCommand
} from './commands';
import {
  CaptureLeadProspectInput,
  QualifyLeadProspectInput,
  CreateSolutionArtifactInput,
  CreateFinancialAssessmentInput,
  ApproveFinancialAssessmentInput,
  CreateConversionAssetInput,
  AcceptOfferInput,
  CreateClientAccountInput,
  LeadProspect,
  SolutionArtifact,
  FinancialAssessment,
  ConversionAsset,
  ClientAccount,
  ActorReference,
  EvidenceReference
} from './contracts';

export class GenesisService {
  private readonly repository: GenesisRepository;
  private readonly captureLeadProspectCommand: CaptureLeadProspectCommand;
  private readonly qualifyLeadProspectCommand: QualifyLeadProspectCommand;
  private readonly createSolutionArtifactCommand: CreateSolutionArtifactCommand;
  private readonly createFinancialAssessmentCommand: CreateFinancialAssessmentCommand;
  private readonly approveFinancialAssessmentCommand: ApproveFinancialAssessmentCommand;
  private readonly createConversionAssetCommand: CreateConversionAssetCommand;
  private readonly acceptOfferCommand: AcceptOfferCommand;
  private readonly createClientAccountCommand: CreateClientAccountCommand;

  constructor() {
    this.repository = new GenesisRepository();
    this.captureLeadProspectCommand = new CaptureLeadProspectCommand(this.repository);
    this.qualifyLeadProspectCommand = new QualifyLeadProspectCommand(this.repository);
    this.createSolutionArtifactCommand = new CreateSolutionArtifactCommand(this.repository);
    this.createFinancialAssessmentCommand = new CreateFinancialAssessmentCommand(this.repository);
    this.approveFinancialAssessmentCommand = new ApproveFinancialAssessmentCommand(this.repository);
    this.createConversionAssetCommand = new CreateConversionAssetCommand(this.repository);
    this.acceptOfferCommand = new AcceptOfferCommand(this.repository);
    this.createClientAccountCommand = new CreateClientAccountCommand(this.repository);
  }

  async captureLeadProspect(
    input: CaptureLeadProspectInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<LeadProspect> {
    return this.captureLeadProspectCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async qualifyLeadProspect(
    input: QualifyLeadProspectInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<LeadProspect> {
    return this.qualifyLeadProspectCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async createSolutionArtifact(
    input: CreateSolutionArtifactInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<SolutionArtifact> {
    return this.createSolutionArtifactCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async createFinancialAssessment(
    input: CreateFinancialAssessmentInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<FinancialAssessment> {
    return this.createFinancialAssessmentCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async approveFinancialAssessment(
    input: ApproveFinancialAssessmentInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<FinancialAssessment> {
    return this.approveFinancialAssessmentCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async createConversionAsset(
    input: CreateConversionAssetInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<ConversionAsset> {
    return this.createConversionAssetCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async acceptOffer(
    input: AcceptOfferInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<ConversionAsset> {
    return this.acceptOfferCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async createClientAccount(
    input: CreateClientAccountInput,
    logicalWorkId: string,
    actor: ActorReference,
    evidence: EvidenceReference[]
  ): Promise<ClientAccount> {
    return this.createClientAccountCommand.execute(input, logicalWorkId, actor, evidence);
  }

  async getLeadProspectById(id: string, tenantId: string): Promise<LeadProspect> {
    return this.repository.getLeadProspectById(id, tenantId);
  }

  async getSolutionArtifactById(id: string, tenantId: string): Promise<SolutionArtifact> {
    return this.repository.getSolutionArtifactById(id, tenantId);
  }

  async getFinancialAssessmentById(id: string, tenantId: string): Promise<FinancialAssessment> {
    return this.repository.getFinancialAssessmentById(id, tenantId);
  }

  async getConversionAssetById(id: string, tenantId: string): Promise<ConversionAsset> {
    return this.repository.getConversionAssetById(id, tenantId);
  }

  async getClientAccountById(id: string, tenantId: string): Promise<ClientAccount> {
    return this.repository.getClientAccountById(id, tenantId);
  }

  exportState(): GenesisRepositoryState {
    return this.repository.exportState();
  }

  importState(state: GenesisRepositoryState): void {
    this.repository.importState(state);
  }
}

export const genesisService = new GenesisService();