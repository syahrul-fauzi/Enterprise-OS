export interface EvidenceSource<TRequest, TArtifact> {
  read(request: TRequest): TArtifact;
}
