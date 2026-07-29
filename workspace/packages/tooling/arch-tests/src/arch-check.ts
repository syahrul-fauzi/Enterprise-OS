import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../..");

type Severity = "error" | "warning";

interface Rule {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly severity: Severity;
  readonly check: (ctx: CheckContext) => readonly Violation[];
}

interface Violation {
  readonly ruleId: string;
  readonly file: string;
  readonly message: string;
  readonly evidence?: string;
}

interface CheckContext {
  readonly workspaceRoot: string;
  readonly sourceFiles: readonly SourceFile[];
}

interface SourceFile {
  readonly absPath: string;
  readonly relPath: string;
  readonly layer: LayerTag;
  readonly content: string;
  readonly imports: readonly ImportStatement[];
}

type LayerTag =
  | "app"
  | "capability-experience"
  | "capability-composition"
  | "capability-implementation"
  | "capability-definition"
  | "core-kernel"
  | "core-runtime"
  | "core-registry"
  | "composition"
  | "presentation-ui-system"
  | "presentation-foundation"
  | "config"
  | "tooling"
  | "unknown";

interface ImportStatement {
  readonly specifier: string;
  readonly line: number;
}

function classifyLayer(relPath: string): LayerTag {
  if (relPath.startsWith("apps/")) return "app";
  if (relPath.startsWith("capabilities/")) {
    if (relPath.includes("/experience/")) return "capability-experience";
    if (relPath.includes("/composition/")) return "capability-composition";
    if (relPath.includes("/implementation/")) return "capability-implementation";
    if (relPath.includes("/definition/")) return "capability-definition";
  }
  if (relPath.startsWith("packages/core/kernel/")) return "core-kernel";
  if (relPath.startsWith("packages/core/runtime/")) return "core-runtime";
  if (relPath.startsWith("packages/core/capability-registry/")) return "core-registry";
  if (relPath.startsWith("packages/composition/")) return "composition";
  if (relPath.startsWith("packages/presentation/ui-system/")) return "presentation-ui-system";
  if (relPath.startsWith("packages/presentation/foundation/")) return "presentation-foundation";
  if (relPath.startsWith("packages/tooling/")) return "tooling";
  if (relPath.startsWith("config/")) return "config";
  return "unknown";
}

function collectFiles(dir: string, workspaceRoot: string, out: SourceFile[]): void {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".turbo" || entry === "dist") continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      collectFiles(full, workspaceRoot, out);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) {
      const abs = full;
      const rel = relative(workspaceRoot, abs).replaceAll("\\", "/");
      const layer = classifyLayer(rel);
      if (layer === "unknown") continue;
      if (layer === "config" && !rel.includes("/eslint/") && !rel.includes("/tailwind/")) continue;
      if (rel.endsWith(".d.ts")) continue;
      try {
        const content = readFileSync(abs, "utf8");
        const imports = extractImports(content);
        out.push({ absPath: abs, relPath: rel, layer, content, imports });
      } catch {
        // skip binary / unreadable
      }
    }
  }
}

