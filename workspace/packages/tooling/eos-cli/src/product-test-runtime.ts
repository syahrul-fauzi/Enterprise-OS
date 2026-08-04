import type {
  ProductFunctionalTestCase,
  ProductFunctionalTestReport,
} from "./product-evidence-runtime.js";

export function parseTapFunctionalTestReport(
  product: string,
  output: string,
): ProductFunctionalTestReport {
  const testCases = output
    .split("\n")
    .map((line) => {
      const match = line.match(/^ok\s+\d+\s+-\s+(.+)$/);
      return match?.[1]?.trim() ?? null;
    })
    .filter((value): value is string => value !== null)
    .map((name, index) => ({
      id: `TC-${String(index + 1).padStart(3, "0")}`,
      name,
      status: "PASS" as const,
    })) satisfies readonly ProductFunctionalTestCase[];

  const metrics = {
    total: Number(output.match(/^# tests (\d+)$/m)?.[1] ?? testCases.length),
    pass: Number(output.match(/^# pass (\d+)$/m)?.[1] ?? testCases.length),
    fail: Number(output.match(/^# fail (\d+)$/m)?.[1] ?? 0),
    skipped: Number(output.match(/^# skipped (\d+)$/m)?.[1] ?? 0),
    todo: Number(output.match(/^# todo (\d+)$/m)?.[1] ?? 0),
    cancelled: Number(output.match(/^# cancelled (\d+)$/m)?.[1] ?? 0),
  };

  return {
    product,
    status: metrics.pass > 0 && metrics.fail === 0 ? "PASS" : "FAIL",
    reporter: "tap",
    summary: metrics,
    test_cases: testCases,
  };
}
