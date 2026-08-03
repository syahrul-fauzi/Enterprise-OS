import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function requireMatch(source: string, pattern: RegExp, label: string): void {
  if (!pattern.test(source)) {
    fail(`Missing ${label}`);
  }
}

function main(): void {
  const input = process.argv[2];
  if (!input) {
    fail("Usage: validate-composition-package <package-dir>");
  }

  const packageDir = resolve(process.cwd(), input);
  const manifestPath = resolve(packageDir, "manifest.yaml");
  const metadataPath = resolve(packageDir, "metadata.yaml");
  const workspacePath = resolve(packageDir, "workspace.ts");

  for (const filePath of [manifestPath, metadataPath, workspacePath]) {
    if (!existsSync(filePath)) {
      fail(`Missing required file: ${filePath}`);
    }
  }

  const manifest = readFileSync(manifestPath, "utf8");
  const metadata = readFileSync(metadataPath, "utf8");
  const workspace = readFileSync(workspacePath, "utf8");

  requireMatch(manifest, /^id:\s+\S+/m, "manifest id");
  requireMatch(manifest, /^extends:\s*$/m, "manifest extends");
  requireMatch(manifest, /^patterns:\s*$/m, "manifest patterns");
  requireMatch(manifest, /^capabilities:\s*$/m, "manifest capabilities");
  requireMatch(manifest, /^surfaces:\s*$/m, "manifest surfaces");

  requireMatch(metadata, /^name:\s+.+$/m, "metadata name");
  requireMatch(metadata, /^version:\s+.+$/m, "metadata version");
  requireMatch(metadata, /^owner:\s+.+$/m, "metadata owner");

  requireMatch(
    workspace,
    /export const compositionPackage = \{/,
    "workspace composition export",
  );
  requireMatch(
    workspace,
    /export function describeComposition\(\)/,
    "workspace description function",
  );

  console.log(
    JSON.stringify(
      {
        status: "ok",
        packageDir,
        files: ["manifest.yaml", "metadata.yaml", "workspace.ts"],
      },
      null,
      2,
    ),
  );
}

main();
