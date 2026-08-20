export interface ProductionReadinessCriteria {
  version: string;
  gate_id: string;
  name: string;
  description: string;
  domains: Required<{
    functional_testing: ProductionReadinessDomain<FunctionalTestingCriteria>;
    performance_benchmarks: ProductionReadinessDomain<PerformanceBenchmarksCriteria>;
    security_compliance: ProductionReadinessDomain<SecurityComplianceCriteria>;
    reliability_standards: ProductionReadinessDomain<ReliabilityStandardsCriteria>;
    observability_requirements: ProductionReadinessDomain<ObservabilityRequirementsCriteria>;
    operational_readiness: ProductionReadinessDomain<OperationalReadinessCriteria>;
    compliance_validation: ProductionReadinessDomain<ComplianceValidationCriteria>;
  }>;
  exception_process: ExceptionProcess;
  reporting: ReportingRequirements;
}

// Define specific criteria interfaces for each domain to ensure type safety
// Base interface with index signature to enable safe dynamic access to any criteria property (fixes TS7053)
export interface DomainCriteria {
  [key: string]: ValidationCheck;
}

export interface FunctionalTestingCriteria extends DomainCriteria {
  unit_tests_pass: ValidationCheck;
  integration_tests_pass: ValidationCheck;
  e2e_tests_pass: ValidationCheck;
  no_critical_defects: ValidationCheck;
  no_high_severity_defects: ValidationCheck;
  test_coverage_threshold: ValidationCheck;
}

export interface PerformanceBenchmarksCriteria extends DomainCriteria {
  p95_latency_threshold: ValidationCheck;
  p99_latency_threshold: ValidationCheck;
  throughput_sustainment: ValidationCheck;
  error_rate_threshold: ValidationCheck;
  resource_utilization: ValidationCheck;
}

export interface SecurityComplianceCriteria extends DomainCriteria {
  sast_scan_passed: ValidationCheck;
  dast_scan_passed: ValidationCheck;
  dependency_scan_passed: ValidationCheck;
  compliance_audit_passed: ValidationCheck;
  secrets_not_exposed: ValidationCheck;
}

export interface ReliabilityStandardsCriteria extends DomainCriteria {
  automated_backups_configured: ValidationCheck;
  dr_procedures_tested: ValidationCheck;
  circuit_breakers_implemented: ValidationCheck;
  mttr_requirement_met: ValidationCheck;
  redundancy_implemented: ValidationCheck;
}

export interface ObservabilityRequirementsCriteria extends DomainCriteria {
  structured_logging_implemented: ValidationCheck;
  business_metrics_defined: ValidationCheck;
  distributed_tracing_implemented: ValidationCheck;
  alerting_thresholds_configured: ValidationCheck;
  monitoring_dashboard_accessible: ValidationCheck;
}

export interface OperationalReadinessCriteria extends DomainCriteria {
  runbooks_documented: ValidationCheck;
  deployment_automated: ValidationCheck;
  staging_mirrors_production: ValidationCheck;
  incident_response_defined: ValidationCheck;
  deployment_postmortem_process: ValidationCheck;
}

export interface ComplianceValidationCriteria extends DomainCriteria {
  data_classification_implemented: ValidationCheck;
  gdpr_compliant: ValidationCheck;
  bar_association_rules: ValidationCheck;
  data_retention_policy: ValidationCheck;
  access_control_audit: ValidationCheck;
}

export type DomainCriteriaUnion = 
  | FunctionalTestingCriteria
  | PerformanceBenchmarksCriteria
  | SecurityComplianceCriteria
  | ReliabilityStandardsCriteria
  | ObservabilityRequirementsCriteria
  | OperationalReadinessCriteria
  | ComplianceValidationCriteria;

export interface ProductionReadinessDomain<T extends DomainCriteria> {
  name: string;
  description: string;
  criteria: T;
  evidence_required: string[];
}

