import { NextResponse } from "next/server";
import { OrphanCommunicationScanner } from "../../../../../../../capabilities/communication/implementation/observability/orphan.scanner";

// On-demand scan endpoint for WORK-017 observability
// Can be triggered from Work Reality Surface or CI/CD pipelines
export async function GET() {
  try {
    const report = await OrphanCommunicationScanner.scan();
    
    // Return report with compliance status
    return NextResponse.json({
      success: true,
      report,
      // Add EOS thesis alignment metadata
      eos_compliance: report.compliance_score === 100 ? "FULLY_COMPLIANT" : "PARTIALLY_COMPLIANT",
      core_thesis_enforced: "All communication must be grounded in Work"
    }, { status: 200 });
  } catch (error) {
    console.error("[OrphanScanAPI] Scan failed:", error);
    return NextResponse.json({ 
      error: "Failed to scan for orphan communication",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}