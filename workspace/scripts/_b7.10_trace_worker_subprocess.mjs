import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const runtimeDistPath = resolve(
  __dirname,
  "..",
  "packages",
  "core",
  "runtime",
  "dist",
  "index.js"
);

const decisionId = process.argv[2];
if (!decisionId) {
  console.error("Missing decisionId argument");
  process.exit(2);
}

const { traceExecutionByDecision } = await import(runtimeDistPath);
const result = traceExecutionByDecision(decisionId);
process.stdout.write(JSON.stringify(result) + "\n");
process.exit(0);
