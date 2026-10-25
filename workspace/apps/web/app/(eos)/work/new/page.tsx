// GOLDEN-SPINE ROUTE - RE-ENABLED PER W-BETTER-005 POST-PASS MANDATE
// This route was previously disabled to test FACE detach/reattach: verified that Work identity
// survives FACE removal and can be reconnected without becoming owner of Work.
//
// Fix applied: Resolved import path error by exporting intentUnderstandingService from atomic-composition/index.ts
// Date re-enabled: 2026-09-29
//
/*
Server Component with client-boundary form section - separates session/intent resolution (server) from client-side submission
*/
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NewWorkFormClient } from "./components/NewWorkFormClient";
import {
  WORKSPACE_SESSION_COOKIE,
  decodeWorkspaceSession,
} from "@repo/core-kernel";
import { GlobalNavigation } from "@repo/presentation-ui-system/layouts";
import type { BreadcrumbItem } from "@repo/presentation-ui-system/molecules";
// Import canonical intent understanding service (now exported from atomic-composition)
import { intentUnderstandingService, resolveSemanticIntentFallback } from "@repo/capabilities-atomic-composition";

// Server-side intent retrieval - uses canonical repository primitive (no internal HTTP calls)
async function fetchIntentServerSide(
  intentId: string,
  session: any,
): Promise<any | null> {
  try {
    // Import canonical intent repository (lazy import to avoid circular dependencies)
    const { getIntentRepositoryPostgres, initIdentitySchema } = await import(
      "@repo/capabilities-identity/repositories"
    );

    await initIdentitySchema();
    const intentRepository = getIntentRepositoryPostgres();
    const intentAggregate = await intentRepository.byId(intentId, {
      tenantId: session.tenantId,
      workspaceId: session.workspaceId,
    });

    if (!intentAggregate) return null;

    // Map IntentAggregate to a presentation-compatible object
    return {
      id: intentAggregate.id,
      resolution: intentAggregate.resolution,
      status: intentAggregate.status,
      category: intentAggregate.category,
      createdAt: intentAggregate.createdAt.toISOString(),
      updatedAt: intentAggregate.updatedAt.toISOString(),
    };
  } catch (error) {
    console.error(
      "[SERVER] Error fetching intent via canonical repository:",
      error,
    );
    return null;
  }
}

