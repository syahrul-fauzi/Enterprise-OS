// Budget & Economic Intelligence Contracts (EOS 2027 Actor Assurance Standard)
// Defines strategic economic metrics for actor execution measurement

// Strategic Metric Type
export type StrategicMetricType =
  | "LR" // Leverage Ratio - Verified Work Output / Human Hours Invested
  | "CPSW" // Cost per Successful Work - Total Execution Cost / Successfully Verified Work
  | "AR"; // Autonomous Reliability - Successful Autonomous Executions / Total Eligible Executions

// Leverage Ratio (LR) - measures work capacity per human hour
// LR = Verified Work Output / Human Hours Invested
export interface LeverageRatio {
  readonly metricType: "LR";
  readonly verifiedWorkOutput: number; // Unit of work completed and verified
  readonly humanHoursInvested: number; // Total human hours invested
  readonly leverageRatio: number; // Calculated LR value
  readonly baselineManual: number; // Manual baseline for comparison
  readonly improvementFactor: number; // LR / baselineManual
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

// Cost per Successful Work (CPSW) - measures cost efficiency per verified work
// CPSW = Total Execution Cost / Successfully Verified Work
export interface CostPerSuccessfulWork {
  readonly metricType: "CPSW";
  readonly totalExecutionCost: number; // Total cost (tokens, API, human time)
  readonly successfullyVerifiedWork: number; // Number of work items verified successful
  readonly costPerSuccessfulWork: number; // Calculated CPSW value
  readonly currency: string; // Currency (e.g., IDR, USD)
  readonly baselineManual: number; // Manual baseline for comparison
  readonly costReductionFactor: number; // baselineManual / CPSW
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

// Autonomous Reliability (AR) - measures autonomous execution success rate
// AR = Successful Autonomous Executions / Total Eligible Executions
export interface AutonomousReliability {
  readonly metricType: "AR";
  readonly successfulAutonomousExecutions: number; // Executions completed autonomously and verified
  readonly totalEligibleExecutions: number; // Total executions eligible for autonomy
  readonly autonomousReliability: number; // Calculated AR value (0-1)
  readonly humanInterventionRate: number; // 1 - AR (intervention rate)
  readonly periodStart: Date;
  readonly periodEnd: Date;
}

// Combined Strategic Metric type
export type StrategicMetric = LeverageRatio | CostPerSuccessfulWork | AutonomousReliability;

// Execution Cost Breakdown - detailed cost components
export interface ExecutionCostBreakdown {
  readonly totalCost: number;
  readonly tokenCost: number; // LLM token cost
  readonly apiCost: number; // External API cost
  readonly toolCost: number; // Tool usage cost
  readonly humanTimeCost: number; // Human intervention time cost
  readonly retryCost: number; // Retry and rework cost
  readonly otherCost: number; // Other miscellaneous costs
}

// Work Execution Metrics - per-work execution measurement
export interface WorkExecutionMetrics {
  readonly workId: string;
  readonly actorId?: string;
  readonly startTime: Date;
  readonly endTime?: Date;
  readonly executionTimeMs?: number;
  readonly status: "pending" | "running" | "success" | "failed" | "rejected";
  readonly costBreakdown?: ExecutionCostBreakdown;
  readonly humanInterventionRequired: boolean;
  readonly humanInterventionTimeMs?: number;
  readonly retryCount: number;
  readonly evidenceCount: number;
}

// Strategic Metrics Summary - aggregated metrics for a period
export interface StrategicMetricsSummary {
  readonly periodStart: Date;
  readonly periodEnd: Date;
  readonly totalWorkItems: number;
  readonly successfulWorkItems: number;
  readonly failedWorkItems: number;
  readonly averageLeverageRatio: number;
  readonly averageCostPerSuccessfulWork: number;
  readonly averageAutonomousReliability: number;
  readonly totalExecutionCost: number;
  readonly totalHumanHoursInvested: number;
  readonly topPerformingActors: Array<{
    readonly actorId: string;
    readonly profile: string;
    readonly averageLR: number;
    readonly averageAR: number;
    readonly totalWork: number;
  }>;
}

// Strategic Metric Targets - EOS 2027 baseline targets
export const STRATEGIC_METRIC_TARGETS = {
  minimumLeverageRatio: 2.0, // Minimum 2x improvement over manual baseline
  maximumCostPerSuccessfulWorkManualRatio: 0.5, // CPSW ≤ 50% of manual baseline
  minimumAutonomousReliability: 0.85, // Minimum 85% autonomous reliability
  maximumHumanInterventionRate: 0.15, // Maximum 15% human intervention rate
} as const;

/**
 * Calculate Leverage Ratio (LR) from work output and human hours
 * LR = Verified Work Output / Human Hours Invested
 */
export function calculateLeverageRatio(
  verifiedWorkOutput: number,
  humanHoursInvested: number,
  baselineManual: number
): LeverageRatio {
  console.log(`[calculateLeverageRatio] Output=${verifiedWorkOutput}, Hours=${humanHoursInvested}, Baseline=${baselineManual}`);
  
  if (humanHoursInvested <= 0) {
    throw new Error("Human hours invested must be greater than zero");
  }
  
  const leverageRatio = verifiedWorkOutput / humanHoursInvested;
  const improvementFactor = baselineManual > 0 ? leverageRatio / baselineManual : 0;
  
  return {
    metricType: "LR",
    verifiedWorkOutput,
    humanHoursInvested,
    leverageRatio,
    baselineManual,
    improvementFactor,
    periodStart: new Date(),
    periodEnd: new Date(),
  };
}

/**
 * Calculate Cost per Successful Work (CPSW) from total cost and successful work
 * CPSW = Total Execution Cost / Successfully Verified Work
 */
export function calculateCostPerSuccessfulWork(
  totalExecutionCost: number,
  successfullyVerifiedWork: number,
  baselineManual: number,
  currency: string = "IDR"
): CostPerSuccessfulWork {
  console.log(`[calculateCostPerSuccessfulWork] TotalCost=${totalExecutionCost}, SuccessWork=${successfullyVerifiedWork}, Baseline=${baselineManual}`);
  
  if (successfullyVerifiedWork <= 0) {
    throw new Error("Successfully verified work must be greater than zero");
  }
  
  const costPerSuccessfulWork = totalExecutionCost / successfullyVerifiedWork;
  const costReductionFactor = costPerSuccessfulWork > 0 ? baselineManual / costPerSuccessfulWork : 0;
  
  return {
    metricType: "CPSW",
    totalExecutionCost,
    successfullyVerifiedWork,
    costPerSuccessfulWork,
    currency,
    baselineManual,
    costReductionFactor,
    periodStart: new Date(),
    periodEnd: new Date(),
  };
}

/**
 * Calculate Autonomous Reliability (AR) from successful and total executions
 * AR = Successful Autonomous Executions / Total Eligible Executions
 */
export function calculateAutonomousReliability(
  successfulAutonomousExecutions: number,
  totalEligibleExecutions: number
): AutonomousReliability {
  console.log(`[calculateAutonomousReliability] Success=${successfulAutonomousExecutions}, Total=${totalEligibleExecutions}`);
  
  if (totalEligibleExecutions <= 0) {
    throw new Error("Total eligible executions must be greater than zero");
  }
  
  const autonomousReliability = successfulAutonomousExecutions / totalEligibleExecutions;
  const humanInterventionRate = 1 - autonomousReliability;
  
  return {
    metricType: "AR",
    successfulAutonomousExecutions,
    totalEligibleExecutions,
    autonomousReliability,
    humanInterventionRate,
    periodStart: new Date(),
    periodEnd: new Date(),
  };
}

/**
 * Validate if strategic metrics meet EOS 2027 baseline targets
 */
export function validateStrategicMetrics(metrics: StrategicMetricsSummary): boolean {
  console.log(`[validateStrategicMetrics] Checking strategic metrics against baseline targets`);
  
  // Check minimum leverage ratio
  if (metrics.averageLeverageRatio < STRATEGIC_METRIC_TARGETS.minimumLeverageRatio) {
    console.error(`[validateStrategicMetrics] Leverage ratio below target: ${metrics.averageLeverageRatio.toFixed(2)} (target ≥ ${STRATEGIC_METRIC_TARGETS.minimumLeverageRatio})`);
    return false;
  }
  
  // Check autonomous reliability
  if (metrics.averageAutonomousReliability < STRATEGIC_METRIC_TARGETS.minimumAutonomousReliability) {
    console.error(`[validateStrategicMetrics] Autonomous reliability below target: ${(metrics.averageAutonomousReliability * 100).toFixed(1)}% (target ≥ ${STRATEGIC_METRIC_TARGETS.minimumAutonomousReliability * 100}%)`);
    return false;
  }
  
  console.log(`[validateStrategicMetrics] All strategic metrics meet baseline targets`);
  return true;
}