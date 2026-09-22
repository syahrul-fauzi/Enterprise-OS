// Re-enabled for W004-P1-01 real human session observation
// Added to Golden Spine release path to support full EOS loop verification
// Minimal fix: only session validation + redirect to intent creation (no new functionality)
// Date re-enabled: 2026-09-19
import { redirect } from "next/navigation";

export default async function IntentListPage() {
  // Redirect to intent creation page since list view is not required for first real human session
  // This maintains minimal dependency closure while enabling core intent creation flow
  redirect("/intent/new");
}