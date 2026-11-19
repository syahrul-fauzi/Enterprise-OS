// @ts-nocheck
// Import capabilityRegistry sebagai global yang sama dengan yang digunakan di registerApiPlatformCapability
import { capabilityRegistry, capabilityCommands } from "../../../../packages/core/kernel/src/registry/capability-command-registry.js";
// ACaaS-001-PILOT-003: Import dari observability service yang sudah mendukung canonical metering
import { recordRuntimeInvocation } from "../../../observability/implementation/services/observability.service.js";
// Import canonical 6-boundary validation functions from work-core contracts (corrected path)
import { validateAllBoundaries, type IdentityBoundary, type SemanticBoundary, type AuthorityBoundary, type ExecutionBoundary, type EvidenceBoundary, type PresentationBoundary, type WorkStatus } from "../../../work-core/contracts/work.contracts.js";
// Import ACaaS-001 frozen contracts (sudah terbekukan tidak boleh diubah)
import type { AcaasComplianceInput, AcaasComplianceOutput, AcaasComplianceFinding, AcaasComplianceStatus, AcaasExecutionRecord, AcaasSeverityLevel, acaasSupportedPolicies } from "../contracts/api-platform.contracts.js";

// ACaaS-COMMERCIAL-001: Use local ACaaS-specific evidence utility to avoid work-core dependency chain errors
// Logika tetap sama dengan canonical safeRecordEvidence, hanya diisolasi untuk api-platform saja
import { safeRecordEvidenceACaaS as safeRecordEvidence } from "../utils/acaas-evidence.utils.js";

// Reuse existing ServiceRequestRepository from service-directory (ACAAS-002 Persistence)
// Mengikuti pola environment-based toggle yang sama seperti di service-directory untuk konsistensi
// ACAAS-FIX: Import langsung dari service.repository.js untuk menghindari masalah re-export index.js yang menyebabkan method hilang
import { ServiceRequestRepositoryInMemory, newServiceRequestId } from "../../../service-directory/implementation/repository/service.repository.js";
import { getServiceRequestRepositoryPostgres } from "../../../service-directory/implementation/repository/service-postgres.repository.js";
import { ServiceRequestAggregate, ServiceRequestRepository } from "../../../service-directory/implementation/contracts/service.contracts.js";