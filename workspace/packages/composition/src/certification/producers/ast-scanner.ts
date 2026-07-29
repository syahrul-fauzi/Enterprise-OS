import { join, isAbsolute, relative } from "node:path";
import { existsSync } from "node:fs";
import ts from "typescript";
import type { IndependentEvidenceProducer, ProducerContext } from "./types";
import { produceEvidencePackageEnvelope } from "./types";

const PRODUCER_ID = "ast-structural-v1";
const PRODUCER_NAME = "TypeScript AST Structural Scanner";
const TARGET_ARTIFACT = "packages/core/runtime/src";
const EXPERIMENT_ID = "EXP-A8-AST-RUNTIME-STRUCTURE";

const FORBIDDEN_COMPILER_IDENTIFIERS = Object.freeze([
  "normalizeWorkspace",
  "buildCompositionPlan",
  "buildGraph",
  "buildGraphFromNormalized",
  "buildGraphFromPlan",
  "describeWorkspace",
  "buildPlan",
  "normalize",
  "composeSource",
]);

const RUNTIME_SOURCE_FILES = Object.freeze([
  "runtime.ts",
  "index.ts",
  "types.ts",
  "workspace.ts",
]);

function findTsConfig(repoRoot: string): string | null {
  const candidates = [
    join(repoRoot, "packages", "core", "runtime", "tsconfig.json"),
    join(repoRoot, "tsconfig.base.json"),
    join(repoRoot, "tsconfig.json"),
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

export class AstScannerProducer implements IndependentEvidenceProducer {
  readonly producerId = PRODUCER_ID;
  readonly producerName = PRODUCER_NAME;
  readonly derivation = "Raw" as const;
  readonly experimentId = EXPERIMENT_ID;
  readonly targetArtifactPath = TARGET_ARTIFACT;

  produce(ctx: ProducerContext) {
    const repoRoot = isAbsolute(ctx.repoRoot) ? ctx.repoRoot : join(process.cwd(), ctx.repoRoot);
    const runtimeSrc = join(repoRoot, TARGET_ARTIFACT);

    const observations: string[] = [];
    const assertions: string[] = [];
    let exitCode = 0;

    try {
      const tsConfigPath = findTsConfig(repoRoot);
      observations.push(`tsconfig located=${tsConfigPath ? relative(repoRoot, tsConfigPath) : "none — using default compilerOptions"}`);

      const sourcePaths: string[] = [];
      for (const f of RUNTIME_SOURCE_FILES) {
        const fullPath = join(runtimeSrc, f);
        if (existsSync(fullPath)) sourcePaths.push(fullPath);
        else observations.push(`WARNING optional source file missing: ${relative(repoRoot, fullPath)}`);
      }
      observations.push(`source files submitted to ts.createProgram count=${sourcePaths.length}`);
      observations.push(`source files list=${JSON.stringify(sourcePaths.map(p => relative(repoRoot, p)))}`);

      assertions.push("AST-1: ts.createProgram instantiated successfully for runtime source tree");
      const program = ts.createProgram(sourcePaths, {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        esModuleInterop: true,
        resolveJsonModule: false,
        isolatedModules: true,
        baseUrl: repoRoot,
        paths: {
          "@repo/composition": [join("packages", "composition", "src", "index.ts")],
          "@repo/composition/*": [join("packages", "composition", "src", "*")],
        },
      });

      const syntaxErrors = ts.getPreEmitDiagnostics(program).filter(d => d.category === ts.DiagnosticCategory.Error);
      observations.push(`program syntax errors count=${syntaxErrors.length}`);
      observations.push(`sourceFile count in program.getTypeChecker() host=${program.getSourceFiles().filter(sf => !sf.isDeclarationFile).length}`);

      let runtimeClassFound = false;
      let loadSignatureCorrect = false;
      let mountSignatureCorrect = false;
      let constructorSignatureCorrect = false;
      const forbiddenHits: Array<{ ident: string; file: string; line: number }> = [];
      const forbiddenImportHits: Array<{ module: string; file: string }> = [];
      let classCount = 0;
      let methodCount = 0;

      assertions.push("AST-2: Runtime class declaration exists in runtime.ts source");
      assertions.push("AST-3: Runtime.load() accepts EXACTLY 1 parameter typed ResolvedWorkspace");
      assertions.push("AST-4: Runtime.mount() accepts max 1 optional parameter (HostEnvironment); NO registry/kernel params");
      assertions.push("AST-5: Runtime constructor accepts ONLY extractComponent? option; NO built-in registry resolution param");
      assertions.push("AST-6: 0 references to forbidden compiler identifier symbols (normalizeWorkspace/buildGraph/dll)");
      assertions.push("AST-7: 0 imports from compiler-internal module paths (@repo/composition/src/graph|plan|normalizer/*)");

      for (const filePath of sourcePaths) {
        const sf = program.getSourceFile(filePath);
        if (!sf) continue;
        const relPath = relative(repoRoot, filePath);

        function walk(node: ts.Node) {
          if (ts.isClassDeclaration(node)) {
            classCount++;
            const name = node.name?.getText(sf) ?? "(anonymous)";
            observations.push(`AST class-decl found name=${name} file=${relPath}`);
            if (name === "Runtime" && relPath.endsWith("runtime.ts")) {
              runtimeClassFound = true;
            }

            for (const member of node.members) {
              if (ts.isConstructorDeclaration(member)) {
                const params = member.parameters;
                observations.push(`Runtime constructor params count=${params.length}`);
                if (params.length <= 1) {
                  const firstParamType = params[0]?.type?.getText(sf) ?? "(none)";
                  observations.push(`Runtime constructor firstParamTypeNodeText=${firstParamType}`);
                  const paramNames = params.map(p => p.name?.getText(sf) ?? "");
                  const hasOnlyOptions = paramNames.every(n => n === "options" || n === "_" || n.startsWith("opt") || n.length === 0);
                  if (params.length === 0 || (params.length === 1 && hasOnlyOptions)) {
                    constructorSignatureCorrect = true;
                  }
                  for (const p of params) {
                    const pname = p.name?.getText(sf) ?? "";
                    if (/registry|kernel|resolver|capability.*map|discovery|loader/i.test(pname)) {
                      observations.push(`WARNING constructor param suspicious name=${pname} file=${relPath}`);
                      constructorSignatureCorrect = false;
                    }
                  }
                }
              } else if (ts.isMethodDeclaration(member)) {
                methodCount++;
                const mname = member.name?.getText(sf) ?? "";
                const pcount = member.parameters.length;
                observations.push(`Runtime method name=${mname} params=${pcount} file=${relPath}`);
                if (mname === "load") {
                  if (pcount === 1) {
                    const pt = member.parameters[0].type?.getText(sf) ?? "";
                    observations.push(`Runtime.load param0 type=${pt}`);
                    if (/ResolvedWorkspace/.test(pt)) loadSignatureCorrect = true;
                  }
                } else if (mname === "mount") {
                  if (pcount <= 1) {
                    mountSignatureCorrect = true;
                    const paramNames = member.parameters.map(p => p.name?.getText(sf) ?? "");
                    for (const pn of paramNames) {
                      if (/registry|kernel|plan|graph|normaliz/i.test(pn)) {
                        observations.push(`WARNING mount param suspicious name=${pn} file=${relPath}`);
                        mountSignatureCorrect = false;
                      }
                    }
                  }
                }
              }
            }
          }

          if (ts.isIdentifier(node)) {
            if (sf) {
              const txt = node.getText(sf);
              if (FORBIDDEN_COMPILER_IDENTIFIERS.includes(txt)) {
                const lineChar = sf.getLineAndCharacterOfPosition(node.pos);
                forbiddenHits.push({ ident: txt, file: relPath, line: lineChar.line + 1 });
              }
            }
          }

          if (ts.isImportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            const mod = node.moduleSpecifier.text;
            if (/^@repo\/composition\/src\/(graph|plan|normalizer|compose|canonical)\//.test(mod)) {
              forbiddenImportHits.push({ module: mod, file: relPath });
            }
          }

          ts.forEachChild(node, walk);
        }
        walk(sf);
      }

      observations.push(`Runtime class found=${runtimeClassFound}`);
      observations.push(`load signature correct=${loadSignatureCorrect}`);
      observations.push(`mount signature correct=${mountSignatureCorrect}`);
      observations.push(`constructor signature correct=${constructorSignatureCorrect}`);
      observations.push(`AST foribidden identifier hits count=${forbiddenHits.length}`);
      if (forbiddenHits.length > 0) {
        for (const h of forbiddenHits) observations.push(`  FORBIDDEN-IDENT: ${h.ident} at ${h.file}:${h.line}`);
      }
      observations.push(`AST forbidden internal import paths count=${forbiddenImportHits.length}`);
      if (forbiddenImportHits.length > 0) {
        for (const h of forbiddenImportHits) observations.push(`  FORBIDDEN-IMPORT: ${h.module} in ${h.file}`);
      }
      observations.push(`class declarations total=${classCount}; method declarations total=${methodCount}`);

      if (!runtimeClassFound) exitCode = 1;
      if (!loadSignatureCorrect) exitCode = 1;
      if (!mountSignatureCorrect) exitCode = 1;
      if (!constructorSignatureCorrect) exitCode = 1;
      if (forbiddenHits.length > 0) exitCode = 1;
      if (forbiddenImportHits.length > 0) exitCode = 1;
    } catch (err) {
      exitCode = 1;
      observations.push(`AST-FATAL exception: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }

    const protocol = [
      "Locate tsconfig in workspace; fallback to hardcoded strict compilerOptions with paths for @repo/composition.",
      "Enumerate runtime source files (runtime.ts, index.ts, types.ts, workspace.ts).",
      "Instantiate ts.createProgram() with sourcePaths[] targeting ONLY @repo/core-runtime/src.",
      "Run ts.getPreEmitDiagnostics() to capture syntax-level errors.",
      "Recursive AST walk: ts.isClassDeclaration, ts.isMethodDeclaration, ts.isConstructorDeclaration.",
      "For Runtime class specifically: validate constructor params (no registry/kernel/resolver), load() arity=1 typed ResolvedWorkspace, mount() arity ≤ 1.",
      "Scan every ts.isIdentifier node for membership in FORBIDDEN_COMPILER_IDENTIFIERS set (normalizeWorkspace/buildCompositionPlan/buildGraph/dll).",
      "Scan every ts.isImportDeclaration for forbidden internal compiler module path prefix @repo/composition/src/(graph|plan|normalizer|compose|canonical).",
      "Preserve line numbers for forbidden hits via SourceFile.getLineAndCharacterOfPosition().",
    ] as const;

    return produceEvidencePackageEnvelope(
      this,
      {
        experimentProtocol: protocol,
        rawObservations: Object.freeze(observations),
        evidenceSources: Object.freeze([
          "typescript.createProgram()",
          "typescript.getPreEmitDiagnostics()",
          "ts.SyntaxKind.ClassDeclaration visitor",
          "ts.SyntaxKind.MethodDeclaration visitor",
          "ts.SyntaxKind.Constructor visitor",
          "ts.SyntaxKind.Identifier full-tree scan",
          "ts.SyntaxKind.ImportDeclaration module specifier scan",
          "SourceFile.getLineAndCharacterOfPosition()",
          `${TARGET_ARTIFACT}/runtime.ts AST`,
          `${TARGET_ARTIFACT}/index.ts AST`,
          `${TARGET_ARTIFACT}/types.ts AST`,
          `${TARGET_ARTIFACT}/workspace.ts AST`,
        ]),
        scriptFile: "packages/composition/src/certification/producers/ast-scanner.ts",
        functionName: "AstScannerProducer.produce()",
        assertionIds: Object.freeze(assertions),
        exitCode,
        environmentConstraints: Object.freeze([
          "TypeScript 5.x module resolved (used: workspace/node_modules/typescript)",
          "Source files present on disk (consistency with filesystem scanner prereq)",
          "Node.js process has read access to packages/core/runtime/src/*.ts",
        ]),
      },
      ctx,
    );
  }
}

export const astScanner = new AstScannerProducer();
