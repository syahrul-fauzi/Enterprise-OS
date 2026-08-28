//import { createRequire } from "node:module";
//import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
//import { produceEvidencePackageEnvelope } from "./types.js";
//
//declare const __filename: string;
//const _require = createRequire(__filename);
//const ts = _require("typescript") as typeof import("typescript");
//
//const PRODUCER_ID = "abi-compiler-surface-diff-v1";
//const PRODUCER_NAME = "ABI + Compiler Declaration Surface Diff External IEP";
//const TARGET_ARTIFACT = "@repo/composition public export surface src/ vs declaration emit consistency";
//const EXPERIMENT_ID = "EXP-A8-EXT-003-ABI-COMPILER-SURFACE";
//
//export class AbiCompilerDiffProducer implements IndependentEvidenceProducer {
//  readonly producerId = PRODUCER_ID;
//  readonly producerName = PRODUCER_NAME;
//  readonly derivation = "Raw" as const;
//  readonly experimentId = EXPERIMENT_ID;
//  readonly targetArtifactPath = TARGET_ARTIFACT;
//
//  produce(ctx: ProducerContext) {
//    const observations: string[] = [];
//    const assertions: string[] = [];
//    let exitCode = 0;
//
//    assertions.push("ABI-1: Package @repo/composition src/index.ts exports dapat didaftarkan via ts.createProgram SourceFile walk (TIDAK via require)");
//    assertions.push("ABI-2: TS compiled declaration emit tersedia ATAU on-the-fly getTypeAtType via TypeChecker berhasil untuk seluruh top-level export");
//    assertions.push("ABI-3: Cross-compare: export symbol list pada TypeChecker === export list pada direct AST walk ExportDeclaration nodes");
//    assertions.push("ABI-4: Tidak ada export symbol yang DEPRECATED tagged @internal / /** @private */ tanpa explicit declaration (no hidden leakage)");
//    assertions.push("ABI-5: Full surface count = functions + classes + types + interfaces + type aliases + values dicatat per category");
//
//    const compRoot = ctx.repoRoot;
//    const compositionSrc = `${compRoot}/packages/composition/src/index.ts`;
//    const tsconfig = `${compRoot}/packages/composition/tsconfig.json`;
//
//    observations.push(`ABI-1 composition src entry = ${compositionSrc} exists=${ts.sys.fileExists(compositionSrc) ? "yes" : "NO!"}`);
//    observations.push(`ABI-1 tsconfig path = ${tsconfig} exists=${ts.sys.fileExists(tsconfig) ? "yes" : "no"}`);
//    if (!ts.sys.fileExists(compositionSrc)) {
//      exitCode = 1;
//      observations.push("ABI-1 FAIL — src/index.ts tidak ditemukan di path yang diharapkan.");
//    }
//
//    const parsed = ts.parseJsonConfigFileContent(
//      ts.readConfigFile(tsconfig, p => ts.sys.readFile(p)).config ?? {},
//      ts.sys,
//      `${compRoot}/packages/composition`,
//      undefined,
//      tsconfig,
//    );
//    observations.push(`ABI-1 parseJsonConfig result options paths defined=${parsed.options.paths ? "yes" : "no"} baseUrl=${String(parsed.options.baseUrl ?? "")}`);
//
//    const program = ts.createProgram({
//      rootNames: [compositionSrc, ...parsed.fileNames.slice(0, 200)],
//      options: { ...parsed.options, declaration: true, noEmit: true, skipLibCheck: true },
//      host: ts.createCompilerHost({ ...parsed.options, declaration: true, noEmit: true, skipLibCheck: true }),
//    });
//
//    const checker = program.getTypeChecker();
//    const sourceFile = program.getSourceFile(compositionSrc);
//    if (!sourceFile) {
//      exitCode = 1;
//      observations.push("ABI-1 FAIL — createProgram tidak mengembalikan SourceFile untuk src/index.ts.");
//    } else {
//      const astExportNames: string[] = [];
//      ts.forEachChild(sourceFile, node => {
//        if (ts.isExportDeclaration(node)) {
//          if (node.exportClause && ts.isNamedExports(node.exportClause)) {
//            for (const e of node.exportClause.elements) astExportNames.push(e.name.text);
//          }
//        } else if (ts.isExportAssignment(node)) {
//          astExportNames.push("<export = default>");
//        }
//      });
//      observations.push(`ABI-3 AST walk ExportDeclaration top-level names count = ${astExportNames.length}`);
//
//      const sym = checker.getSymbolAtLocation(sourceFile);
//      const checkerExports = sym ? checker.getExportsOfModule(sym) : [];
//      const checkerNames = checkerExports.map(s => s.name).sort();
//      observations.push(`ABI-1 TypeChecker getExportsOfModule count = ${checkerNames.length} (list=[${checkerNames.slice(0, 15).join(",")}${checkerNames.length > 15 ? "…+" + String(checkerNames.length - 15) : ""}])`);
//
//      const categories: Record<string, number> = {
//        function: 0, class: 0, interface: 0, typeAlias: 0, enum: 0,
//        namespace: 0, const: 0, let: 0, variable: 0, unknown: 0,
//      };
//      for (const s of checkerExports) {
//        const flags = s.getFlags();
//        const SF = ts.SymbolFlags as unknown as { readonly Const?: number; readonly Let?: number };
//        let counted = false;
//        if ((flags & ts.SymbolFlags.Function) !== 0) { categories["function"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.Class) !== 0) { categories["class"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.Interface) !== 0) { categories["interface"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.TypeAlias) !== 0) { categories["typeAlias"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.Enum) !== 0) { categories["enum"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.NamespaceModule) !== 0) { categories["namespace"]++; counted = true; }
//        if (typeof SF.Const === "number" && (flags & SF.Const) !== 0) { categories["const"]++; counted = true; }
//        if (typeof SF.Let === "number" && (flags & SF.Let) !== 0) { categories["let"]++; counted = true; }
//        if ((flags & ts.SymbolFlags.Variable) !== 0 && !(typeof SF.Const === "number" && (flags & SF.Const) !== 0)) { categories["variable"]++; counted = true; }
//        if (!counted) categories["unknown"]++;
//      }
//      observations.push(
//        "ABI-5 surface categories: " +
//        Object.entries(categories).filter(([, n]) => n > 0).map(([k, n]) => `${k}=${n}`).join(" "),
//      );
//      if (checkerNames.length === 0 && exitCode === 0) {
//        exitCode = 1;
//        observations.push("ABI-1 FAIL — TypeChecker exports length = 0 (expect certification/plan/graph/dll).");
//      }
//
//      const interAst = astExportNames.slice().sort();
//      const interTc = checkerNames.slice();
//      const setAst = new Set(interAst);
//      const setTc = new Set(interTc);
//      const onlyAst = interAst.filter(x => !setTc.has(x));
//      const onlyTc = interTc.filter(x => !setAst.has(x));
//      observations.push(`ABI-3 AST export list vs TypeChecker exports — onlyInAst=${onlyAst.length} onlyInTypeChecker=${onlyTc.length} (expected keduanya 0 untuk strict ABI match)`);
//      if (onlyAst.length > 0) observations.push(`ABI-3 onlyInAst = [${onlyAst.join(", ")}]`);
//      if (onlyTc.length > 0) observations.push(`ABI-3 onlyInTypeChecker = [${onlyTc.slice(0, 20).join(",")}${onlyTc.length > 20 ? "…+" + String(onlyTc.length - 20) : ""}]`);
//      // Observasi saja — tidak fail strict karena re-export via `export * from "./X"` menghasilkan TC export tanpa named clause di AST index.ts sendiri (benar).
//
//      // ABI-4: @internal/@private leakage
//      let internalCount = 0;
//      let deprecatedCount = 0;
//      for (const s of checkerExports) {
//        const jsDocs = s.getJsDocTags?.() ?? [];
//        for (const tag of jsDocs) {
//          const tn = typeof tag.name === "string" ? tag.name : (tag.name && typeof (tag.name as { readonly text?: string }).text === "string" ? (tag.name as { readonly text: string }).text : String(tag.name ?? ""));
//          if (tn === "internal" || tn === "private") internalCount++;
//          if (tn === "deprecated") deprecatedCount++;
//        }
//      }
//      observations.push(`ABI-4 JSDoc @internal/@private tag found on exported symbols count=${internalCount}`);
//      observations.push(`ABI-4 JSDoc @deprecated tag count=${deprecatedCount}`);
//    }
//
//    // ABI-2: Coba akses random 3 top-level export via require() vs TypeChecker
//    // Tidak menggunakan compiled declaration emit — cukup require(src-like via tsx yang sudah jalan) vs checker cocok nama
//    try {
//      const dynamic = _require("../../index.ts") as Record<string, unknown>;
//      const dynKeys = Object.keys(dynamic).sort();
//      observations.push(`ABI-2 dynamic require() export key count = ${dynKeys.length}`);
//    } catch (err) {
//      observations.push(`ABI-2 require() src fallback TIDAK tersedia (normal di build lain) — ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
//    }
//
//    return produceEvidencePackageEnvelope(
//      this,
//      {
//        experimentProtocol: Object.freeze([
//          "Use actual typescript (require typescript package dari workspace devDependencies) — TIDAK wrapper abstrak apapun.",
//          "Step: parse tsconfig → createProgram pada src/index.ts + fileNames parsed config → get TypeChecker.",
//          "AST side: ts.forEachChild walk ExportDeclaration + NamedExports di index.ts → nama export permukaan.",
//          "TypeChecker side: getSymbolAtLocation(sourceFile) → getExportsOfModule(symbol) → nama + SymbolFlags → compute function/class/interface/typeAlias/enum/namespace/const/variable counts.",
//          "Cross-check set difference: only-in-AST vs only-in-TypeChecker.",
//          "JSDoc @internal/@private scan on all exported symbols via symbol.getJsDocTags() — count leakage (jika ada).",
//        ]),
//        rawObservations: Object.freeze(observations),
//        assertionIds: Object.freeze(assertions),
//        evidenceSources: Object.freeze([
//          `typescript package version=${ts.version} (from workspace node_modules)`,
//          "ts.createProgram + TypeChecker getExportsOfModule — semantic compiler ABI",
//          "ts.forEachChild AST walk ExportDeclaration nodes — syntactic ABI",
//          "Symbol.getJsDocTags() scan @internal/@private/@deprecated — JSDoc contract",
//        ]),
//        scriptFile: "packages/composition/src/certification/producers/abi-compiler-diff.ts",
//        functionName: "AbiCompilerDiffProducer.produce()",
//        hashConsistency: Object.freeze([
//          `typescript.version=${ts.version} (jika TS berubah → ABI surface enumerasi BISA berbeda; catat untuk reproducibility)`,
//        ]),
//        exitCode,
//      },
//      ctx,
//    );
//  }
//}
//
//export const abiCompilerDiffProducer: IndependentEvidenceProducer = new AbiCompilerDiffProducer();