export default async function NewWorkPage({
  searchParams,
}: {
  searchParams: { intentId?: string; workType?: string };
}) {
  // Server-side session check - identical pattern to MyReality reference
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(WORKSPACE_SESSION_COOKIE);

  if (!sessionCookie?.value) {
    redirect("/");
  }

  let session;
  try {
    session = decodeWorkspaceSession(sessionCookie.value);
  } catch {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  if (!session) {
    cookieStore.delete(WORKSPACE_SESSION_COOKIE);
    redirect("/");
  }

  // Extract intentId from searchParams server-side (optional)
  const { intentId } = searchParams;
  let intent: any | null = null;

  // If intentId exists, fetch intent data (Mode B: Intent-derived Work)
  if (intentId) {
    intent = await fetchIntentServerSide(intentId, session);
    if (!intent) {
      redirect("/intent/new");
    }
  }

  // Work creation callback executed server-side, maintains separation of concerns
  const handleWorkCreation = async (formData: {
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
  }) => {
    "use server";
    try {
      // Import canonical universal expression pipeline (single canonical ingress for ALL reality sources)
      // Implements user's requirement: ALL reality sources use same canonical ingress path
      // Re-enabled for W004-P3-01 real work execution (added to Golden Spine)
      const { createUniversalExpression } = await import(
        "@repo/capabilities-atomic-composition"
      );

      // Combine form data into single raw content for universal expression pipeline (includes BPJS/healthcare fields if present)
      const combinedContent = `Title: ${formData.title}\nObjective: ${
        formData.objective || ""
      }\nDescription: ${formData.description || ""}${formData.project_number ? `\nProject Number: ${formData.project_number}` : ""}${formData.contractor_name ? `\nContractor: ${formData.contractor_name}` : ""}${formData.worker_estimate ? `\nWorker Estimate: ${formData.worker_estimate}` : ""}${formData.project_location ? `\nProject Location: ${formData.project_location}` : ""}${formData.patient_name ? `\nPatient Name: ${formData.patient_name}` : ""}${formData.patient_nik ? `\nPatient NIK: ${formData.patient_nik}` : ""}${formData.appointment_date ? `\nAppointment Date: ${formData.appointment_date}` : ""}${formData.appointment_time ? `\nAppointment Time: ${formData.appointment_time}` : ""}${formData.service_type ? `\nService Type: ${formData.service_type}` : ""}${formData.claim_number ? `\nClaim Number: ${formData.claim_number}` : ""}${formData.claim_date ? `\nClaim Date: ${formData.claim_date}` : ""}${formData.medical_facility_name ? `\nMedical Facility: ${formData.medical_facility_name}` : ""}${formData.diagnosis_code ? `\nDiagnosis Code: ${formData.diagnosis_code}` : ""}${formData.service_category ? `\nService Category: ${formData.service_category}` : ""}`;

      // Determine work type from presence of domain-specific fields (SLICE-006: BPJS Construction, W-INDUSTRY-001-01: Healthcare, W-DOMAIN-002-01: BPJS Kesehatan Claim, ACaaS-COMMERCIAL-001: ACaaS Compliance Check)
      const isBpjsConstruction = !!formData.project_number;
      const isHealthcareAppointment = !!formData.patient_name && !!formData.appointment_date;
      const isBpjsKesehatanClaim = !!formData.claim_number;
      const isAcaasComplianceCheck = !!formData.documentType && !!formData.documentData;
      
      let workType = "general";
      let rawType = "work_request";
      let domainMetadata = {};
      
      if (isBpjsConstruction) {
        workType = "bpjs-construction";
        rawType = "bpjs_construction_work_request";
        domainMetadata = {
          project_number: formData.project_number,
          contractor_name: formData.contractor_name,
          worker_estimate: formData.worker_estimate,
          project_location: formData.project_location,
        };
      } else if (isBpjsKesehatanClaim) {
        workType = "bpjs-kesehatan-claim";
        rawType = "bpjs_kesehatan_claim_request";
        domainMetadata = {
          patient_name: formData.patient_name,
          patient_nik: formData.patient_nik,
          claim_number: formData.claim_number,
          claim_date: formData.claim_date,
          medical_facility_name: formData.medical_facility_name,
          diagnosis_code: formData.diagnosis_code,
          service_category: formData.service_category,
        };
      } else if (isHealthcareAppointment) {
        workType = "healthcare-appointment";
        rawType = "healthcare_appointment_request";
        domainMetadata = {
          patient_name: formData.patient_name,
          patient_nik: formData.patient_nik,
          appointment_date: formData.appointment_date,
          appointment_time: formData.appointment_time,
          service_type: formData.service_type,
        };
      } else if (isAcaasComplianceCheck) {
        workType = "acaas-compliance-check";
        rawType = "acaas_compliance_check_request";
        domainMetadata = {
          documentType: formData.documentType,
          documentData: formData.documentData,
          compliancePolicies: formData.compliancePolicies,
        };
      }

      // Create UniversalIntentInput using human origin (canonical for human intake)
      // Follows EXACT same pattern as external webhooks (ILC/WhatsApp/email) to unify all reality sources
      const universalInput: any = {
        origin: "human",
        actorId: session.actorId,
        raw: {
          type: rawType,
          content: combinedContent,
          // Preserve domain-specific fields as structured metadata for capability routing
          ...domainMetadata
        },
        context: {
          source: "human_intake",
          intake_path: "/work/new",
          linkedIntentId: formData.intentId ? formData.intentId : undefined,
          workType: workType,
        },
      };

      // Execute the FULL universal expression lifecycle pipeline (EOS UNIVERSAL ENTRY)
      // This is the single canonical path for ALL reality sources:
      // Human/External System/Event/Operator/Agent → createUniversalExpression → Understanding → Work
      const universalExpression = await createUniversalExpression(
        universalInput,
        session.tenantId,
        session.workspaceId,
        session.actorId,
      );

      console.log(
        `[SERVER] Universal expression created: ${universalExpression.id}, status: ${universalExpression.status}, workType: ${isBpjsConstruction ? "bpjs-construction" : "general"}`,
      );

      // If work was automatically formed by the pipeline (understanding sufficient and canFormWork=true)
      if (universalExpression.workId) {
        console.log(
          `[SERVER] Work automatically created from universal expression: ${universalExpression.workId}`,
        );
        redirect(`/work/${universalExpression.workId}`);
      }
      // Fallback: if pipeline didn't form work (insufficient understanding or info request), use direct creation
      else {
        console.log(
          "[SERVER] Work not automatically formed, falling back to direct creation",
        );
        const { createWorkCommand } = await import("@capabilities/work-core/implementation/commands/work.commands");
                // Set domainType based on detected work type (W-DOMAIN-002-01: BPJS Kesehatan claim uses healthcare domain)
                const domainType = isBpjsConstruction ? "construction" as const : 
                                  isHealthcareAppointment ? "healthcare" as const : 
                                  isBpjsKesehatanClaim ? "healthcare" as const : 
                                  isAcaasComplianceCheck ? "acaas" as const : 
                                  "legal-case" as const;
                
                // Build base metadata with common fields
                let metadata: any = {};
                if (isBpjsConstruction) {
                  metadata = {
                    project_number: formData.project_number,
                    contractor_name: formData.contractor_name,
                    worker_estimate: formData.worker_estimate,
                    project_location: formData.project_location,
                    workType: "bpjs-construction"
                  };
                } else if (isBpjsKesehatanClaim) {
                  metadata = {
                    patient_name: formData.patient_name,
                    patient_nik: formData.patient_nik,
                    claim_number: formData.claim_number,
                    claim_date: formData.claim_date,
                    medical_facility_name: formData.medical_facility_name,
                    diagnosis_code: formData.diagnosis_code,
                    service_category: formData.service_category,
                    workType: "bpjs-kesehatan-claim"
                  };
                } else if (isAcaasComplianceCheck) {
                  metadata = {
                    documentType: formData.documentType,
                    documentData: formData.documentData,
                    compliancePolicies: formData.compliancePolicies,
                    workType: "acaas-compliance-check"
                  };
                } else if (isHealthcareAppointment) {
                  metadata = {
                    patient_name: formData.patient_name,
                    patient_nik: formData.patient_nik,
                    appointment_date: formData.appointment_date,
                    appointment_time: formData.appointment_time,
                    service_type: formData.service_type,
                    workType: "healthcare-appointment"
                  };
                }

                const createWorkInput = {
                  title: formData.title,
                  description: formData.description || "",
                  linkedIntentId: formData.intentId ? formData.intentId : undefined,
                  domainType: domainType, // SLICE-006/W-INDUSTRY-001-01/W-DOMAIN-002-01/ACaaS-COMMERCIAL-001: Domain-specific detection
                  workMode: "oneshot" as const, // Matches work-core enum values
                  sessionId: sessionCookie.value,
                  tenantId: session.tenantId,
                  workspaceId: session.workspaceId,
                  actorId: session.actorId,
                  // Attach domain-specific metadata as domainSpecificData (required by work-core domain delegation)
                  // ACaaS-COMMERCIAL-001: Pass documentType/documentData/compliancePolicies to work-core for ACaaS processing
                  ...(Object.keys(metadata).length > 0 && { domainSpecificData: metadata, metadata })
                };
        const result = await createWorkCommand.execute(createWorkInput);
        redirect(`/work/${result.workId}`);
      }
    } catch (error) {
      console.error("Error creating work:", error);
      throw new Error(
        "Work could not be created. Your input has not been lost. Please try again.",
      );
    }
  };

  // P2: Breadcrumb navigation items untuk /work/new (UX-SHELL-002) - konsisten dengan semua route lain
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Home", href: "/my-reality" },
    { label: "My Work", href: "/work" },
    {
      label: intent ? "Mulai Pekerjaan dari Kebutuhan" : "Buat Pekerjaan Baru",
      current: true,
    },
  ];
  const userCapabilities = session.userCapabilities || [];

  // Determine workType to pass to client based on intent category or searchParams (W-INDUSTRY-001-01/W-DOMAIN-002-01)
        let clientWorkType: "general" | "bpjs-construction" | "healthcare-appointment" | "bpjs-kesehatan-claim" | "acaas-compliance-check" = "general";
        if (intent?.category?.includes("construction") || searchParams.workType === "bpjs-construction") {
          clientWorkType = "bpjs-construction";
        } else if (
          intent?.category?.includes("healthcare-claim") || 
          intent?.category?.includes("bpjs-kesehatan") || 
          intent?.category?.includes("claim-submission") ||
          searchParams.workType === "bpjs-kesehatan-claim"
        ) {
          clientWorkType = "bpjs-kesehatan-claim";
        } else if (intent?.category?.includes("healthcare") || searchParams.workType === "healthcare-appointment") {
          clientWorkType = "healthcare-appointment";
        } else if (intent?.category?.includes("compliance") || intent?.category?.includes("acaas") || searchParams.workType === "acaas-compliance-check") {
          clientWorkType = "acaas-compliance-check";
        }

  // Pass all server-resolved data to client boundary component
  return (
    <GlobalNavigation
      productId="default"
      userCapabilities={userCapabilities}
      breadcrumbItems={breadcrumbItems}
    >
      <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <NewWorkFormClient
          intent={intent}
          intentId={intentId || null}
          handleWorkCreation={handleWorkCreation}
          workType={clientWorkType}
        />
      </div>
    </GlobalNavigation>
  );
}