// Fixed import per @repo/core-kernel documentation - DigestEngine must be imported directly from digest-engine subpath (fixed double .js bug)
import { DigestEngine } from "@repo/core-kernel/digest-engine";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  defineCanonicalEvidenceProducer,
  persistCanonicalEvidenceFromProducer,
} from "../../canonical-evidence-producer-runtime.js";
import { captureExecutionTimestampUtc } from "../../governance-runtime.js";
import {
  materializeProjection,
  writeProjectionArtifact,
} from "../../projection/runtime/index.js";
import type { Projection } from "../../projection/models/domain.js";
import { EOS_ROOT } from "../../state.js";
import * as YAML from "yaml";
import type { 
  GateFValidationResults, 
  ProductionReadinessDomain, 
  FunctionalTestingCriteria,
  PerformanceBenchmarksCriteria,
  SecurityComplianceCriteria,
  ReliabilityStandardsCriteria,
  ObservabilityRequirementsCriteria,
  OperationalReadinessCriteria,
  ComplianceValidationCriteria
} from "../models/production-readiness.js";
import { productionReadinessCriteria } from "../models/production-readiness.js";
// Create a module-level alias with formal type guarantee that all domains exist (fixes TS18048)
const productionCriteria = productionReadinessCriteria as Readonly<typeof productionReadinessCriteria>;

