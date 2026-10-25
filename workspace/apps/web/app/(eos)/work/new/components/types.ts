export interface NewWorkFormClientProps {
  intent: {
    id: string;
    resolution: string | null;
    status: string;
    category: string;
    createdAt: string;
    updatedAt: string;
    title: string;
  } | null;
  intentId: string;
  workType?: "general" | "bpjs-construction" | "healthcare-appointment" | "bpjs-kesehatan-claim" | "acaas-compliance-check"; // Support W-INDUSTRY-001/W-DOMAIN-002/ACaaS-COMMERCIAL-001 work forms
  handleWorkCreation: (data: {
    title: string;
    objective: string;
    description: string;
    intentId: string;
    project_number?: string;
    contractor_name?: string;
    worker_estimate?: number;
    project_location?: string;
    patient_name?: string;
    patient_nik?: string;
    appointment_date?: string;
    appointment_time?: string;
    service_type?: string;
    // BPJS Kesehatan Claim specific fields (W-DOMAIN-002-01)
    claim_number?: string;
    claim_date?: string;
    medical_facility_name?: string;
    diagnosis_code?: string;
    service_category?: string;
    // ACaaS Compliance Check specific fields (ACaaS-COMMERCIAL-001)
    documentType?: string;
    documentData?: string;
    compliancePolicies?: string[];
  }) => Promise<{ workId: string } | undefined>;
}