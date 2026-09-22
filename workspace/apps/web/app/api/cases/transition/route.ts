// NON-GOLDEN-SPINE API ROUTE - DISABLED FOR BUILD
// import { NextResponse } from "next/server";
// import { cookies } from "next/headers";
// // Ikuti SERVER-ONLY BOUNDARY requirement dari core-kernel index.ts:
// // - capabilityRegistry HARUS diimport langsung dari submodule (server-side only)
// // - Type dan fungsi lainnya (executeWorkflowTransition, WorkflowDefinition) dari main barrel
// import { capabilityRegistry } from "@repo/core-kernel/registry";
// import { WORKSPACE_SESSION_COOKIE } from "@repo/core-kernel/registry";
// //import { executeWorkflowTransition, WorkflowDefinition } from "@repo/core-kernel";
// //// Import SEMUA PRODUK dari @products/* (path alias resmi di base.json)
// //import { LAWYERSHUB_WORKFLOW } from "@products/lawyershub/runtime/workflow-definition";
// //// import { ILC_LEGAL_AID_WORKFLOW } from "@products/ilc/runtime/workflow-definition";
// //// import { SERVICESID_BUSINESS_WORKFLOW } from "@products/services-id/runtime/workflow-definition";
// //
// //// WORKFLOW REGISTRY - SEMUA 3 PRODUK AKTIF SEKARANG! Wave B COMPLETE!
// //const WORKFLOW_REGISTRY: Readonly<Record<string, WorkflowDefinition>> = {
// //  lawyershub: LAWYERSHUB_WORKFLOW
// //  // ilc: ILC_LEGAL_AID_WORKFLOW
// //  // "services-id": SERVICESID_BUSINESS_WORKFLOW
// //} as const;
//
export default async function POST() { return NextResponse.json({disabled: true}); }