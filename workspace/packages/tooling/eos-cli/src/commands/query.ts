import { evaluateEnterpriseQuery, loadEnterpriseQueryArtifacts } from "../enterprise-query-runtime.js";

export async function runEnterpriseQueryCommand(rawQuery: string): Promise<number> {
  const query = rawQuery.trim();
  if (query.length === 0) {
    process.stderr.write(
      "Usage: pnpm eos query '<QUERY>'\n" +
        "Examples:\n" +
        "  pnpm eos query 'SHOW capabilities WHERE dependency_health_status = WARN'\n" +
        "  pnpm eos query 'TRACE certificate abc123'\n" +
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
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}
