#!/usr/bin/env tsx
import { glob } from "glob";
import { readFileSync } from "node:fs";
import { relative } from "node:path";

const HARDCODED_PATTERNS = [
  /\/root\/Enterprise-OS\/\.eos-state/g,
  /workspace\/\.eos-state/g,
  /\.eos-state\/current-journey\.yaml/g,
  /['"]\.eos-state['"]/g,
];

async function main() {
  const files = await glob("**/*.{ts,tsx,js,jsx,mjs,cjs}", {
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**", "**/.eos-state/**"],
  });

  const violations: Array<{ file: string; matches: Array<string> }> = [];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const matches: Array<string> = [];

    for (const pattern of HARDCODED_PATTERNS) {
      const found = content.match(pattern);
      if (found) {
        matches.push(...found);
      }
    }

    if (matches.length > 0) {
      violations.push({
        file: relative(process.cwd(), file),
        matches: [...new Set(matches)],
      });
    }
  }

  if (violations.length > 0) {
    console.error(`❌ Ditemukan ${violations.length} file dengan hardcoded state path:`);
    for (const v of violations) {
      console.error(`  - ${v.file}: ${v.matches.join(", ")}`);
    }
    process.exit(1);
  } else {
    console.log("✅ Tidak ada hardcoded state path yang ditemukan");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});