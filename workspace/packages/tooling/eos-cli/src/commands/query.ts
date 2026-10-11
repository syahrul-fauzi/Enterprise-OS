import { evaluateEnterpriseQuery, loadEnterpriseQueryArtifacts } from "../enterprise-query-runtime.js";
import { parseArgs } from "node:util";

export async function runEnterpriseQueryCommand(args: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args,
    options: {
      output: { type: "string", short: "o" },
    },
    allowPositionals: true,
  });

  const rawQuery = positionals[0] ?? "";
  const query = rawQuery.trim();
  if (query.length === 0) {
    process.stderr.write(
      "Usage: pnpm eos query '<QUERY>' [--output json]\n" +
        "Examples:\n" +
        "  pnpm eos query 'SHOW capabilities WHERE dependency_health_status = WARN'\n" +
        "  pnpm eos query 'TRACE certificate abc123' --output json\n" +
        "  pnpm eos query 'IMPACT capability governance-read-model'\n" +
        "  pnpm eos query 'WHY gate-c = WARN'\n",
    );
    return 1;
  }

  const artifacts = loadEnterpriseQueryArtifacts();
  const result = evaluateEnterpriseQuery({
    rawQuery: query,
    graph: artifacts.graph,
    gateCStatus: artifacts.gateCStatus,
  });

  // Output formatting sesuai flag
  if (values.output === "json") {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
  return 0;
}