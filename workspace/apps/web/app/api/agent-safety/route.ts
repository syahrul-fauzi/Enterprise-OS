import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const correlationId = request.headers.get("x-correlation-id") || `agent-safety-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const host = request.headers.get("host")?.split(":")[0] || "localhost";
  
  const agentSafetyResponse = {
    status: "operational",
    service: "eos-agent-safety",
    correlationId,
    product: {
      requestHost: host,
    },
    agent: {
      autonomyLevels: ["L0 - Observe", "L1 - Interpret", "L2 - Recommend", "L3 - Request Authorization", "L4 - Auto-Execute Within Policy", "L5 - Multi-Step Autonomous Execution Within Policy"],
      handoffThresholdHours: 18,
      scanIntervalMinutes: 60,
      enableAutomaticNotifications: true,
      enableEscalations: true,
    },
    budget: {
      totalBudget: 125000000,
      budgetReserved: 0,
      budgetUsed: 0,
      maxMonthlyBudget: 10000000,
    },
    permissions: {
      allowedActions: ["collect_metrics", "analyze_logs", "schedule_reboot", "track_restoration"],
      prohibitedActions: ["modify_production_config", "delete_critical_logs", "reboot_without_verification"],
    },
    escalation: {
      escalationRules: ["Defect reproduktif pada foundation", "Konflik requirement", "Risiko keamanan atau data", "Keputusan bisnis yang hanya dapat diputuskan manusia"],
    },
    timestamp: new Date().toISOString(),
  };

  const response = NextResponse.json(agentSafetyResponse, { status: 200 });
  response.headers.set("x-eos-correlation-id", correlationId);
  response.headers.set("x-eos-request-host", host);
  
  return response;
}