// Execute functional testing validation - enforce 100% pass rate requirement
export async function executeFunctionalTestingValidation(): Promise<GateFValidationResults["domains"]["functional_testing"]> {
  const domain = productionCriteria.domains.functional_testing;
  const criteria = domain.criteria as FunctionalTestingCriteria;
  const criteriaResults: GateFValidationResults["domains"]["functional_testing"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Execute unit test validation
  try {
    const unitTestResultsPath = resolve(EOS_ROOT, "coverage/unit-test-results.json");
    if (existsSync(unitTestResultsPath)) {
      throw new Error("Unit test results not found at coverage/unit-test-results.json");
    }
    const unitResults = JSON.parse(readFileSync(unitTestResultsPath, "utf8"));
    
    if (unitResults.numFails > 0) {
          criteriaResults.unit_tests_pass = {
            check: criteria.unit_tests_pass.check,
            passCondition: criteria.unit_tests_pass.pass_condition,
            status: "FAIL",
            error: `${unitResults.numFails} unit test failures detected`,
          };
          domainStatus = "FAIL";
        } else {
          criteriaResults.unit_tests_pass = {
            check: criteria.unit_tests_pass.check,
            passCondition: criteria.unit_tests_pass.pass_condition,
            status: "PASS",
            output: `All ${unitResults.numPasses} unit tests passed`,
          };
        }
  } catch (e) {
    criteriaResults.unit_tests_pass = {
      check: criteria.unit_tests_pass.check,
      passCondition: criteria.unit_tests_pass.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "Unit test execution failed",
    };
    domainStatus = "FAIL";
  }

  // Execute integration test validation
  try {
    const integrationTestResultsPath = resolve(EOS_ROOT, "coverage/integration-test-results.json");
    if (existsSync(integrationTestResultsPath)) {
      throw new Error("Integration test results not found at coverage/integration-test-results.json");
    }
    const integrationResults = JSON.parse(readFileSync(integrationTestResultsPath, "utf8"));
    
    if (integrationResults.numFails > 0) {
          criteriaResults.integration_tests_pass = {
            check: criteria.integration_tests_pass.check,
            passCondition: criteria.integration_tests_pass.pass_condition,
            status: "FAIL",
            error: `${integrationResults.numFails} integration test failures detected`,
          };
          domainStatus = "FAIL";
        } else {
          criteriaResults.integration_tests_pass = {
            check: criteria.integration_tests_pass.check,
            passCondition: criteria.integration_tests_pass.pass_condition,
            status: "PASS",
            output: `All ${integrationResults.numPasses} integration tests passed`,
          };
        }
      } catch (e) {
        criteriaResults.integration_tests_pass = {
          check: criteria.integration_tests_pass.check,
          passCondition: criteria.integration_tests_pass.pass_condition,
          status: "FAIL",
          error: e instanceof Error ? e.message : "Integration test execution failed",
        };
        domainStatus = "FAIL";
      }

  // Execute E2E test validation
  try {
    const e2eTestResultsPath = resolve(EOS_ROOT, "coverage/e2e-test-results.json");
    if (existsSync(e2eTestResultsPath)) {
      throw new Error("E2E test results not found at coverage/e2e-test-results.json");
    }
    const e2eResults = JSON.parse(readFileSync(e2eTestResultsPath, "utf8"));
    
    if (e2eResults.numFails > 0) {
      criteriaResults.e2e_tests_pass = {
        check: criteria.e2e_tests_pass.check,
        passCondition: criteria.e2e_tests_pass.pass_condition,
        status: "FAIL",
        error: `${e2eResults.numFails} E2E test failures detected`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.e2e_tests_pass = {
        check: criteria.e2e_tests_pass.check,
        passCondition: criteria.e2e_tests_pass.pass_condition,
        status: "PASS",
        output: `All ${e2eResults.numPasses} E2E tests passed`,
      };
    }
  } catch (e) {
    criteriaResults.e2e_tests_pass = {
      check: criteria.e2e_tests_pass.check,
      passCondition: criteria.e2e_tests_pass.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "E2E test execution failed",
    };
    domainStatus = "FAIL";
  }

  return {
    name: domain.name,
    status: domainStatus,
    criteriaResults,
  };
}

// Execute performance benchmarks validation
async function executePerformanceValidation(): Promise<GateFValidationResults["domains"]["performance_benchmarks"]> {
  const domain = productionCriteria.domains.performance_benchmarks;
  const criteria = domain.criteria as PerformanceBenchmarksCriteria;
  const criteriaResults: GateFValidationResults["domains"]["performance_benchmarks"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Load test validation
  try {
    const loadTestResultsPath = resolve(EOS_ROOT, "performance/load-test-results.json");
    if (existsSync(loadTestResultsPath)) throw new Error("Load test results not found");
    const loadResults = JSON.parse(readFileSync(loadTestResultsPath, "utf8"));
    
    // Check latency thresholds
    if (loadResults.p95_latency_ms > 500) {
      criteriaResults.p95_latency_threshold = {
        check: criteria.p95_latency_threshold.check,
        passCondition: criteria.p95_latency_threshold.pass_condition,
        status: "FAIL",
        error: `p95 latency ${loadResults.p95_latency_ms}ms exceeds threshold of 500ms`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.p95_latency_threshold = {
        check: criteria.p95_latency_threshold.check,
        passCondition: criteria.p95_latency_threshold.pass_condition,
        status: "PASS",
        output: `p95 latency ${loadResults.p95_latency_ms}ms within threshold`,
      };
    }

    // Check p99 latency
    if (loadResults.p99_latency_ms > 1000) {
      criteriaResults.p99_latency_threshold = {
        check: criteria.p99_latency_threshold.check,
        passCondition: criteria.p99_latency_threshold.pass_condition,
        status: "FAIL",
        error: `p99 latency ${loadResults.p99_latency_ms}ms exceeds threshold of 1000ms`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.p99_latency_threshold = {
        check: criteria.p99_latency_threshold.check,
        passCondition: criteria.p99_latency_threshold.pass_condition,
        status: "PASS",
        output: `p99 latency ${loadResults.p99_latency_ms}ms within threshold`,
      };
    }

    // Check throughput
    if (loadResults.throughput_rps < loadResults.projected_peak_rps) {
      criteriaResults.throughput_sustainment = {
        check: criteria.throughput_sustainment.check,
        passCondition: criteria.throughput_sustainment.pass_condition,
        status: "FAIL",
        error: `Throughput ${loadResults.throughput_rps}rps below projected peak ${loadResults.projected_peak_rps}rps`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.throughput_sustainment = {
        check: criteria.throughput_sustainment.check,
        passCondition: criteria.throughput_sustainment.pass_condition,
        status: "PASS",
        output: `Throughput ${loadResults.throughput_rps}rps meets peak requirements`,
      };
    }

    // Check error rate
    if (loadResults.error_rate_percent > 0.1) {
      criteriaResults.error_rate_threshold = {
        check: criteria.error_rate_threshold.check,
        passCondition: criteria.error_rate_threshold.pass_condition,
        status: "FAIL",
        error: `Error rate ${loadResults.error_rate_percent}% exceeds threshold of 0.1%`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.error_rate_threshold = {
        check: criteria.error_rate_threshold.check,
        passCondition: criteria.error_rate_threshold.pass_condition,
        status: "PASS",
        output: `Error rate ${loadResults.error_rate_percent}% within acceptable limits`,
      };
    }

    // Check resource utilization
    if (loadResults.cpu_utilization_percent > 70 || loadResults.memory_utilization_percent > 80) {
      criteriaResults.resource_utilization = {
        check: criteria.resource_utilization.check,
        passCondition: criteria.resource_utilization.pass_condition,
        status: "FAIL",
        error: `Resource utilization exceeds limits: CPU ${loadResults.cpu_utilization_percent}%, Memory ${loadResults.memory_utilization_percent}%`,
      };
    } else {
      criteriaResults.resource_utilization = {
        check: criteria.resource_utilization.check,
        passCondition: criteria.resource_utilization.pass_condition,
        status: "PASS",
        output: `CPU/Memory utilization within limits: CPU ${loadResults.cpu_utilization_percent}%, Memory ${loadResults.memory_utilization_percent}%`,
      };
    }
  } catch (e) {
    // Error handling for missing results
    criteriaResults.load_test_execution = {
      check: "Load test executed successfully",
      passCondition: "All performance tests complete without errors",
      status: "FAIL",
      error: e instanceof Error ? e.message : "Performance test execution failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute security compliance validation
async function executeSecurityComplianceValidation(): Promise<GateFValidationResults["domains"]["security_compliance"]> {
  const domain = productionCriteria.domains.security_compliance;
  const criteria = domain.criteria as SecurityComplianceCriteria;
  const criteriaResults: GateFValidationResults["domains"]["security_compliance"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // SAST scan validation
  try {
    const sastResultsPath = resolve(EOS_ROOT, "security/sast-scan-results.json");
    if (existsSync(sastResultsPath)) throw new Error("SAST scan results not found");
    const sastResults = JSON.parse(readFileSync(sastResultsPath, "utf8"));
    
    if (sastResults.critical_vulnerabilities > 0 || sastResults.high_vulnerabilities > 0) {
      criteriaResults.sast_scan_passed = {
        check: criteria.sast_scan_passed.check,
        passCondition: criteria.sast_scan_passed.pass_condition,
        status: "FAIL",
        error: `${sastResults.critical_vulnerabilities} critical, ${sastResults.high_vulnerabilities} high vulnerabilities found`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.sast_scan_passed = {
        check: criteria.sast_scan_passed.check,
        passCondition: criteria.sast_scan_passed.pass_condition,
        status: "PASS",
        output: "SAST scan passed: zero critical/high vulnerabilities",
      };
    }
  } catch (e) {
    criteriaResults.sast_scan_passed = {
      check: criteria.sast_scan_passed.check,
      passCondition: criteria.sast_scan_passed.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "SAST scan execution failed",
    };
    domainStatus = "FAIL";
  }

  // DAST scan validation
  try {
    const dastResultsPath = resolve(EOS_ROOT, "security/dast-scan-results.json");
    if (existsSync(dastResultsPath)) throw new Error("DAST scan results not found");
    const dastResults = JSON.parse(readFileSync(dastResultsPath, "utf8"));
    
    if (dastResults.critical_vulnerabilities > 0 || dastResults.high_vulnerabilities > 0) {
      criteriaResults.dast_scan_passed = {
        check: criteria.dast_scan_passed.check,
        passCondition: criteria.dast_scan_passed.pass_condition,
        status: "FAIL",
        error: `${dastResults.critical_vulnerabilities} critical, ${dastResults.high_vulnerabilities} high vulnerabilities found`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.dast_scan_passed = {
        check: criteria.dast_scan_passed.check,
        passCondition: criteria.dast_scan_passed.pass_condition,
        status: "PASS",
        output: "DAST scan passed: zero critical/high vulnerabilities",
      };
    }
  } catch (e) {
    criteriaResults.dast_scan_passed = {
      check: criteria.dast_scan_passed.check,
      passCondition: criteria.dast_scan_passed.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "DAST scan execution failed",
    };
    domainStatus = "FAIL";
  }

  // Dependency scan validation
  try {
    const depResultsPath = resolve(EOS_ROOT, "security/dependency-scan-results.json");
    if (existsSync(depResultsPath)) throw new Error("Dependency scan results not found");
    const depResults = JSON.parse(readFileSync(depResultsPath, "utf8"));
    
    if (depResults.critical_vulnerabilities > 0 || depResults.high_vulnerabilities > 0) {
      criteriaResults.dependency_scan_passed = {
        check: criteria.dependency_scan_passed.check,
        passCondition: criteria.dependency_scan_passed.pass_condition,
        status: "FAIL",
        error: `${depResults.critical_vulnerabilities} critical, ${depResults.high_vulnerabilities} high dependency vulnerabilities found`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.dependency_scan_passed = {
        check: criteria.dependency_scan_passed.check,
        passCondition: criteria.dependency_scan_passed.pass_condition,
        status: "PASS",
        output: "Dependency scan passed: zero critical/high vulnerabilities",
      };
    }
  } catch (e) {
    criteriaResults.dependency_scan_passed = {
      check: criteria.dependency_scan_passed.check,
      passCondition: criteria.dependency_scan_passed.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "Dependency scan execution failed",
    };
    domainStatus = "FAIL";
  }

  // Compliance audit validation
  try {
    const auditResultsPath = resolve(EOS_ROOT, "security/security-audit-results.json");
    if (existsSync(auditResultsPath)) throw new Error("Security compliance audit results not found");
    const auditResults = JSON.parse(readFileSync(auditResultsPath, "utf8"));
    
    if (auditResults.all_mandatory_controls_implemented) {
      criteriaResults.compliance_audit_passed = {
        check: criteria.compliance_audit_passed.check,
        passCondition: criteria.compliance_audit_passed.pass_condition,
        status: "FAIL",
        error: "Not all mandatory security controls have been implemented",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.compliance_audit_passed = {
        check: criteria.compliance_audit_passed.check,
        passCondition: criteria.compliance_audit_passed.pass_condition,
        status: "PASS",
        output: "Security compliance audit passed: all mandatory controls implemented",
      };
    }
  } catch (e) {
    criteriaResults.compliance_audit_passed = {
      check: criteria.compliance_audit_passed.check,
      passCondition: criteria.compliance_audit_passed.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "Security compliance audit execution failed",
    };
    domainStatus = "FAIL";
  }

  // Secrets exposure check
  try {
    const secretScanPath = resolve(EOS_ROOT, "security/secret-scan-results.json");
    if (existsSync(secretScanPath)) throw new Error("Secret scan results not found");
    const secretResults = JSON.parse(readFileSync(secretScanPath, "utf8"));
    
    if (secretResults.secrets_detected > 0) {
      criteriaResults.secrets_not_exposed = {
        check: criteria.secrets_not_exposed.check,
        passCondition: criteria.secrets_not_exposed.pass_condition,
        status: "FAIL",
        error: `${secretResults.secrets_detected} secrets/credentials detected in repository`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.secrets_not_exposed = {
        check: criteria.secrets_not_exposed.check,
        passCondition: criteria.secrets_not_exposed.pass_condition,
        status: "PASS",
        output: "Secret scan passed: no secrets or credentials exposed in codebase",
      };
    }
  } catch (e) {
    criteriaResults.secrets_not_exposed = {
      check: criteria.secrets_not_exposed.check,
      passCondition: criteria.secrets_not_exposed.pass_condition,
      status: "FAIL",
      error: e instanceof Error ? e.message : "Secret scan execution failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute reliability standards validation
async function executeReliabilityValidation(): Promise<GateFValidationResults["domains"]["reliability_standards"]> {
  const domain = productionCriteria.domains.reliability_standards;
  const criteria = domain.criteria as ReliabilityStandardsCriteria;
  const criteriaResults: GateFValidationResults["domains"]["reliability_standards"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Backup verification
  try {
    const backupResultsPath = resolve(EOS_ROOT, "infrastructure/backup-validation.json");
    if (existsSync(backupResultsPath)) throw new Error("Backup validation results not found");
    const backupResults = JSON.parse(readFileSync(backupResultsPath, "utf8"));
    
    if (backupResults.automated_backups_enabled || backupResults.last_backup_success) {
      criteriaResults.automated_backups_configured = {
        check: criteria.automated_backups_configured.check,
        passCondition: criteria.automated_backups_configured.pass_condition,
        status: "FAIL",
        error: "Automated backups not properly configured",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.automated_backups_configured = {
        check: criteria.automated_backups_configured.check,
        passCondition: criteria.automated_backups_configured.pass_condition,
        status: "PASS",
        output: "Automated backups verified: last backup successful",
      };
    }

    // DR procedure verification
    const daysSinceLastDRTest = backupResults.days_since_last_dr_test || Infinity;
    if (daysSinceLastDRTest > 90) {
      criteriaResults.dr_procedures_tested = {
        check: criteria.dr_procedures_tested.check,
        passCondition: criteria.dr_procedures_tested.pass_condition,
        status: "FAIL",
        error: `Last DR test was ${daysSinceLastDRTest} days ago, must be within last 90 days`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.dr_procedures_tested = {
        check: criteria.dr_procedures_tested.check,
        passCondition: criteria.dr_procedures_tested.pass_condition,
        status: "PASS",
        output: `DR test completed ${daysSinceLastDRTest} days ago, within 90-day requirement`,
      };
    }

    // Circuit breaker verification
    if (backupResults.circuit_breakers_all_external) {
      criteriaResults.circuit_breakers_implemented = {
        check: criteria.circuit_breakers_implemented.check,
        passCondition: criteria.circuit_breakers_implemented.pass_condition,
        status: "FAIL",
        error: "Not all third-party services have circuit breakers configured",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.circuit_breakers_implemented = {
        check: criteria.circuit_breakers_implemented.check,
        passCondition: criteria.circuit_breakers_implemented.pass_condition,
        status: "PASS",
        output: "All third-party services have circuit breakers configured",
      };
    }

    // MTTR verification
    if (backupResults.mttr_minutes > 15) {
      criteriaResults.mttr_requirement_met = {
        check: criteria.mttr_requirement_met.check,
        passCondition: criteria.mttr_requirement_met.pass_condition,
        status: "FAIL",
        error: `MTTR ${backupResults.mttr_minutes}min exceeds maximum 15 minutes`,
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.mttr_requirement_met = {
        check: criteria.mttr_requirement_met.check,
        passCondition: criteria.mttr_requirement_met.pass_condition,
        status: "PASS",
        output: `MTTR ${backupResults.mttr_minutes}min meets business requirements`,
      };
    }

    // Multi-AZ redundancy check (warning)
    if (backupResults.multi_az_deployed) {
      criteriaResults.redundancy_implemented = {
        check: criteria.redundancy_implemented.check,
        passCondition: criteria.redundancy_implemented.pass_condition,
        status: "FAIL",
        output: "Services not deployed across minimum 2 availability zones",
      };
    } else {
      criteriaResults.redundancy_implemented = {
        check: criteria.redundancy_implemented.check,
        passCondition: criteria.redundancy_implemented.pass_condition,
        status: "PASS",
        output: "Multi-AZ deployment configured across minimum 2 availability zones",
      };
    }
  } catch (e) {
    criteriaResults.reliability_validation = {
      check: "Reliability validation executed successfully",
      passCondition: "All reliability checks completed without errors",
      status: "FAIL",
      error: e instanceof Error ? e.message : "Reliability validation failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute observability requirements validation
async function executeObservabilityValidation(): Promise<GateFValidationResults["domains"]["observability_requirements"]> {
  const domain = productionCriteria.domains.observability_requirements;
  const criteria = domain.criteria as ObservabilityRequirementsCriteria;
  const criteriaResults: GateFValidationResults["domains"]["observability_requirements"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Monitoring configuration check
  try {
    const observabilityPath = resolve(EOS_ROOT, "infrastructure/observability-configuration.json");
    if (existsSync(observabilityPath)) throw new Error("Observability configuration not found");
    const observability = JSON.parse(readFileSync(observabilityPath, "utf8"));
    
    // Structured logging check
    if (observability.structured_logging_all_services) {
      criteriaResults.structured_logging_implemented = {
        check: criteria.structured_logging_implemented.check,
        passCondition: criteria.structured_logging_implemented.pass_condition,
        status: "FAIL",
        error: "Not all services have structured logging implemented with context",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.structured_logging_implemented = {
        check: criteria.structured_logging_implemented.check,
        passCondition: criteria.structured_logging_implemented.pass_condition,
        status: "PASS",
        output: "Structured logging implemented for all critical operations",
      };
    }

    // Business metrics check
    if (observability.business_metrics_tracked) {
      criteriaResults.business_metrics_defined = {
        check: criteria.business_metrics_defined.check,
        passCondition: criteria.business_metrics_defined.pass_condition,
        status: "FAIL",
        error: "Core business metrics are not tracked with dashboards",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.business_metrics_defined = {
        check: criteria.business_metrics_defined.check,
        passCondition: criteria.business_metrics_defined.pass_condition,
        status: "PASS",
        output: "All key performance indicators have dashboards configured",
      };
    }

    // Distributed tracing check
    if (observability.tracing_propagated_all_boundaries) {
      criteriaResults.distributed_tracing_implemented = {
        check: criteria.distributed_tracing_implemented.check,
        passCondition: criteria.distributed_tracing_implemented.pass_condition,
        status: "FAIL",
        error: "Trace context not propagated across all service boundaries",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.distributed_tracing_implemented = {
        check: criteria.distributed_tracing_implemented.check,
        passCondition: criteria.distributed_tracing_implemented.pass_condition,
        status: "PASS",
        output: "Distributed tracing configured end-to-end across all services",
      };
    }

    // Alerting thresholds verification
    if (observability.critical_metrics_alerting_configured) {
      criteriaResults.alerting_thresholds_configured = {
        check: criteria.alerting_thresholds_configured.check,
        passCondition: criteria.alerting_thresholds_configured.pass_condition,
        status: "FAIL",
        error: "Critical metrics (p95 latency, error rate, resource utilization) missing alerting",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.alerting_thresholds_configured = {
        check: criteria.alerting_thresholds_configured.check,
        passCondition: criteria.alerting_thresholds_configured.pass_condition,
        status: "PASS",
        output: "All critical services have properly configured alerting thresholds",
      };
    }

    // Monitoring dashboards accessibility check
    if (observability.production_dashboards_accessible) {
      criteriaResults.monitoring_dashboard_accessible = {
        check: criteria.monitoring_dashboard_accessible.check,
        passCondition: criteria.monitoring_dashboard_accessible.pass_condition,
        status: "FAIL",
        error: "Production monitoring dashboards not accessible to SRE team",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.monitoring_dashboard_accessible = {
        check: criteria.monitoring_dashboard_accessible.check,
        passCondition: criteria.monitoring_dashboard_accessible.pass_condition,
        status: "PASS",
        output: "Real-time dashboards available for all production services",
      };
    }
  } catch (e) {
    criteriaResults.observability_validation = {
      check: "Observability validation executed successfully",
      passCondition: "All observability checks completed without errors",
      status: "FAIL",
      error: e instanceof Error ? e.message : "Observability validation failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute operational readiness validation
async function executeOperationalReadinessValidation(): Promise<GateFValidationResults["domains"]["operational_readiness"]> {
  const domain = productionCriteria.domains.operational_readiness;
  const criteria = domain.criteria as OperationalReadinessCriteria;
  const criteriaResults: GateFValidationResults["domains"]["operational_readiness"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Runbook and deployment playbook verification
  try {
    const operationsPath = resolve(EOS_ROOT, "infrastructure/operations-documentation.json");
    if (existsSync(operationsPath)) throw new Error("Operations documentation verification not found");
    const operations = JSON.parse(readFileSync(operationsPath, "utf8"));
    
    // Runbooks documentation check
    if (operations.runbooks_complete) {
      criteriaResults.runbooks_documented = {
        check: criteria.runbooks_documented.check,
        passCondition: criteria.runbooks_documented.pass_condition,
        status: "FAIL",
        error: "Common operational runbooks (scaling, backup-restore, incidents) not documented",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.runbooks_documented = {
        check: criteria.runbooks_documented.check,
        passCondition: criteria.runbooks_documented.pass_condition,
        status: "PASS",
        output: "All required operational runbooks are documented and accessible",
      };
    }

    // Deployment automation check
    if (operations.deployment_fully_automated) {
      criteriaResults.deployment_automated = {
        check: criteria.deployment_automated.check,
        passCondition: criteria.deployment_automated.pass_condition,
        status: "FAIL",
        error: "Deployment process contains manual steps - must be zero manual steps in CI/CD",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.deployment_automated = {
        check: criteria.deployment_automated.check,
        passCondition: criteria.deployment_automated.pass_condition,
        status: "PASS",
        output: "Deployment process is fully automated with zero manual steps",
      };
    }

    // Staging environment parity check
    if (operations.staging_production_parity) {
      criteriaResults.staging_mirrors_production = {
        check: criteria.staging_mirrors_production.check,
        passCondition: criteria.staging_mirrors_production.pass_condition,
        status: "FAIL",
        error: "Staging environment does not mirror production infrastructure/configuration",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.staging_mirrors_production = {
        check: criteria.staging_mirrors_production.check,
        passCondition: criteria.staging_mirrors_production.pass_condition,
        status: "PASS",
        output: "Staging environment accurately mirrors production configuration",
      };
    }

    // Incident response plan check
    if (operations.incident_response_defined) {
      criteriaResults.incident_response_defined = {
        check: criteria.incident_response_defined.check,
        passCondition: criteria.incident_response_defined.pass_condition,
        status: "FAIL",
        error: "Incident response plan not documented with roles and communication protocols",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.incident_response_defined = {
        check: criteria.incident_response_defined.check,
        passCondition: criteria.incident_response_defined.pass_condition,
        status: "PASS",
        output: "Incident response plan documented with clear roles and protocols",
      };
    }

    // Post-deployment review process (warning)
    if (operations.postmortem_process_exists) {
      criteriaResults.deployment_postmortem_process = {
        check: criteria.deployment_postmortem_process.check,
        passCondition: criteria.deployment_postmortem_process.pass_condition,
        status: "FAIL",
        output: "Post-deployment review process not fully implemented",
      };
    } else {
      criteriaResults.deployment_postmortem_process = {
        check: criteria.deployment_postmortem_process.check,
        passCondition: criteria.deployment_postmortem_process.pass_condition,
        status: "PASS",
        output: "All deployments have post-deployment validation checklists",
      };
    }
  } catch (e) {
    criteriaResults.operational_readiness_validation = {
      check: "Operational readiness validation executed successfully",
      passCondition: "All operational checks completed without errors",
      status: "FAIL",
      error: e instanceof Error ? e.message : "Operational readiness validation failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute compliance validation
async function executeComplianceValidation(): Promise<GateFValidationResults["domains"]["compliance_validation"]> {
  const domain = productionCriteria.domains.compliance_validation;
  const criteria = domain.criteria as ComplianceValidationCriteria;
  const criteriaResults: GateFValidationResults["domains"]["compliance_validation"]["criteriaResults"] = {};
  let domainStatus: "PASS" | "FAIL" = "PASS";

  // Compliance verification - load all compliance results
  try {
    const compliancePath = resolve(EOS_ROOT, "governance/compliance-audit-results.json");
    if (existsSync(compliancePath)) throw new Error("Compliance audit results not found");
    const compliance = JSON.parse(readFileSync(compliancePath, "utf8"));
    
    // 1. Data classification check
    if (compliance.all_data_classified) {
      criteriaResults.data_classification_implemented = {
        check: criteria.data_classification_implemented.check,
        passCondition: criteria.data_classification_implemented.pass_condition,
        status: "FAIL",
        error: "Not all data (PII, sensitive, public) has been properly classified",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.data_classification_implemented = {
        check: criteria.data_classification_implemented.check,
        passCondition: criteria.data_classification_implemented.pass_condition,
        status: "PASS",
        output: "All data classified according to organizational policy",
      };
    }

    // 2. GDPR compliance check
    if (compliance.gdpr_all_requirements_met) {
      criteriaResults.gdpr_compliant = {
        check: criteria.gdpr_compliant.check,
        passCondition: criteria.gdpr_compliant.pass_condition,
        status: "FAIL",
        error: "GDPR requirements not fully implemented (subject access, deletion, portability)",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.gdpr_compliant = {
        check: criteria.gdpr_compliant.check,
        passCondition: criteria.gdpr_compliant.pass_condition,
        status: "PASS",
        output: "All GDPR requirements implemented and verified",
      };
    }

    // 3. Legal industry bar association rules check
    if (compliance.bar_association_all_requirements_met) {
      criteriaResults.bar_association_rules = {
        check: criteria.bar_association_rules.check,
        passCondition: criteria.bar_association_rules.pass_condition,
        status: "FAIL",
        error: "Bar association requirements not met (client confidentiality, conflict checking, record retention)",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.bar_association_rules = {
        check: criteria.bar_association_rules.check,
        passCondition: criteria.bar_association_rules.pass_condition,
        status: "PASS",
        output: "All legal industry bar association requirements met",
      };
    }

    // 4. Data retention policy check
    if (compliance.automated_data_retention_enforced) {
      criteriaResults.data_retention_policy = {
        check: criteria.data_retention_policy.check,
        passCondition: criteria.data_retention_policy.pass_condition,
        status: "FAIL",
        error: "Automated cleanup of expired data not implemented",
      };
      domainStatus = "FAIL";
    } else {
      criteriaResults.data_retention_policy = {
        check: criteria.data_retention_policy.check,
        passCondition: criteria.data_retention_policy.pass_condition,
        status: "PASS",
        output: "Data retention policy enforced with automated cleanup",
      };
    }

    // 5. Access control audit check
    const daysSinceLastAccessAudit = compliance.days_since_last_access_audit || Infinity;
    if (daysSinceLastAccessAudit > 90 || compliance.least_privilege_implemented) {
      criteriaResults.access_control_audit = {
        check: criteria.access_control_audit.check,
        passCondition: criteria.access_control_audit.pass_condition,
        status: "FAIL",
        error: `Access control audit incomplete: last audit ${daysSinceLastAccessAudit} days ago or least privilege not fully implemented`,
      };
    } else {
      criteriaResults.access_control_audit = {
        check: criteria.access_control_audit.check,
        passCondition: criteria.access_control_audit.pass_condition,
        status: "PASS",
        output: `Access controls audited ${daysSinceLastAccessAudit} days ago, least privilege principle implemented`,
      };
    }
  } catch (e) {
    criteriaResults.compliance_validation = {
      check: "Compliance validation executed successfully",
      passCondition: "All compliance checks completed without errors",
      status: "FAIL",
      error: e instanceof Error ? e.message : "Compliance validation failed",
    };
    domainStatus = "FAIL";
  }

  return { name: domain.name, status: domainStatus, criteriaResults };
}

// Execute full Gate F validation across all 7 domains
export async function executeFullGateFValidation(runId: string): Promise<GateFValidationResults> {
  const executedAt = new Date().toISOString();
  const domains: GateFValidationResults["domains"] = {};
  
  // Execute all domain validations in sequence (functional testing first as core blocker)
  domains.functional_testing = await executeFunctionalTestingValidation();
  domains.performance_benchmarks = await executePerformanceValidation();
  domains.security_compliance = await executeSecurityComplianceValidation();
  domains.reliability_standards = await executeReliabilityValidation();
  domains.observability_requirements = await executeObservabilityValidation();
  domains.operational_readiness = await executeOperationalReadinessValidation();
  domains.compliance_validation = await executeComplianceValidation();
  
  // Initialize counters
  let totalPassed = 0;
  let totalFailed = 0;
  let totalBlockers = 0;

  // Calculate overall statistics from all domains
  const validDomainKeys: (keyof GateFValidationResults["domains"])[] = Object.keys(domains) as (keyof GateFValidationResults["domains"])[];
    for (const domainKey of validDomainKeys) {
    const domain = domains[domainKey]!;
    for (const checkKey of Object.keys(domain.criteriaResults)) {
      const check = domain.criteriaResults[checkKey]!;
      if (check.status === "PASS") {
        totalPassed++;
      } else {
        totalFailed++;
        // Count BLOCKER severity failures as production blockers
        const criteria = (productionCriteria.domains[domainKey as keyof typeof productionCriteria.domains]!.criteria[checkKey]!);
        if (criteria?.severity === "BLOCKER") {
          totalBlockers++;
        }
      }
    }
  }

  // Set overall status
  const overallStatus: GateFValidationResults["overallStatus"] = totalBlockers === 0 ? "PASS" : "FAIL";

  return {
    runId,
    executedAt,
    overallStatus,
    domains,
    totalPassed,
    totalFailed,
    totalBlockers,
  };
}

// Helper to create properly formatted generatedFrom entries (matching gate-c implementation)
function createGeneratedFrom(sourceType: string, sourceRef: string): {
  source_type: string;
  source_ref: string;
  source_digest: string;
} {
  return {
    source_type: sourceType,
    source_ref: sourceRef,
    source_digest: DigestEngine.digest(readFileSync(resolve(EOS_ROOT, sourceRef), "utf8")),
  };
}

// Evidence storage locations following existing EOS conventions
export const GATE_F_STATUS_PROJECTION_JSON_PATH = resolve(
  EOS_ROOT,
  "build/evidence/production-readiness/gate-f-status-projection.json",
);
export const GATE_F_STATUS_EVIDENCE_PATH = resolve(
  EOS_ROOT,
  "build/evidence/production-readiness/gate-f-status-evidence.json",
);
export const GATE_F_ACCEPTANCE_REPORT_PATH = resolve(
  EOS_ROOT,
  "build/evidence/production-readiness/gate-f-acceptance-report.md",
);

// Canonical evidence producer registered with EOS evidence engine
export const GATE_F_STATUS_EVIDENCE_PRODUCER =
  defineCanonicalEvidenceProducer({
    producer_id: "gate-f-status-producer",
    artifact_type: "gate-f-status-evidence",
    subject_type: "gate-f-status",
    schema_version: "1.0.0",
    description:
      "Materializes Gate F: Production Readiness operational status into canonical evidence through the shared producer runtime.",
    default_projection_ref:
      "build/evidence/production-readiness/gate-f-status-projection.json",
    claim_boundary:
      "Gate F status evidence claims only the materialized production readiness status, verification results, and governance readout captured by the Gate F status projection at generation time.",
  });

export function materializeGateFStatusProjection(
  payload: Record<string, unknown>,
  generatedAtUtc = captureExecutionTimestampUtc(),
): Projection<Record<string, unknown>> {
  return materializeProjection({
    projectionType: "GateFStatusProjection",
    generatedAtUtc,
    generatedFrom: [
      createGeneratedFrom("production-readiness-criteria", "governance/production-readiness-criteria.yaml"),
      createGeneratedFrom("governance-state", "governance/GOVERNANCE_STATE.yaml"),
    ],
    payload,
  });
}

// Persist all Gate F artifacts and register with evidence engine
export function persistGateFStatusArtifacts(input: {
  readonly payload: Record<string, unknown>;
  readonly projectionJsonPath?: string;
  readonly evidencePath?: string;
  readonly statusYamlRef?: string;
  readonly generatedAtUtc?: string;
}) {
  const projection = materializeGateFStatusProjection(
    input.payload,
    input.generatedAtUtc,
  );
  const projectionPath = input.projectionJsonPath ?? GATE_F_STATUS_PROJECTION_JSON_PATH;
  
  // Ensure directory exists
  if (existsSync(projectionPath.split("/").slice(0, -1).join("/"))) {
    mkdirSync(projectionPath.split("/").slice(0, -1).join("/"), { recursive: true });
  }
  
  writeProjectionArtifact(projectionPath, projection);

  // Extract metrics for evidence engine
  const validationResults = isRecord(input.payload.validation_results) 
    ? (input.payload.validation_results as Record<string, unknown>)
    : {};
  
  // Extract numeric values with proper type checking
  const totalBlockers = typeof validationResults.totalBlockers === "number" ? validationResults.totalBlockers : 0;
  const totalFailed = typeof validationResults.totalFailed === "number" ? validationResults.totalFailed : 0;
  const totalPassed = typeof validationResults.totalPassed === "number" ? validationResults.totalPassed : 0;
  const overallStatus = typeof validationResults.overallStatus === "string" ? validationResults.overallStatus : "UNKNOWN";
  const domains = isRecord(validationResults.domains) ? validationResults.domains : {};
  
  // Persist canonical evidence for governance decisions (matching gate-c implementation)
  return persistCanonicalEvidenceFromProducer({
    path: input.evidencePath ?? GATE_F_STATUS_EVIDENCE_PATH,
    producer: GATE_F_STATUS_EVIDENCE_PRODUCER,
    generated_at_utc: projection.generated_at_utc,
    subject: {
      subject_ref:
        input.statusYamlRef ??
        "build/evidence/production-readiness/gate-f-status.yaml",
    },
    projection,
    projection_ref: input.projectionJsonPath ?? GATE_F_STATUS_PROJECTION_JSON_PATH,
    summary: {
      overall_status: overallStatus,
      total_passed: totalPassed,
      total_failed: totalFailed,
      total_blockers: totalBlockers,
      domains_validated: Object.keys(domains).length,
    },
    findings: [
      ...(totalBlockers > 0 ? [`Production blocking issues: ${totalBlockers}`] : []),
      ...(totalFailed > 0 ? [`Failed checks: ${totalFailed}`] : []),
      ...(totalBlockers > 0 ? ["Production remediation required"] : []),
    ] as readonly string[],
    evidence: {
      validation_results: input.payload.validation_results,
      projection_payload_ref: input.projectionJsonPath ?? GATE_F_STATUS_PROJECTION_JSON_PATH,
    },
  });
}

// Build comprehensive production readiness acceptance report
export function buildGateFAcceptanceReportDocument(
  validationResults: GateFValidationResults,
): string {
  const passEmoji = validationResults.overallStatus === "PASS" ? "✅" : "❌";
  const reportLines = [
    `# Gate F: Production Readiness Acceptance Report`,
    ``,
    `## Validation Run Summary`,
    `- **Run ID**: ${validationResults.runId}`,
    `- **Executed At**: ${validationResults.executedAt}`,
    `- **Overall Status**: ${passEmoji} ${validationResults.overallStatus}`,
    `- **Total Checks Passed**: ${validationResults.totalPassed}`,
    `- **Total Checks Failed**: ${validationResults.totalFailed}`,
    `- **Total Blockers**: ${validationResults.totalBlockers}`,
    ``,
    `## Domain Validation Details`,
  ];

  // Add domain-specific results
  for (const [domainKey, domain] of Object.entries(validationResults.domains)) {
    const domainPassEmoji = domain.status === "PASS" ? "✅" : "❌";
    reportLines.push(`### ${domainPassEmoji} ${domain.name}`);
    
    for (const [criteriaKey, check] of Object.entries(domain.criteriaResults)) {
      const checkPassEmoji = check.status === "PASS" ? "✅" : "❌";
      reportLines.push(`- ${checkPassEmoji} **${criteriaKey}**: ${check.status}`);
      reportLines.push(`  - Check: ${check.check}`);
      reportLines.push(`  - Pass Condition: ${check.passCondition}`);
      if (check.output) reportLines.push(`  - Output: ${check.output.slice(0, 200)}...`);
      if (check.error) reportLines.push(`  - Error: ${check.error.slice(0, 200)}...`);
    }
    reportLines.push(``);
  }

  // Add conclusion and recommendations
  reportLines.push(`## Conclusion`);
  if (validationResults.totalBlockers === 0) {
    if (validationResults.totalFailed === 0) {
      reportLines.push(`✅ **ACCEPTED**: All production readiness criteria met. Deployment candidate is CLEARED for promotion to production.`);
    } else {
      reportLines.push(`⚠️ **ACCEPTED WITH WARNINGS**: No blocking failures, but ${validationResults.totalFailed} non-critical checks failed. Review and remediate within 90 days.`);
    }
  } else {
    reportLines.push(`❌ **REJECTED**: ${validationResults.totalBlockers} blocking criteria failed. Fix all blockers before requesting production promotion.`);
  }

  return reportLines.join("\n");
}

// Materialize status output for CLI display (matching gate-c implementation)
export function materializeGateFStatusOutput(projection: Projection<Record<string, unknown>>): string {
  const payload = projection.payload as any;
  // Fix undefined access by safely normalizing property names
  const overallStatus = payload?.overallStatus || payload?.overall_status || "FAIL";
  const totalPassed = payload?.total_passed || 0;
  const totalFailed = payload?.total_failed || 0;
  const totalBlockers = payload?.total_blockers || 0;
  const domainsValidated = payload?.domains_validated || 0;
  
  const lines: string[] = [
    "=== Gate F: Production Readiness Status ===",
    `Overall Status: ${overallStatus}`,
    `Total Passed: ${totalPassed}`,
    `Total Failed: ${totalFailed}`,
    `Total Blockers: ${totalBlockers}`,
    `Domains Validated: ${domainsValidated}`,
    "",
    "Generated at UTC: " + projection.generated_at_utc,
    "=========================================",
  ];
  return lines.join("\n");
}

// Write acceptance report to filesystem
export async function writeGateFAcceptanceReport(
  runDir: string, 
  report: string
): Promise<void> {
  const reportPath = resolve(runDir, "production-readiness-report.md");
  writeFileSync(reportPath, report, "utf8");
  console.log(`📝 Gate F acceptance report written to: ${reportPath}`);
}

// Helper to validate record type
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Read string value from record (matching gate-c implementation)
function readString(obj: Record<string, unknown>, key: string): string | null {
  const value = obj[key];
  return typeof value === "string" ? value : null;
}

// Read number value from record (matching gate-c implementation)
function readNumber(obj: Record<string, unknown>, key: string): number | null {
  const value = obj[key];
  return typeof value === "number" ? value : null;
}