export type AnyProductionReadinessDomain = ProductionReadinessDomain<DomainCriteria>;

export interface ValidationCheck {
  check: string;
  pass_condition: string;
  severity: "BLOCKER" | "WARNING" | "INFO";
}

export interface ExceptionProcess {
  approvers_required: string[];
  minimum_approvals: number;
  remediation_timeline_days: number;
  exception_record_path: string;
}

export interface ReportingRequirements {
  report_format: string;
  evidence_archive_path: string;
  retention_days: number;
  notify_on_failure: string[];
  notify_on_pass: string[];
}

export interface GateFValidationResults {
  runId: string;
  executedAt: string;
  overallStatus: "PENDING" | "PASS" | "FAIL";
  domains: Record<string, {
    name: string;
    status: "PASS" | "FAIL" | "SKIPPED";
    criteriaResults: Record<string, {
      check: string;
      passCondition: string;
      status: "PASS" | "FAIL";
      output?: string;
      error?: string;
    }>;
  }>;
  totalPassed: number;
  totalFailed: number;
  totalBlockers: number;
}

export const productionReadinessCriteria: ProductionReadinessCriteria = {
  version: "1.0.0",
  gate_id: "gate-f",
  name: "Production Readiness Gate",
  description: "Validates all application components, infrastructure, and services meet mandatory standards before promotion to production",
  domains: {
    // 1. Functional Testing Domain (PRG-001)
    functional_testing: {
      name: "Functional Testing",
      description: "100% pass rate for all unit, integration, and end-to-end test suites, with no critical or high-severity open defects",
      criteria: {
        unit_tests_pass: {
          check: "All unit tests execute and pass",
          pass_condition: "100% pass rate (0 failures)",
          severity: "BLOCKER",
        },
        integration_tests_pass: {
          check: "All integration tests execute and pass",
          pass_condition: "100% pass rate (0 failures)",
          severity: "BLOCKER",
        },
        e2e_tests_pass: {
          check: "All end-to-end tests execute and pass",
          pass_condition: "100% pass rate (0 failures)",
          severity: "BLOCKER",
        },
        no_critical_defects: {
          check: "No critical-severity open defects",
          pass_condition: "0 critical open defects",
          severity: "BLOCKER",
        },
        no_high_severity_defects: {
          check: "No high-severity open defects",
          pass_condition: "0 high-severity open defects",
          severity: "BLOCKER",
        },
        test_coverage_threshold: {
          check: "Code coverage meets minimum requirements",
          pass_condition: ">=80% overall code coverage",
          severity: "WARNING",
        },
      } satisfies FunctionalTestingCriteria,
      evidence_required: [
        "unit-test-results.json",
        "integration-test-results.json",
        "e2e-test-results.json",
        "open-defects-report.json",
        "code-coverage-report.json",
      ],
    },
    // 2. Performance Benchmarks Domain (PRG-002)
    performance_benchmarks: {
      name: "Performance Benchmarks",
      description: "Verify load testing results meet predefined latency, throughput, and error rate thresholds under projected peak production traffic",
      criteria: {
        p95_latency_threshold: {
          check: "P95 latency meets requirements",
          pass_condition: "<500ms for API endpoints",
          severity: "BLOCKER",
        },
        p99_latency_threshold: {
          check: "P99 latency meets requirements",
          pass_condition: "<1000ms for API endpoints",
          severity: "BLOCKER",
        },
        throughput_sustainment: {
          check: "System sustains projected peak throughput",
          pass_condition: "100% of projected peak requests handled successfully",
          severity: "BLOCKER",
        },
        error_rate_threshold: {
          check: "Error rate during load testing",
          pass_condition: "<0.1% error rate under peak load",
          severity: "BLOCKER",
        },
        resource_utilization: {
          check: "CPU/Memory utilization within limits",
          pass_condition: "<70% CPU, <80% memory at peak load",
          severity: "WARNING",
        },
      } satisfies PerformanceBenchmarksCriteria,
      evidence_required: [
        "load-test-results.json",
        "performance-metrics-dashboard.png",
        "resource-utilization-report.json",
      ],
    },
    // 3. Security Compliance Domain (PRG-003)
    security_compliance: {
      name: "Security Compliance",
      description: "Pass all SAST, DAST, dependency vulnerability scans, and compliance audits with zero critical/high unremediated vulnerabilities",
      criteria: {
        sast_scan_passed: {
          check: "Static Application Security Testing passed",
          pass_condition: "0 critical/high unremediated vulnerabilities",
          severity: "BLOCKER",
        },
        dast_scan_passed: {
          check: "Dynamic Application Security Testing passed",
          pass_condition: "0 critical/high unremediated vulnerabilities",
          severity: "BLOCKER",
        },
        dependency_scan_passed: {
          check: "Dependency vulnerability scan passed",
          pass_condition: "0 critical/high unremediated vulnerabilities",
          severity: "BLOCKER",
        },
        compliance_audit_passed: {
          check: "Security compliance audit completed",
          pass_condition: "All mandatory security controls implemented",
          severity: "BLOCKER",
        },
        secrets_not_exposed: {
          check: "No secrets/credentials in codebase",
          pass_condition: "0 secrets detected in repository",
          severity: "BLOCKER",
        },
      } satisfies SecurityComplianceCriteria,
      evidence_required: [
        "sast-scan-report.json",
        "dast-scan-report.json",
        "dependency-scan-report.json",
        "security-audit-report.pdf",
        "secret-scan-results.json",
      ],
    },
    // 4. Reliability Standards Domain (PRG-004)
    reliability_standards: {
      name: "Reliability Standards",
      description: "Confirm implementation of automated backups, disaster recovery procedures, and circuit breakers with MTTR meeting business requirements",
      criteria: {
        automated_backups_configured: {
          check: "Automated backups are implemented",
          pass_condition: "All critical data backed up hourly, retained for 30 days",
          severity: "BLOCKER",
        },
        dr_procedures_tested: {
          check: "Disaster recovery procedures tested",
          pass_condition: "Full DR test completed in last 90 days",
          severity: "BLOCKER",
        },
        circuit_breakers_implemented: {
          check: "Circuit breakers for all external dependencies",
          pass_condition: "All third-party services have circuit breakers configured",
          severity: "BLOCKER",
        },
        mttr_requirement_met: {
          check: "Mean Time to Recovery meets SLA",
          pass_condition: "<15 minutes MTTR for critical incidents",
          severity: "BLOCKER",
        },
        redundancy_implemented: {
          check: "Multi-AZ deployment configured",
          pass_condition: "Services deployed across minimum 2 availability zones",
          severity: "WARNING",
        },
      } satisfies ReliabilityStandardsCriteria,
      evidence_required: [
        "backup-configuration.json",
        "dr-test-report.pdf",
        "circuit-breaker-implementation-evidence.json",
        "mttr-calculation-report.json",
      ],
    },
    // 5. Observability Requirements Domain (PRG-005)
    observability_requirements: {
      name: "Observability Requirements",
      description: "Validate comprehensive logging, metrics, and distributed tracing configured with production monitoring integration",
      criteria: {
        structured_logging_implemented: {
          check: "Structured logging implemented for all services",
          pass_condition: "All critical operations logged with context",
          severity: "BLOCKER",
        },
        business_metrics_defined: {
          check: "Core business metrics are tracked",
          pass_condition: "All key performance indicators have dashboards",
          severity: "BLOCKER",
        },
        distributed_tracing_implemented: {
          check: "Distributed tracing configured end-to-end",
          pass_condition: "Trace context propagated across all service boundaries",
          severity: "BLOCKER",
        },
        alerting_thresholds_configured: {
          check: "Alert thresholds defined for all critical metrics",
          pass_condition: "p95 latency, error rate, and resource utilization have alerts configured",
          severity: "BLOCKER",
        },
        monitoring_dashboard_accessible: {
          check: "Production monitoring dashboards accessible to SRE team",
          pass_condition: "Real-time dashboards available for all production services",
          severity: "BLOCKER",
        },
      } satisfies ObservabilityRequirementsCriteria,
      evidence_required: [
        "logging-configuration.json",
        "metrics-dashboard-screenshot.png",
        "tracing-implementation-proof.json",
        "alerting-rules.json",
      ],
    },
    // 6. Operational Readiness Domain (PRG-006)
    operational_readiness: {
      name: "Operational Readiness",
      description: "Ensure runbooks, deployment playbooks, and incident response protocols documented with fully automated deployments",
      criteria: {
        runbooks_documented: {
          check: "All common operational runbooks exist",
          pass_condition: "Runbooks for scaling, backup-restore, and common incidents",
          severity: "BLOCKER",
        },
        deployment_automated: {
          check: "Deployment process is fully automated",
          pass_condition: "Zero-manual steps in CI/CD pipeline",
          severity: "BLOCKER",
        },
        staging_mirrors_production: {
          check: "Staging environment mirrors production",
          pass_condition: "Staging uses identical infrastructure and configuration",
          severity: "BLOCKER",
        },
        incident_response_defined: {
          check: "Incident response plan documented",
          pass_condition: "Roles and communication protocols defined for incidents",
          severity: "BLOCKER",
        },
        deployment_postmortem_process: {
          check: "Post-deployment review process exists",
          pass_condition: "All deployments have post-deployment validation checklist",
          severity: "WARNING",
        },
      } satisfies OperationalReadinessCriteria,
      evidence_required: [
        "operations-runbook.md",
        "deployment-pipeline-screenshot.png",
        "staging-configuration.json",
        "incident-response-plan.pdf",
      ],
    },
    // 7. Compliance Validation Domain (PRG-007)
    compliance_validation: {
      name: "Compliance Validation",
      description: "Confirm adherence to all industry and organizational data governance, privacy, and regulatory requirements",
      criteria: {
        data_classification_implemented: {
          check: "All data classified per policy",
          pass_condition: "PII, sensitive, and public data classification complete",
          severity: "BLOCKER",
        },
        gdpr_compliant: {
          check: "GDPR requirements met",
          pass_condition: "Data subject access, deletion, and portability implemented",
          severity: "BLOCKER",
        },
        bar_association_rules: {
          check: "Legal industry bar association requirements met",
          pass_condition: "Client confidentiality, conflict checking, and record retention compliant",
          severity: "BLOCKER",
        },
        data_retention_policy: {
          check: "Data retention policy enforced",
          pass_condition: "Automated cleanup of expired data",
          severity: "BLOCKER",
        },
        access_control_audit: {
          check: "Access controls audited",
          pass_condition: "Least privilege principle implemented, last audit <90 days",
          severity: "WARNING",
        },
      } satisfies ComplianceValidationCriteria,
      evidence_required: [
        "data-classification-map.json",
        "gdpr-compliance-report.pdf",
        "legal-industry-audit.pdf",
        "data-retention-configuration.json",
        "access-control-audit-report.pdf",
      ],
    },
  },
  exception_process: {
    approvers_required: ["CTO", "Engineering Director", "Security Lead"],
    minimum_approvals: 2,
    remediation_timeline_days: 90,
    exception_record_path: "workspace/.eos/production-exceptions/",
  },
  reporting: {
    report_format: "markdown",
    evidence_archive_path: "workspace/.eos/production-readiness-evidence/",
    retention_days: 365,
    notify_on_failure: ["engineering-leads@lawyershub.com", "sre@lawyershub.com"],
    notify_on_pass: ["deployments@lawyershub.com"],
  },
};