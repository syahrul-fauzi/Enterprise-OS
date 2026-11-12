#!/bin/bash
set -e

REPORT_FILE=".eos-state/verification/SMACE-007/EVI-PR-02-end-to-end-uat-$(date -u +"%s").json"

echo "=== PR-02 End-to-End UAT Verification ==="
echo "1. Checking existing Work creation capabilities..."

HAS_WORK_CREATE=$(grep -r "createWork\|work.create\|logicalWorkId" --include="*.ts" capabilities/work-core/ 2>/dev/null | wc -l || echo "0")

echo "2. Checking cross-channel access patterns..."
HAS_CROSS_CHANNEL=$(grep -r "API\|MCP\|FACE" --include="*.ts" capabilities/ 2>/dev/null | grep -i "work" | head -10 | wc -l || echo "0")

echo "3. Checking Work continuity evidence..."
HAS_CONTINUITY_EVIDENCE=$(ls -la .eos-state/verification/ | grep -i "continuity" | wc -l || echo "0")

cat > "$REPORT_FILE" << EOF
{
  "evidenceId": "PR-02-END-TO-END-UAT",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "overallResult": "PENDING_MANUAL_REVIEW",
  "workCreationCapability": {
    "implementationExists": "$([ "$HAS_WORK_CREATE" -gt 0 ] && echo "true" || echo "false")",
    "referencesFound": $HAS_WORK_CREATE,
    "capabilityPath": "capabilities/work-core/implementation/commands/work.commands.ts"
  },
  "crossChannelAccessVerification": {
    "apiMcpFaceParityVerified": false,
    "trustedContextConsistent": false,
    "authorizationDecisionsMatch": false
  },
  "workContinuityVerification": {
    "logicalWorkIdPersistent": false,
    "stateTransitionsTracked": false,
    "actorContinuityPreserved": false
  },
  "uatScenarios": [
    "Work creation via API",
    "Work access via MCP",
    "Work update via FACE",
    "Work completion across channels",
    "Authorization consistency check",
    "Evidence chain verification"
  ],
  "requiredManualVerificationSteps": [
    "Deploy staging environment with PostgreSQL configuration",
    "Execute end-to-end Work lifecycle test",
    "Record request/response from all channels",
    "Verify logicalWorkId remains consistent",
    "Confirm authorization decisions match across channels",
    "Collect evidence for final review"
  ]
}
EOF

echo "Report generated: $REPORT_FILE"