const IMPORT_RE = /^\s*import\s+(?:[^'";]+?\s+from\s+)?["']([^"']+)["']|^\s*export\s+(?:\*|type\s+\*)?\s*\{[^}]*\}\s*from\s+["']([^"']+)["']|^\s*export\s+\*\s+from\s+["']([^"']+)["']/gm;

function extractImports(content: string): readonly ImportStatement[] {
  const imports: ImportStatement[] = [];
  let match: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((match = IMPORT_RE.exec(content)) !== null) {
    const specifier = (match[1] ?? match[2] ?? match[3]) as string;
    const line = content.slice(0, match.index).split("\n").length;
    imports.push({ specifier, line });
  }
  return imports;
}

function specifierMatches(spec: string, needles: readonly string[]): boolean {
  return needles.some((n) => spec === n || spec.startsWith(n + "/"));
}

const ARCH_01: Rule = {
  id: "ARCH-01",
  title: "Kernel is Agnostic",
  description: "@repo/core-kernel MUST NOT import UI frameworks, presentation packages, or higher runtime layers. Kernel = pure object model + contracts.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const forbidden = [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "next",
      "@repo/presentation-ui-system",
      "@repo/presentation-foundation",
      "@repo/core-runtime",
      "@repo/core-capability-registry",
    ];
    for (const f of sourceFiles) {
      if (f.layer !== "core-kernel") continue;
      for (const imp of f.imports) {
        if (specifierMatches(imp.specifier, forbidden)) {
          violations.push({
            ruleId: "ARCH-01",
            file: f.relPath,
            message: `Kernel must not import "${imp.specifier}". Kernel is pure contract — no UI / no runtime implementation details.`,
            evidence: `line ${imp.line}: import ... from "${imp.specifier}"`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_02: Rule = {
  id: "ARCH-02",
  title: "Presentation is Business-Ignorant",
  description: "packages/presentation/* MUST NOT know about capabilities / business concepts (Case, Document, Legal Domain).",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const forbiddenPrefixes = [
      "../../capabilities/",
      "../capabilities/",
      "@repo/capabilities",
      "capabilities/",
      "/capabilities/",
    ];
    const forbiddenPackages = ["@repo/core-runtime", "@repo/core-capability-registry"];
    for (const f of sourceFiles) {
      if (f.layer !== "presentation-ui-system" && f.layer !== "presentation-foundation") continue;
      for (const imp of f.imports) {
        const s = imp.specifier;
        const isCapabilityRef =
          forbiddenPrefixes.some((p) => s.startsWith(p)) || /capabilities[/\\]/.test(s);
        const isUpperLayerPkg = specifierMatches(s, forbiddenPackages);
        if (isCapabilityRef || isUpperLayerPkg) {
          violations.push({
            ruleId: "ARCH-02",
            file: f.relPath,
            message: `Presentation layer must not import "${s}". UI primitive does not know about capability business domain.`,
            evidence: `line ${imp.line}: import ... from "${s}"`,
          });
        }
      }
      const bizKeywords = /\b(CaseCard|CaseView|CaseWorkspace|DocumentCard|DocumentView|DocumentWorkspace|caseService|documentService|CaseStatus|DocumentStatus|legal-case|legal-document)\b/.test(
        f.content
      );
      if (bizKeywords) {
        const lineMatch = f.content.match(/^(?:[^\n]*\b(?:CaseCard|CaseView|CaseWorkspace|DocumentCard|DocumentView|DocumentWorkspace|caseService|documentService|CaseStatus|DocumentStatus|legal-case|legal-document)\b[^\n]*)$/m);
        const line =
          lineMatch && lineMatch.index !== undefined
            ? f.content.slice(0, lineMatch.index).split("\n").length
            : -1;
        violations.push({
          ruleId: "ARCH-02",
          file: f.relPath,
          message: `Presentation contains business-domain identifier "${
            (lineMatch?.[0] ?? "").trim().slice(0, 120)
          }". These belong inside capabilities/*, not reusable primitives.`,
          evidence: line >= 0 ? `around line ${line}` : undefined,
        });
      }
    }
    return violations;
  },
};

const ARCH_03: Rule = {
  id: "ARCH-03",
  title: "Runtime knows View only (CapabilityDescriptor ABI)",
  description: "packages/core/runtime must not hardcode capability business component names. Runtime uses strategy: extractComponent(descriptor) -> view only.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    for (const f of sourceFiles) {
      if (f.layer !== "core-runtime") continue;
      const bizPatterns = /\b(CaseCard|CaseView|CaseWorkspace|DocumentCard|DocumentView|DocumentWorkspace|caseService|documentService|legal-case|legal-document|CaseStatus|DocumentStatus)\b/;
      const m = bizPatterns.exec(f.content);
      if (m) {
        const line = f.content.slice(0, m.index).split("\n").length;
        violations.push({
          ruleId: "ARCH-03",
          file: f.relPath,
          message: `Runtime must not hardcode domain identifier "${m[1]}". Runtime contracts are CapabilityDescriptor → experience.view (generic).`,
          evidence: `around line ${line}`,
        });
      }
      for (const imp of f.imports) {
        if (imp.specifier.includes("capabilities/") || /capabilities[/\\]/.test(imp.specifier)) {
          violations.push({
            ruleId: "ARCH-03",
            file: f.relPath,
            message: `Runtime must not directly import capabilities code ("${imp.specifier}"). Capabilities are discovered / resolved via Registry adapter only.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_04: Rule = {
  id: "ARCH-04",
  title: "Arrow of Dependency Authority (Uni-direction)",
  description: "Apps → Capability Experience → Business Components → Presentation UI System → Presentation Foundation. Stack: Kernel → Registry → Composition → Runtime. Reverse = illegal.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const DOWN: Record<LayerTag, readonly LayerTag[]> = {
      "app": [
        "capability-experience",
        "capability-composition",
        "capability-implementation",
        "capability-definition",
        "core-runtime",
        "composition",
        "core-registry",
        "core-kernel",
        "presentation-ui-system",
        "presentation-foundation",
        "tooling",
      ],
      "capability-experience": ["capability-composition", "capability-implementation", "core-kernel", "presentation-ui-system", "presentation-foundation"],
      "capability-composition": ["capability-implementation", "composition", "core-kernel"],
      "capability-implementation": ["core-kernel"],
      "capability-definition": [],
      "core-registry": ["core-kernel"],
      "composition": ["core-kernel", "core-registry"],
      "core-runtime": ["core-kernel", "core-registry", "composition"],
      "core-kernel": [],
      "presentation-ui-system": ["presentation-foundation"],
      "presentation-foundation": [],
      "config": [],
      "tooling": ["config"],
      "unknown": [],
    };

    function resolveImportLayer(spec: string): LayerTag | null {
      if (specifierMatches(spec, ["@repo/core-kernel"])) return "core-kernel";
      if (specifierMatches(spec, ["@repo/core-runtime"])) return "core-runtime";
      if (specifierMatches(spec, ["@repo/core-capability-registry"])) return "core-registry";
      if (specifierMatches(spec, ["@repo/composition"])) return "composition";
      if (specifierMatches(spec, ["@repo/presentation-ui-system"])) return "presentation-ui-system";
      if (specifierMatches(spec, ["@repo/presentation-foundation"])) return "presentation-foundation";
      if (specifierMatches(spec, ["@repo/config"])) return "config";
      if (specifierMatches(spec, ["@repo/tooling"])) return "tooling";
      return null;
    }

    for (const f of sourceFiles) {
      if (f.layer === "unknown" || f.layer === "config") continue;
      const allowed = new Set(DOWN[f.layer] ?? []);
      for (const imp of f.imports) {
        const s = imp.specifier;
        if (s.startsWith("node:")) continue;
        if (!s.startsWith(".") && !s.startsWith("@repo/") && !s.startsWith("/") && !s.includes("capabilities")) continue;
        const tag = resolveImportLayer(s);
        if (tag !== null) {
          if (!allowed.has(tag)) {
            violations.push({
              ruleId: "ARCH-04",
              file: f.relPath,
              message: `Layer [${f.layer}] is not authorized to depend on [${tag}] via "${s}". Arrow points down only: see DOWN mapping in ARCH-04.`,
              evidence: `line ${imp.line}`,
            });
          }
          continue;
        }
        if (s.includes("capabilities")) {
          if (f.layer === "app") continue;
          if (f.layer.startsWith("capability")) continue;
          violations.push({
            ruleId: "ARCH-04",
            file: f.relPath,
            message: `Layer [${f.layer}] must not import capability source "${s}". Only Apps and other capabilities may reference capability code.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_05: Rule = {
  id: "ARCH-05",
  title: "Registry Adapter depends only on Kernel Contract",
  description: "@repo/core-capability-registry must not depend on Runtime or Presentation.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const forbidden = ["@repo/core-runtime", "@repo/presentation-ui-system", "@repo/presentation-foundation"];
    for (const f of sourceFiles) {
      if (f.layer !== "core-registry") continue;
      for (const imp of f.imports) {
        if (specifierMatches(imp.specifier, forbidden)) {
          violations.push({
            ruleId: "ARCH-05",
            file: f.relPath,
            message: `Registry adapter must not import "${imp.specifier}". Registry is a Port adapter; it only speaks Kernel ABI.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_06: Rule = {
  id: "ARCH-06",
  title: "Presentation Foundation is Leaf (Platform-Agnostic Assets)",
  description: "tokens/typography/icons/motion are reusable across Web/Mobile/Email/PDF. Must not depend on components or core logic.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const forbidden = [
      "@repo/presentation-ui-system",
      "@repo/core-kernel",
      "@repo/core-runtime",
      "@repo/core-capability-registry",
      "react",
      "react-dom",
      "next",
    ];
    for (const f of sourceFiles) {
      if (f.layer !== "presentation-foundation") continue;
      for (const imp of f.imports) {
        if (specifierMatches(imp.specifier, forbidden)) {
          violations.push({
            ruleId: "ARCH-06",
            file: f.relPath,
            message: `Foundation (platform-agnostic tokens) must not import "${imp.specifier}". Move this dependency up to UI System component layer.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_07: Rule = {
  id: "ARCH-07",
  title: "Foundation is Design ABI — Zero UI Implementation Details",
  description: "Foundation = type / interface / constant object ONLY. Never React, never Next.js, never Tailwind, never DOM API. Must survive React Native / Mobile / Email renderers.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const forbiddenImports = [
      "react",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "react-dom",
      "react-dom/client",
      "react-dom/server",
      "next",
      "next/link",
      "next/image",
      "next/router",
      "next/navigation",
      "next/headers",
      "tailwindcss",
      "@tailwindcss",
      "postcss",
      "@emotion",
      "styled-components",
    ];
    const forbiddenCodePatterns: readonly [RegExp, string][] = [
      [/\b(useState|useEffect|useMemo|useCallback|useRef|useContext|createContext|useReducer|forwardRef|useLayoutEffect|useImperativeHandle|useId|useSyncExternalStore|useInsertionEffect|useOptimistic|useActionState|useFormStatus)\b/, "React Hook API. Foundation tidak boleh punya runtime behavior / lifecycle coupling."],
      [/(?<!["'`])(React\.|React\s*=|import\s+React\b|from\s+["']react["'])/, "React reference ditemukan. Foundation hanya object/constant/type/enum — tidak bergantung framework UI manapun."],
      [/(?<!["'`])(React\.)?(createElement|Fragment|cloneElement|isValidElement|Children)\b/, "React.createElement / JSX factory / element helpers. Foundation = data, bukan rendering."],
      // eslint-disable-next-line no-useless-escape
      [/(?<!["'`])\b(document|window|navigator|localStorage|sessionStorage|HTMLElement|CSSStyleDeclaration|addEventListener|requestAnimationFrame)\b\s*[.;()\[\]=,]/, "DOM/Browser API call/member access. Platform-specific detail — tidak portabel ke React Native/Email/PDF."],
      [/(?<!["'`])\bclassName\s*[=:]/, "className = React DOM class attribute. Hanya UI System component layer yang boleh pakai."],
      [/\b(@apply|@theme|@tailwind|tailwindcss|useTailwindScan)\b/, "Tailwind directive / function. Foundation tidak tahu tentang Tailwind."],
    ];
    for (const f of sourceFiles) {
      if (f.layer !== "presentation-foundation") continue;
      for (const imp of f.imports) {
        if (specifierMatches(imp.specifier, forbiddenImports)) {
          violations.push({
            ruleId: "ARCH-07",
            file: f.relPath,
            message: `Foundation × Import Terlarang: "${imp.specifier}". Foundation hanya object/constant/type/enum — bukan implementasi UI.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
      for (const [pattern, rationale] of forbiddenCodePatterns) {
        const m = pattern.exec(f.content);
        if (m) {
          const line = m.index !== undefined ? f.content.slice(0, m.index).split("\n").length : -1;
          violations.push({
            ruleId: "ARCH-07",
            file: f.relPath,
            message: `Foundation × Implementation Detail Ditemukan: "${m[0] ?? pattern.source}". ${rationale}`,
            evidence: line >= 0 ? `around line ${line}` : undefined,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_08: Rule = {
  id: "ARCH-08",
  title: "UI System Primitives = Foundation Consumer Only",
  description: "packages/presentation/ui-system/src/atoms dan layouts TIDAK BOLEH hardcode warna hex/rgb, nilai spacing px, radius, shadow di dalam source code. Semua style constants HARUS melalui @repo/presentation-foundation (design tokens + semantic intents).",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const hexColorRe = /#[0-9a-fA-F]{3,8}\b/g;
    const rgbRe = /\brgba?\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+/g;
    const pxNumberRe = /\b\d{2,4}\s*px\b/g;
    const forbiddenTokens = ["white", "black", "gray", "slate", "zinc", "neutral", "stone", "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan", "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"];
    const tailwindColorRe = new RegExp(
      `\\bui:(bg|text|border|ring|shadow|from|via|to|divide)-(${forbiddenTokens.join("|")})-(\\d{2,3}|[0-9]+)\\b`,
      "g"
    );
    const uiSystemFile = (path: string) =>
      path.startsWith("packages/presentation/ui-system/src/atoms/") ||
      path.startsWith("packages/presentation/ui-system/src/layouts/") ||
      path === "packages/presentation/ui-system/src/card.tsx" ||
      path === "packages/presentation/ui-system/src/gradient.tsx";
    for (const f of sourceFiles) {
      if (!uiSystemFile(f.relPath)) continue;
      if (f.relPath.endsWith("/turborepo-logo.tsx")) continue;
      for (const imp of f.imports) {
        if (imp.specifier.startsWith(".")) continue;
      }
      const content = f.content;
      const matches: {
        readonly kind: string;
        readonly match: string;
        readonly line: number;
      }[] = [];
      let m: RegExpExecArray | null;
      hexColorRe.lastIndex = 0;
      while ((m = hexColorRe.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        matches.push({ kind: "Hex Color Hardcoded", match: m[0], line });
      }
      rgbRe.lastIndex = 0;
      while ((m = rgbRe.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        matches.push({ kind: "RGB(A) Color Hardcoded", match: m[0], line });
      }
      pxNumberRe.lastIndex = 0;
      while ((m = pxNumberRe.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        matches.push({ kind: "Px Size Hardcoded (≥10px)", match: m[0], line });
      }
      tailwindColorRe.lastIndex = 0;
      while ((m = tailwindColorRe.exec(content)) !== null) {
        const line = content.slice(0, m.index).split("\n").length;
        matches.push({ kind: "Tailwind Color Utility Hardcoded", match: m[0], line });
      }
      for (const hit of matches.slice(0, 12)) {
        violations.push({
          ruleId: "ARCH-08",
          file: f.relPath,
          message: `${hit.kind} "${hit.match}" ditemukan di primitive UI. Ganti dengan import dari @repo/presentation-foundation via src/foundation adapter (color/spacingPx/radiusPx/elevationPx/resolveIntent). Capability TIDAK BOLEH tahu isi desain.`,
          evidence: `around line ${hit.line}`,
        });
      }
    }
    return violations;
  },
};

const ARCH_09: Rule = {
  id: "ARCH-09",
  title: "Capability CQRS — Commands × Queries Clean Separation",
  description: "Dalam capability/.../implementation: commands TIDAK BOLEH meng-import queries (dan sebaliknya). Capability experience components TIDAK BOLEH meng-import dari commands (write side). Penggunaan domain logic di Experience HANYA boleh lewat contracts + services facade. Capability MINIMAL harus punya contracts + (commands ATAU queries) + services sebagai API.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const capRoot = (rel: string): string | null => {
      const m = rel.match(/^capabilities\/([^/]+)\//);
      return m !== null ? (m[1] ?? null) : null;
    };
    const find = (rel: string, sub: string) => {
      const root = capRoot(rel);
      if (root === null) return false;
      return rel.startsWith(`capabilities/${root}/implementation/${sub}/`);
    };
    const importSpecs = (f: SourceFile) => f.imports.map((i) => i.specifier);
    for (const f of sourceFiles) {
      const root = capRoot(f.relPath);
      if (root === null) continue;
      const spec = importSpecs(f);
      if (find(f.relPath, "commands")) {
        for (const s of spec) {
          if (s.startsWith("./queries") || s.startsWith("../queries") || s.includes("/queries/")) {
            violations.push({
              ruleId: "ARCH-09",
              file: f.relPath,
              message: `Commands file mengimpor dari queries side. CQRS = command dan query HARUS dipisah. Gunakan repository atau contracts share-ability, tidak cross-import.`,
              evidence: `import: ${s}`,
            });
          }
        }
      }
      if (find(f.relPath, "queries")) {
        for (const s of spec) {
          if (s.startsWith("./commands") || s.startsWith("../commands") || s.includes("/commands/")) {
            violations.push({
              ruleId: "ARCH-09",
              file: f.relPath,
              message: `Queries file mengimpor dari commands side. CQRS = command dan query HARUS dipisah.`,
              evidence: `import: ${s}`,
            });
          }
        }
      }
      if (f.layer === "capability-experience") {
        for (const s of spec) {
          if ((s.includes("/commands") || s.endsWith("/commands")) && !s.includes("services")) {
            violations.push({
              ruleId: "ARCH-09",
              file: f.relPath,
              message: `Experience component TIDAK BOLEH import commands langsung. Experience adalah pembaca/read-oriented; gunakan services facade atau queries API. Write side harus lewat service/use-case yang jelas, bukan direct commands coupling.`,
              evidence: `import: ${s}`,
            });
          }
        }
      }
    }
    const capIds = new Set<string>();
    const hasContracts = new Set<string>();
    const hasCommandsOrQueries = new Set<string>();
    const hasServices = new Set<string>();
    for (const f of sourceFiles) {
      const root = capRoot(f.relPath);
      if (root === null) continue;
      capIds.add(root);
      if (find(f.relPath, "contracts")) hasContracts.add(root);
      if (find(f.relPath, "commands") || find(f.relPath, "queries")) hasCommandsOrQueries.add(root);
      if (find(f.relPath, "services")) hasServices.add(root);
    }
    for (const id of Array.from(capIds).sort()) {
      if (!hasContracts.has(id)) {
        violations.push({
          ruleId: "ARCH-09",
          file: `capabilities/${id}`,
          message: `Capability "${id}" BELUM punya contracts/ subfolder. Contracts adalah single source of truth untuk semua domain types (entities, VOs, commands/queries I/O, events) — WAJIB ada.`,
          evidence: `missing contracts/`,
        });
      }
      if (!hasCommandsOrQueries.has(id)) {
        violations.push({
          ruleId: "ARCH-09",
          file: `capabilities/${id}`,
          message: `Capability "${id}" BELUM punya commands/ atau queries/. Minimal harus ada SALAH SATU untuk mengekspos behavior domain yang bisa dikomposisi oleh platform.`,
          evidence: `missing commands/ AND missing queries/`,
        });
      }
      if (!hasServices.has(id)) {
        violations.push({
          ruleId: "ARCH-09",
          file: `capabilities/${id}`,
          message: `Capability "${id}" BELUM punya services/ facade. Services = capability API entry point untuk UI Experience & Runtime; wajib ada sebagai boundary yang stabil.`,
          evidence: `missing services/`,
        });
      }
    }
    return violations;
  },
};

const ARCH_10: Rule = {
  id: "ARCH-10",
  title: "Composition × Runtime Separation — Tugas Tidak Boleh Tumpang Tindih",
  description: "packages/core/runtime HANYA menangani lifecycle: load(workspace) → compose() → mount. Pengetahuan tentang workspace REGION, SLOT, LAYOUT, NAVIGATION HARUS ada di packages/composition/; Runtime TIDAK BOLEH hard-code layout region, orchestration slot, atau navigation tree. Sebaliknya: composition TIDAK BOLEH implement Runtime loader / validator registry internal milik Runtime.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const inRuntime = (rel: string) => rel.startsWith("packages/core/runtime/src/");
    const inComposition = (rel: string) => rel.startsWith("packages/composition/src/");
    const forbiddenInRuntimeKeywords = [
      "RegionKind",
      "NavigationItem",
      "SlotDescriptor",
      "SlotInstance",
      "LayoutDescriptor",
      "Composer",
      "Orchestrator",
      "ComposedRegion",
      "CompositionResult",
      "NavigationDescriptor",
    ];
    for (const f of sourceFiles) {
      if (inRuntime(f.relPath)) {
        const content = f.content;
        const present = forbiddenInRuntimeKeywords.filter((k) => content.includes(k));
        if (present.length > 0) {
          violations.push({
            ruleId: "ARCH-10",
            file: f.relPath,
            message: `Runtime source mengandung Composition concerns: [${present.join(", ")}]. Runtime HANYA boleh tahu tentang CapabilityDescriptor + registry validation + mount. Region/Slot/Layout/Navigation/Composer HARUS delegasikan ke @repo/composition package.`,
            evidence: `composition keywords found in runtime source`,
          });
        }
      }
      if (inComposition(f.relPath)) {
        for (const imp of f.imports) {
          if (imp.specifier.includes("@repo/core-runtime") || imp.specifier.startsWith("../core/runtime") || imp.specifier.startsWith("/core/runtime")) {
            violations.push({
              ruleId: "ARCH-10",
              file: f.relPath,
              message: `Composition mengimpor internal Runtime (${imp.specifier}). Composition contract INDEPENDEN terhadap runtime lifecycle; runtime-lah yang nanti AKAN MENGGUNAKAN composition sebagai library engine.`,
              evidence: `import: ${imp.specifier}`,
            });
          }
        }
      }
    }
    const compositions = sourceFiles.filter((f) => inComposition(f.relPath));
    const requiredSubmodules = [
      "workspace",
      "regions",
      "slots",
      "layouts",
      "navigation",
      "orchestration",
    ];
    const hasSubmoduleContracts = (sub: string): boolean =>
      compositions.some((f) =>
        f.relPath.startsWith(`packages/composition/src/${sub}/`) &&
        (f.content.includes("export interface") ||
          f.content.includes("export type") ||
          f.content.includes("export function"))
      );
    const missingSubmodules = requiredSubmodules.filter((sub) => !hasSubmoduleContracts(sub));
    if (missingSubmodules.length > 0) {
      violations.push({
        ruleId: "ARCH-10",
        file: "packages/composition/src",
        message: `Alpha.6 contract: package composition kurang sub-modules kontrak untuk [${missingSubmodules.join(", ")}]. Setiap sub-module harus expose type kontrak interface/type minimal agar Composition Engine bisa bekerja.`,
        evidence: `missing contracts in: ${missingSubmodules.join(", ")}`,
      });
    }
    return violations;
  },
};

const ARCH_11: Rule = {
  id: "ARCH-11",
  title: "Capability Vocabulary Separation — Atomic Design Hanya Hidup di UI System",
  description: "Di dalam capabilities/ (definition / implementation / experience) TIDAK BOLEH mengenal istilah 'atom', 'molecule', 'organism', 'template', 'pattern' (vocabulary Atomic Design). Capability menggunakan vocabulary BISNIS: Component / Workspace / View / Routes.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const atomicWords = [
      { word: "atom", strict: true },
      { word: "molecule", strict: true },
      { word: "organism", strict: true },
      { word: "template", strict: true },
      { word: "AtomicDesign", strict: true },
    ];
    const capFile = (rel: string) =>
      rel.startsWith("capabilities/") ||
      rel.startsWith("packages/core/") ||
      rel.startsWith("packages/composition/");
    for (const f of sourceFiles) {
      if (!capFile(f.relPath)) continue;
      const lowered = f.content;
      for (const { word } of atomicWords) {
        const re = new RegExp(`\\b${word}\\b`, "i");
        const m = re.exec(lowered);
        if (m) {
          const line = m.index !== undefined ? lowered.slice(0, m.index).split("\n").length : -1;
          violations.push({
            ruleId: "ARCH-11",
            file: f.relPath,
            message: `Ditemukan vocabulary Atomic Design "${m[0] ?? word}" di luar presentation/ui-system/. Capability / Core / Composition TIDAK BOLEH mengenal istilah ini. Ganti dengan vocabulary bisnis: Business Component / Workspace / View / Routes / Region / Slot.`,
            evidence: line >= 0 ? `around line ${line}` : undefined,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_12: Rule = {
  id: "ARCH-12",
  title: "Experience Mini-Frontend Contract — Routes wajib ada",
  description: "Setiap capability wajib punya experience/routes/ subfolder (Alpha.5 mini-frontend spec. Capability bukan sekadar component — ia mini-product yang punya routing entry sendiri: default, list, detail, create, dll (minimal file types contract).",
  severity: "warning",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const capIds = new Set<string>();
    const hasRoutes = new Set<string>();
    const find = (rel: string, sub: string): string | null => {
      const m = rel.match(/^capabilities\/([^/]+)\//);
      if (m === null) return null;
      const root = m[1] ?? null;
      if (root === null) return null;
      if (!rel.startsWith(`capabilities/${root}/${sub}/`)) return null;
      return root;
    };
    for (const f of sourceFiles) {
      const rootF = find(f.relPath, "experience");
      if (rootF !== null) {
        capIds.add(rootF);
        if (f.relPath.includes("/routes/")) hasRoutes.add(rootF);
      }
    }
    for (const id of Array.from(capIds).sort()) {
      if (!hasRoutes.has(id)) {
        violations.push({
          ruleId: "ARCH-12",
          file: `capabilities/${id}/experience`,
          message: `Capability "${id}" BELUM punya experience/routes/. Mini-Frontend perlu routes untuk mapping default experience, list, detail, create entry points.`,
          evidence: `missing routes/`,
        });
      }
    }
    return violations;
  },
};

const ARCH_13: Rule = {
  id: "ARCH-13",
  title: "Composition = Application Engine — React-Free / Presentation-Free",
  description: "packages/composition adalah Application Composition Engine. IA HANYA MENGETAHUI Workspace, Region, Slot, Layout, Navigation, Capability Mount. IA TIDAK BOLEH tahu React, JSX, atau presentation packages. Composition menghasilkan WorkspaceGraph (descriptor data). Runtime yang melakukan render.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const PRESENTATION_IMPORTS = ["react", "react-dom", "react/jsx-runtime", "@repo/presentation-ui-system", "@repo/presentation-foundation"];
    const PRESENTATION_LAYERS: LayerTag[] = ["presentation-ui-system", "presentation-foundation", "capability-experience"];
    for (const f of sourceFiles) {
      if (f.layer !== "composition") continue;
      for (const imp of f.imports) {
        const s = imp.specifier;
        if (PRESENTATION_IMPORTS.some((pi) => s === pi || s.startsWith(`${pi}/`))) {
          violations.push({
            ruleId: "ARCH-13",
            file: f.relPath,
            message: `packages/composition TIDAK BOLEH meng-import presentation package "${s}". Composition hanya bergantung pada Kernel + Registry. Arrow: Composition → Runtime → Presentation, NEVER Composition → React.`,
            evidence: `line ${imp.line}`,
          });
          continue;
        }
        const tag = (() => {
          if (s.startsWith("node:")) return null;
          if (s.startsWith("@repo/core-kernel")) return "core-kernel";
          if (s.startsWith("@repo/core-runtime")) return "core-runtime";
          if (s.startsWith("@repo/core-capability-registry")) return "core-registry";
          if (s.startsWith("@repo/composition")) return "composition";
          if (s.startsWith("@repo/presentation-ui-system")) return "presentation-ui-system";
          if (s.startsWith("@repo/presentation-foundation")) return "presentation-foundation";
          return null;
        })();
        if (tag !== null && PRESENTATION_LAYERS.includes(tag)) {
          violations.push({
            ruleId: "ARCH-13",
            file: f.relPath,
            message: `packages/composition illegal import presentation layer "${s}" via tag=${tag}. Composition = descriptor, NEVER presentation consumer.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_14: Rule = {
  id: "ARCH-14",
  title: "Capability 4-Boundary — definition | implementation | composition | experience (Workspace Descriptor First, Not React Container)",
  description: "Capability 4 boundary: definition (yaml/id) × implementation (CQRS) × composition (workspace descriptor BUKAN React) × experience (React UI). Capability yang punya experience/ WAJIB sudah punya composition/ (Alpha.6 minimal skeleton). Workspace = WorkspaceDescriptor {layout, regions, slots, navigation} BUKAN React Component.",
  severity: "warning",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const capIds = new Set<string>();
    const hasExperience = new Set<string>();
    const hasComposition = new Set<string>();
    const capRoot = (rel: string): string | null => {
      const m = rel.match(/^capabilities\/([^/]+)\//);
      return m !== null ? (m[1] ?? null) : null;
    };
    for (const f of sourceFiles) {
      const root = capRoot(f.relPath);
      if (root === null) continue;
      capIds.add(root);
      if (f.layer === "capability-experience") hasExperience.add(root);
      if (f.layer === "capability-composition") hasComposition.add(root);
    }
    for (const id of Array.from(capIds).sort()) {
      if (hasExperience.has(id) && !hasComposition.has(id)) {
        violations.push({
          ruleId: "ARCH-14",
          file: `capabilities/${id}`,
          message: `Capability "${id}" punya experience/ tapi BELUM punya composition/ (Alpha.6 Descriptor-First spec). Workspace Descriptor (composition/workspace.ts) BUKAN React component — ia object literal: {layout, regions, slots, navigation}. Experience/Workspaces/*.tsx adalah UI dan akan dipindahkan orchestration logic ke composition/ secara bertahap.`,
          evidence: `missing composition/ skeleton (descriptor-only, no-react)`,
        });
      }
    }
    const REACT_IMPORTS = ["react", "react-dom", "react/jsx-runtime"];
    const PRESENTATION_PACKAGES = ["@repo/presentation-ui-system", "@repo/presentation-foundation"];
    for (const f of sourceFiles) {
      if (f.layer !== "capability-composition") continue;
      for (const imp of f.imports) {
        const s = imp.specifier;
        if (REACT_IMPORTS.some((ri) => s === ri || s.startsWith(`${ri}/`))) {
          violations.push({
            ruleId: "ARCH-14",
            file: f.relPath,
            message: `capabilities/*/composition/ TIDAK BOLEH meng-import React (${s}). composition/ = WorkspaceDescriptor plain object. React hanya di experience/.`,
            evidence: `line ${imp.line}`,
          });
        }
        if (PRESENTATION_PACKAGES.some((pp) => s === pp || s.startsWith(`${pp}/`))) {
          violations.push({
            ruleId: "ARCH-14",
            file: f.relPath,
            message: `capabilities/*/composition/ TIDAK BOLEH meng-import presentation package (${s}). Composition hanya object descriptor.`,
            evidence: `line ${imp.line}`,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_15: Rule = {
  id: "ARCH-15",
  title: "Composition Determinism — Compiler = Pure Function (Descriptor → Graph)",
  description: "packages/composition dan capabilities/*/composition TIDAK BOLEH melakukan impure side effects: baca process.env/env, localStorage, React Context, globalThis/global singleton state, HTTP fetch/XMLHttpRequest/WebSocket. Composition hanya bergantung pada Descriptor, Kernel Contracts, Capability Registry (sebagai immutable input) dan Resolver Context deterministic (pure snapshot). compose(A) selalu output identik utk input identik: snapshot testable, cacheable, offline compilable.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const FORBIDDEN: readonly { readonly re: RegExp; readonly label: string; readonly evidence: string }[] = [
      { re: /\bprocess\.env\b/, label: "process.env", evidence: "baca environment variable di composition" },
      { re: /\bimport\.meta\.env\b/, label: "import.meta.env", evidence: "baca vite/env module env di composition" },
      { re: /\bDeno\.env\b/, label: "Deno.env", evidence: "baca environment variable Deno di composition" },
      { re: /\blocalStorage\b/, label: "localStorage", evidence: "akses localStorage (browser state) di composition" },
      { re: /\bsessionStorage\b/, label: "sessionStorage", evidence: "akses sessionStorage (browser state) di composition" },
      { re: /\bindexedDB\b/, label: "indexedDB", evidence: "akses indexedDB (browser storage) di composition" },
      { re: /\bcaches\s*\.\s*open\b/, label: "caches.open", evidence: "akses Cache API (HTTP cache) di composition" },
      { re: /\buseContext\s*\(/, label: "React.useContext", evidence: "akses React Context di composition" },
      { re: /\bcreateContext\s*\(/, label: "React.createContext", evidence: "membuat React Context di composition" },
      { re: /\bglobalThis\s*\./, label: "globalThis.singleton", evidence: "akses globalThis singleton state di composition" },
      { re: /\bglobal\s*\./, label: "global.singleton", evidence: "akses global singleton state di composition" },
      { re: /\bwindow\s*\.\s*(localStorage|sessionStorage|document|location|navigator|caches|fetch|addEventListener)\b/, label: "window.*", evidence: "akses window browser state/API di composition" },
      { re: /\bdocument\s*\.\s*(cookie|getElement|querySelector|location)/, label: "document.*", evidence: "akses DOM/document state di composition" },
      { re: /\bfetch\s*\(/, label: "fetch()", evidence: "HTTP request (async network) di composition — tidak deterministik" },
      { re: /\bXMLHttpRequest\b/, label: "XMLHttpRequest", evidence: "HTTP request di composition" },
      { re: /\bWebSocket\s*\(/, label: "WebSocket", evidence: "network socket di composition" },
      { re: /\bsetTimeout\s*\(|\bsetInterval\s*\(/, label: "setTimeout/setInterval", evidence: "timer based scheduling di composition — bergantung pada wall-clock" },
      { re: /\bMath\.random\s*\(/, label: "Math.random()", evidence: "non-deterministic random di composition — ganti dengan seed dari Resolver Context jika perlu" },
      { re: /\bcrypto\.getRandomValues\s*\(/, label: "crypto.getRandomValues()", evidence: "non-deterministic crypto random di composition" },
    ];
    for (const f of sourceFiles) {
      if (f.layer !== "composition" && f.layer !== "capability-composition") continue;
      for (const rule of FORBIDDEN) {
        const m = rule.re.exec(f.content);
        if (m) {
          const line = f.content.slice(0, m.index).split("\n").length;
          violations.push({
            ruleId: "ARCH-15",
            file: f.relPath,
            message: `[${rule.label}] ${rule.evidence}. Composition = pure compiler: compose(A) ⇉ same output for same input. Side effects / non-determinism hanya boleh di Runtime / Presentation.`,
            evidence: `around line ${line}`,
          });
        }
      }
    }
    return violations;
  },
};

const RULES: readonly Rule[] = [ARCH_01, ARCH_02, ARCH_03, ARCH_04, ARCH_05, ARCH_06, ARCH_07, ARCH_08, ARCH_09, ARCH_10, ARCH_11, ARCH_12, ARCH_13, ARCH_14, ARCH_15];

function printResults(results: readonly { readonly rule: Rule; readonly violations: readonly Violation[] }[]): boolean {
  const bySeverity = { error: 0, warning: 0 };
  let rulesChecked = 0;
  for (const { rule, violations } of results) {
    rulesChecked += 1;
    bySeverity[rule.severity] += violations.length;
  }
  const headerSeperator = "=".repeat(78);
  const subSeparator = "-".repeat(78);
  console.log(headerSeperator);
  console.log("EOS Architecture Fitness Gate");
  console.log(headerSeperator);
  console.log(`Workspace: ${WORKSPACE_ROOT}`);
  console.log(`Rules: ${RULES.length}  ·  Scanned files: ${(globalThis as { __fileCount?: number }).__fileCount ?? results.length}`);
  console.log(subSeparator);
  for (const { rule, violations } of results) {
    const pass = violations.length === 0;
    const marker = pass ? "  [PASS]" : `  [FAIL · ${violations.length}]`;
    const color = pass ? "\x1b[32m" : "\x1b[31m";
    const reset = "\x1b[0m";
    console.log(`${color}${marker}${reset}  ${rule.id}  ${rule.title}`);
    if (!pass) {
      console.log(`        ${rule.description}`);
      for (const v of violations.slice(0, 6)) {
        console.log(`        · ${v.file}${v.evidence ? `  (${v.evidence})` : ""}`);
        console.log(`          → ${v.message}`);
      }
      if (violations.length > 6) {
        console.log(`        · ...and ${violations.length - 6} more`);
      }
    }
  }
  console.log(subSeparator);
  const totalErrors = bySeverity.error;
  const totalWarnings = bySeverity.warning;
  const pass = totalErrors === 0;
  console.log(
    `${pass ? "\x1b[32m" : "\x1b[31m"}Result: ${
      pass ? "ARCHITECTURE GATE PASSED" : "ARCHITECTURE GATE FAILED"
    }${"\x1b[0m"} · errors=${totalErrors} · warnings=${totalWarnings} · rules=${rulesChecked}/${RULES.length}`
  );
  return pass;
}

async function main(): Promise<number> {
  if (!existsSync(WORKSPACE_ROOT)) {
    console.error(`Workspace root not found: ${WORKSPACE_ROOT}`);
    return 2;
  }
  const sourceFiles: SourceFile[] = [];
  for (const sub of ["apps", "capabilities", "packages", "config"]) {
    const p = join(WORKSPACE_ROOT, sub);
    if (existsSync(p)) collectFiles(p, WORKSPACE_ROOT, sourceFiles);
  }
  (globalThis as { __fileCount?: number }).__fileCount = sourceFiles.length;
  const ctx: CheckContext = { workspaceRoot: WORKSPACE_ROOT, sourceFiles };
  const results = RULES.map((rule) => ({ rule, violations: rule.check(ctx) }));
  const ok = printResults(results);
  return ok ? 0 : 1;
}

process.exitCode = await main();
