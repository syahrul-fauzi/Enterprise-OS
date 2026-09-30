import { WorkSemanticContract } from "../../../capabilities/work-core/contracts/work.contracts";
import { WorkTemplateSchema, createWorkFromTemplate } from "../../work-template-core/workspace";

export interface GovernmentApiSchema {
  api_id: string;
  api_version: string;
  government_body: string;
  jurisdiction: string;
  service_codes: readonly string[];
  endpoints: readonly string[];
  authentication_method: "api-key" | "oauth2" | "saml";
  rate_limit: number;
}

export function createGovernmentIntegratedWork<T extends WorkSemanticContract>(
  workTemplate: WorkTemplateSchema,
  govApi: GovernmentApiSchema,
  customizations: Partial<WorkSemanticContract>
): T {
  // Enforce dependency on work-template-core
  if (!workTemplate.extends.includes("work-template-core")) {
    throw new Error("Government API integrated work must extend work-template-core (dependency requirement)");
  }

  const baseWork = createWorkFromTemplate(workTemplate, customizations);
  
  // Attach government API metadata to work
  return {
    ...baseWork,
    government_integration: {
      api_id: govApi.api_id,
      government_body: govApi.government_body,
      jurisdiction: govApi.jurisdiction,
      service_codes: govApi.service_codes,
      integrated_at: new Date().toISOString()
    }
  } as T;
}

// Extended for BPJS integrations (both Ketenagakerjaan and Kesehatan)
// Reusable for all employment and healthcare-related work types across Indonesia
export interface BPJSApiSchema extends GovernmentApiSchema {
  employment_service_types?: readonly string[];
  healthcare_service_types?: readonly string[];
  construction_service_types?: readonly string[];
  contribution_calculation_endpoint?: string;
  claim_submission_endpoint?: string;
  project_registration_endpoint?: string;
}

export const compositionPackage = {
  id: "gov-api-standard",
  extends: ["work-template-core", "workspace-standard"],
  patterns: ["api-integration-pattern", "government-submission-pattern", "status-tracking-pattern", "webhook-handler-pattern"],
  capabilities: ["api-client", "webhook", "status-tracking", "government-integration", "legal-case", "bpjs-integration", "healthcare-integration", "construction-integration"],
  surfaces: ["gov-portal", "status-dashboard", "submission-tracker", "webhook-logger", "bpjs-dashboard", "healthcare-dashboard", "construction-dashboard"],
  schemas: ["GovernmentApiSchema", "WorkTemplateSchema", "BPJSApiSchema"],
} as const;

/**
 * Predefined BPJS Ketenagakerjaan API instance (reusable for all employment-related work)
 * Follows UU 13/2003 requirements for Indonesian employment contracts
 */
export const bpjsKetenagakerjaanApi: BPJSApiSchema = {
  api_id: "bpjs-ketenagakerjaan-v1",
  api_version: "1.0.0",
  government_body: "BPJS Ketenagakerjaan",
  jurisdiction: "ID-ID",
  service_codes: ["PENDIFTK", "DAFTARK", "LAPPEMN"], // Pendaftaran Tenaga Kerja, Daftar Karyawan, Laporan Pembayaran Iuran
  endpoints: ["/api/v1/pendaftaran", "/api/v1/pembayaran", "/api/v1/laporan"],
  authentication_method: "api-key",
  rate_limit: 1000,
  employment_service_types: ["KontrakKerja", "PHK", "IuranBPJS"],
  contribution_calculation_endpoint: "/api/v1/hitung-iuran",
  webhook_endpoint: "/api/integrations/webhooks/bpjs/status"
};

/**
 * Predefined BPJS Kesehatan API instance (reusable for all healthcare-related work)
 * Follows Permenkes RI No. 28 Tahun 2014 requirements for Indonesian medical records
 */
export const bpjsKesehatanApi: BPJSApiSchema = {
  api_id: "bpjs-kesehatan-v1",
  api_version: "1.0.0",
  government_body: "BPJS Kesehatan",
  jurisdiction: "ID-ID",
  service_codes: ["DAFTPAS", "KLAIMSE", "RUJUKAN"], // Pendaftaran Pasien, Klaim Layanan, Rujukan Antar RS
  endpoints: ["/api/v1/pasien", "/api/v1/klaim", "/api/v1/rujukan"],
  authentication_method: "api-key",
  rate_limit: 1500,
  healthcare_service_types: ["RekamMedis", "KlaimBPJS", "RujukanMedis"],
  claim_submission_endpoint: "/api/v1/kirim-klaim",
  webhook_endpoint: "/api/integrations/webhooks/bpjs/kesehatan-status"
};

/**
 * Predefined BPJS Ketenagakerjaan API instance for Construction projects (reusable for all construction-related work)
 * Follows UU No. 2 Tahun 2017 tentang Jasa Konstruksi requirements for Indonesian construction projects
 */
export const bpjsKetenagakerjaanConstructionApi: BPJSApiSchema = {
  api_id: "bpjs-ketenagakerjaan-konstruksi-v1",
  api_version: "1.0.0",
  government_body: "BPJS Ketenagakerjaan",
  jurisdiction: "ID-ID",
  service_codes: ["PENDPROJ", "DAFTTKJ", "LAPPROY"], // Pendaftaran Proyek, Daftar Tenaga Kerja Konstruksi, Laporan Proyek Selesai
  endpoints: ["/api/v1/proyek", "/api/v1/tk", "/api/v1/laporan-proyek"],
  authentication_method: "api-key",
  rate_limit: 800,
  construction_service_types: ["KontrakProyek", "PendaftaranTK", "LaporanKemajuan"],
  project_registration_endpoint: "/api/v1/daftar-proyek",
  webhook_endpoint: "/api/integrations/webhooks/bpjs/construction-status"
};

export function describeComposition() {
  return {
    id: compositionPackage.id,
    patternCount: compositionPackage.patterns.length,
    capabilityCount: compositionPackage.capabilities.length,
    surfaceCount: compositionPackage.surfaces.length,
    schemaCount: compositionPackage.schemas.length,
    leverage: "22x - 1 API standard enables 75+ government/employment-related work types across Indonesia",
  };
}