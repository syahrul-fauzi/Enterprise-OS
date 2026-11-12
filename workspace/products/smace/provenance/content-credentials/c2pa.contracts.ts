// C2PA Standard Contracts for SMACE - implements C2PA specification for content provenance
// Reused across all SMACE provenance modules to ensure manifest interoperability
// Complies with C2PA 1.0 specification: https://c2pa.org/specifications/specifications/1.0/specs/index.html

export interface C2PAIngredient {
  ingredient_id: string;
  title: string;
  format: string;
  document_id: string;
  relationship: string;
  origin: string;
  thumbnail?: string;
}

export interface C2PAAssertion {
  assertion_id: string;
  label: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface C2PASignatureInfo {
  issuer: string;
  timestamp: string;
  certificate_chain: string[];
  signature: string;
  signature_algorithm: string;
}

export interface C2PAManifest {
  manifest_id: string;
  claim_generator: string;
  claim_generator_hint: string;
  ingredients: C2PAIngredient[];
  assertions: C2PAAssertion[];
  signature_info: C2PASignatureInfo;
  version: string;
  created_at: string;
  title?: string;
  status?: "draft" | "finalized" | "verified";
}

// SMACE-specific C2PA extensions for EOS integration
export interface SMACEC2PAManifest extends C2PAManifest {
  eos_work_id: string;
  eos_tenant_id: string;
  eos_evidence_chain_hash: string;
  smace_brief_id: string;
  smace_asset_count: number;
}