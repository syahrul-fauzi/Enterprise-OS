// Autonomy Boundary Check Implementation - Canonical work-core version
// Gate A requirement: Moved from consultation capability to work-core for single semantic authority
import type { AutonomyBoundaryCheck, AutonomyBoundaryResult } from "./boundary-checks.types";

export function checkAutonomyBoundary(
  check: AutonomyBoundaryCheck,
  actorId: string,
  customControlIds?: {
    govControlId?: string;
    measureControlId?: string;
  }
): AutonomyBoundaryResult {
  const { action, allowed, prohibited } = check;
  const now = new Date();
  const isExplicitlyAllowed = allowed.length === 0 ? true : allowed.some((a: string) => action.toLowerCase().includes(a.toLowerCase()));
  const isProhibitedMatch = prohibited.filter((p: string) => action.toLowerCase().includes(p.toLowerCase()));
  const violationFound = isProhibitedMatch.length > 0;
  const ok = !violationFound && isExplicitlyAllowed;
  
  const reason = violationFound
    ? `Boundary VIOLATION: action '${action}' matched prohibited [${isProhibitedMatch.join(", ")}]`
    : isExplicitlyAllowed
      ? `Action '${action}' within allowed actions boundary`
      : `Action '${action}' NOT in allowed list [${allowed.join(", ") || "any"}]`;
  
  // Gunakan control ID kustom jika disediakan, default ke work-core jika tidak
  const govControlId = customControlIds?.govControlId || "EOS-WORKCORE-GOV-02";
  const measureControlId = customControlIds?.measureControlId || "EOS-WORKCORE-MEASURE-02";
  
  const log = {
    decision: `autonomy_boundary_check[${action}]=${ok ? "PASS" : "BLOCK"}`,
    by: actorId,
    at: now,
    reason,
    controlIds: [govControlId],
  };
  
  const stage = {
    stage: "execution",
    recordedAt: now,
    recordedBy: actorId,
    summary: `Autonomy boundary check for '${action}': ${ok ? "PASS" : "BLOCK"}`,
    details: { action, allowed, prohibited, violationFound, isExplicitlyAllowed, matchedProhibited: isProhibitedMatch },
    controlIds: [measureControlId],
  };
  
  return {
    ok,
    violationFound,
    log,
    stage,
    controlsApplied: [measureControlId, govControlId],
  };
}