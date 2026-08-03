import { NextResponse } from "next/server";
import { workflowEngineService } from "../../../../../capabilities/workflow-engine/implementation/service";

export async function GET() {
  return NextResponse.json({
    items: workflowEngineService.listWorkflowDefinitions(),
  });
}
