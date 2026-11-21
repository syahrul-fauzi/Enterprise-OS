// @ts-nocheck
export interface IssuesIdsProductContext {
  readonly productId: "issues-ids";
  readonly displayName: "Issues & IDS";
  readonly domain: "issues.enterprise-os.com";
  readonly branding: {
    readonly primaryColor: "#ef4444";
    readonly logoPath: "/products/issues-ids/assets/logo.svg";
  };
  readonly features: {
    readonly issueReporting: boolean;
    readonly issueTriage: boolean;
    readonly incidentDetection: boolean;
    readonly decisionTracking: boolean;
    readonly workLinking: boolean;
    readonly evidenceManagement: boolean;
  };
  readonly supportedIssueTypes: readonly ["Operational Issue", "Security Incident", "Performance Degradation", "Service Outage", "User-reported Problem", "System Alert"];
  readonly supportedSeverityLevels: readonly ["Critical", "High", "Medium", "Low", "Info"];
}

export function provideIssuesIdsContext(): IssuesIdsProductContext {
  return {
    productId: "issues-ids",
    displayName: "Issues & IDS",
    domain: "issues.enterprise-os.com",
    branding: {
      primaryColor: "#ef4444",
      logoPath: "/products/issues-ids/assets/logo.svg",
    },
    features: {
      issueReporting: true,
      issueTriage: true,
      incidentDetection: true,
      decisionTracking: true,
      workLinking: true,
      evidenceManagement: true
    },
    supportedIssueTypes: ["Operational Issue", "Security Incident", "Performance Degradation", "Service Outage", "User-reported Problem", "System Alert"],
    supportedSeverityLevels: ["Critical", "High", "Medium", "Low", "Info"]
  };
}