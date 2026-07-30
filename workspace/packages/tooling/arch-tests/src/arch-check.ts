import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "yaml";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, "../../../..");
const EOS_ROOT = resolve(WORKSPACE_ROOT, "..");
const GOVERNANCE_STATE_PATH = resolve(EOS_ROOT, "governance", "GOVERNANCE_STATE.yaml");

const ARCH_LIFECYCLE = z.enum([
  "DRAFT",
  "REVIEWED",
  "VERIFIED",
  "FROZEN",
  "DEPRECATED",
]);

const RepositoryStateSchema = z.object({
  constitution: z.enum(["locked", "unlocked"]),
  governance: ARCH_LIFECYCLE,
  gates: z.object({
    A: ARCH_LIFECYCLE,
    B: ARCH_LIFECYCLE,
    C: ARCH_LIFECYCLE,
    D: ARCH_LIFECYCLE,
    E: ARCH_LIFECYCLE,
  }),
  proof: z.object({
    baseline_hash: z.string(),
    governance_hash: z.string(),
    dependency_hash: z.string(),
    registry_hash: z.string(),
  }),
  readiness: z.object({
    gate_b: z.boolean(),
    gate_c: z.boolean(),
    gate_d: z.boolean(),
    gate_e: z.boolean(),
  }),
  outputs: z.object({
    repository_proof: z.object({
      location: z.string().min(1),
      current_file: z.string().min(1),
      current_status: z.string().min(1),
      generation_rule: z.string().min(1),
      anti_pattern: z.string().min(1),
    }),
    transformation_proofs: z.object({
      location: z.string().min(1),
      anti_pattern: z.string().min(1),
    }),
  }),
});

const GovernanceStateSchema = z.object({
  repository_state: RepositoryStateSchema,
});

type RepositoryState = z.infer<typeof RepositoryStateSchema>;

function loadRepositoryState(): RepositoryState | { readonly loadError: string } {
  if (!existsSync(GOVERNANCE_STATE_PATH)) {
    return {
      loadError: `GOVERNANCE_STATE.yaml not found at ${GOVERNANCE_STATE_PATH}. ACL requires this file as single read model.`,
    };
  }
  try {
    const raw = readFileSync(GOVERNANCE_STATE_PATH, "utf8");
    const parsed = yaml.parse(raw) as unknown;
    const result = GovernanceStateSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `  · ${i.path.join(".")}: ${i.message}`)
        .join("\n");
      return {
        loadError: `repository_state failed schema validation:\n${issues}`,
      };
    }
    return result.data.repository_state;
  } catch (err) {
    return {
      loadError: `failed to parse YAML: ${(err as Error).message}`,
    };
  }
}

const GATE_LABELS: Record<string, string> = {
  A: "Governance",
  B: "Canonical Foundation",
  C: "Execution",
  D: "Verification",
  E: "Experience Surface",
};

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

const ARCH_16: Rule = {
  id: "ARCH-16",
  title: "Single Read Model — ACL reads repository_state, NOT computes its own gate status",
  description: "ACL (arch-check) WAJIB load GOVERNANCE_STATE.yaml dan membaca repository_state sebagai satu-satunya sumber status gate, constitution, dan readiness. ACL tidak boleh menghitung status gate sendiri atau menggunakan variasi vocab (lowercase, status alias).",
  severity: "error",
  check: () => {
    const state = loadRepositoryState();
    const violations: Violation[] = [];
    if ("loadError" in state) {
      violations.push({
        ruleId: "ARCH-16",
        file: "governance/GOVERNANCE_STATE.yaml",
        message: `ACL tidak dapat membaca repository_state. ACL dan CLI dan CI WAJIB membaca file yang sama. Detail: ${state.loadError}`,
        evidence: `source: ${GOVERNANCE_STATE_PATH}`,
      });
      return violations;
    }
    const forbiddenAliases = [
      /\bverified\b/,
      /\bdraft\b/,
      /\breviewed\b/,
      /\bfrozen\b/,
      /\bdeprecated\b/,
      /\bcompleted\b/,
      /\bactive\b/,
      /\bscaffolded\b/,
      /\bspecified\b/,
      /\bconformant\b/,
      /\bdeferred\b/,
      /\bimplemented\b/,
      /\bcanonical\b/,
      /\bsuperseded\b/,
      /\bproposed\b/,
      /\baccepted\b/,
      /\bgenerated\b/,
      /\bmeasured\b/,
      /\bcertified\b/,
      /\bobsolete\b/,
    ];
    const gateStatuses = Object.values(state.gates);
    const foundLower = gateStatuses.some((s) =>
      forbiddenAliases.some((re) => re.test(s))
    );
    if (foundLower) {
      violations.push({
        ruleId: "ARCH-16",
        file: "governance/GOVERNANCE_STATE.yaml > repository_state.gates",
        message: `repository_state.gates ditemukan menggunakan non-canonical lifecycle status. Hanya diperbolehkan: DRAFT, REVIEWED, VERIFIED, FROZEN, DEPRECATED (uppercase).`,
        evidence: `actual values: ${JSON.stringify(state.gates)}`,
      });
    }
    if (state.constitution !== "locked") {
      violations.push({
        ruleId: "ARCH-16",
        file: "governance/GOVERNANCE_STATE.yaml > repository_state.constitution",
        message: `Constitution status harus "locked" selama Sprint 0 Baseline Lock active.`,
        evidence: `actual: ${state.constitution}`,
      });
    }
    return violations;
  },
};

const ARCH_17: Rule = {
  id: "ARCH-17",
  title: "Sprint 0 Architecture Freeze (ADR-000) — NO structural/abstraction changes until T001 deterministic PASS emitted",
  description: "ADR-000 LOCKED. Seluruh struktur SSOT Stack 5-layer, vocabulary 5 lifecycle status, Gate C/D alignment (C=T001, D=Engine), repository proof = output external, serta package structure 11-item pattern TIDAK BOLEH berubah sampai Transformation Proof TRF-PROOF-T001 verdict = PASS dengan determinism terverifikasi 2x run identical input.",
  severity: "error",
  check: (_ctx) => {
    const violations: Violation[] = [];
    const BASELINE_LOCK_PATH = resolve(EOS_ROOT, "governance", "BASELINE_LOCK.yaml");
    const ADR0_PATH = resolve(
      EOS_ROOT,
      "enterprise",
      "decisions",
      "adr",
      "ADR-000-sprint0-architecture-freeze.yaml"
    );
    const DOD_PATH = resolve(EOS_ROOT, "governance", "sprint0-definition-of-done.yaml");
    const proofOutContract = resolve(
      WORKSPACE_ROOT,
      "contracts",
      "repository-proof-output.contract.yaml"
    );
    const evidenceFiles: readonly [string, string][] = [
      [BASELINE_LOCK_PATH, "governance/BASELINE_LOCK.yaml (ssot_stack 5 layers frozen)"],
      [ADR0_PATH, "ADR-000 architecture freeze decision"],
      [DOD_PATH, "sprint0-definition-of-done DOD-001..DOD-006"],
      [proofOutContract, "repository-proof-output.contract.yaml (PROOF = OUTPUT not)"],
    ];
    evidenceFiles.forEach(([p, label]) => {
      if (!existsSync(p)) {
        violations.push({
          ruleId: "ARCH-17",
          file: p,
          message: `Freeze evidence file missing: ${label}. Architecture freeze cannot be verified — FAIL ADR-000 immediately.`,
          evidence: `expected_absolute_path=${p}`,
        });
      }
    });
    if ("loadError" in loadRepositoryState()) {
      return violations;
    }
    const state = loadRepositoryState() as RepositoryState;
    const outputsFound =
      // outputs field ditambahkan di repository_state pasca freeze — kalau tidak ada, freeze tidak dikenali
      (state as unknown as { readonly outputs?: unknown }).outputs !== undefined;
    if (!outputsFound) {
      violations.push({
        ruleId: "ARCH-17",
        file: "governance/GOVERNANCE_STATE.yaml > repository_state",
        message: `repository_state tidak memiliki key 'outputs.repository_proof'. Freeze mengharuskan repo proof = pointer output external, bukan inline.`,
        evidence: `gates=${JSON.stringify(state.gates)}`,
      });
    }
    // ADR-000 thaw_criteria check: T001 belum PASS maka NO scope expansion
    const gateC = state.gates.C;
    if (gateC !== "VERIFIED") {
      // OK, ini kondisi freeze normal — kita TIDAK anggap violation, hanya evidence bahwa freeze aktif
      // Tetapi assert BASELINE_LOCK.yaml .architecture_freeze.effective = true
      if (existsSync(BASELINE_LOCK_PATH)) {
        try {
          const baselineRaw = readFileSync(BASELINE_LOCK_PATH, "utf8");
          const bas = yaml.parse(baselineRaw) as unknown as {
            readonly baseline?: { readonly architecture_freeze?: { readonly effective?: boolean } };
          };
          if (bas.baseline?.architecture_freeze?.effective !== true) {
            violations.push({
              ruleId: "ARCH-17",
              file: "governance/BASELINE_LOCK.yaml > baseline.architecture_freeze.effective",
              message: `Baseline tidak menyatakan architecture freeze. ADR-000 mewajibkan effective=true sampai T001 PASS VERIFIED deterministic.`,
              evidence: `baseline value: ${JSON.stringify(bas.baseline?.architecture_freeze ?? {})}`,
            });
          }
        } catch (err) {
          violations.push({
            ruleId: "ARCH-17",
            file: "governance/BASELINE_LOCK.yaml",
            message: `YAML parse error BASELINE_LOCK.yaml — tidak dapat verifikasi freeze effective flag.`,
            evidence: (err as Error).message,
          });
        }
      }
    }
    return violations;
  },
};

const ARCH_18: Rule = {
  id: "ARCH-18",
  title: "Invariant Architecture — Forbidden Dependency Table (IA-06 × Ontological Triad IA-01)",
  description:
    "8 pasangan Artifact × Forbidden Dependency dari INVARIANT-ARCHITECTURE.yaml IA-06 WAJIB di-enforce. " +
    "Knowledge → Registry → Runtime adalah sumbu ontologis SEARAH. Reverse / cross-tier import = epistemological drift. " +
    "Registry declarations TIDAK BOLEH tahu tentang scheduler/orchestrator. Predicate declarations TIDAK BOLEH baca Runtime Context. " +
    "Ledger TIDAK BOLEH expose mutable storage API (PUT/DELETE/PATCH).",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];

    const INVARIANT_PATH = resolve(EOS_ROOT, "governance", "INVARIANT-ARCHITECTURE.yaml");
    if (!existsSync(INVARIANT_PATH)) {
      violations.push({
        ruleId: "ARCH-18",
        file: "governance/INVARIANT-ARCHITECTURE.yaml",
        message: `File kontrak INVARIANT-ARCHITECTURE.yaml tidak ditemukan. ACL HARUS punya sumber SSOT untuk tabel forbidden dependencies.`,
        evidence: `expected at ${INVARIANT_PATH}`,
      });
    }

    const REGISTRY_SRC = (r: string) =>
      r.startsWith("packages/core/transformation-registry/src/registry/") ||
      r.startsWith("packages/core/predicate-registry/src/registry/");
    const RUNTIME_PKGS = (s: string) =>
      specifierMatches(s, ["@repo/core-runtime"]) ||
      s.includes("packages/core/runtime/") ||
      s.includes("packages/tooling/eos-cli/");
    const ORCHESTRATOR = (s: string) =>
      s.includes("orchestration/") || s.includes("orchestrator") || s.includes("Orchestrator");
    const SCHEDULER = (s: string) =>
      /\bscheduler\b/i.test(s) || /\bScheduler\b/.test(s);
    const MUTABLE_LEDGER = (c: string) =>
      /\b(deleteEntry|removeEntry|updateEntry|patchEntry|replaceEntry|rewriteLedger|reorder|splice.*ledger|ledger\s*\[\s*\w+\s*\]\s*=|ledger\s*\.\s*push\s*\(\s*\{[^}]*hash.*overwrite)/i.test(c);
    const RUNTIME_CONTEXT = (s: string) =>
      /\bRuntimeContext\b/.test(s) || /\bRequestContext\b/.test(s) || /\bExecutionContext\s*&\s*\{/.test(s);

    for (const f of sourceFiles) {
      if (REGISTRY_SRC(f.relPath)) {
        for (const imp of f.imports) {
          const s = imp.specifier;
          if (RUNTIME_PKGS(s)) {
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Registry declaration (${f.relPath}) mengimpor Runtime package "${s}". IA-06: Registry → Scheduler/Runtime = FORBIDDEN. Registry = immutable index.`,
              evidence: `line ${imp.line}: import "${s}"`,
            });
          }
          if (SCHEDULER(s) || ORCHESTRATOR(s)) {
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Registry declaration (${f.relPath}) mengimpor orchestrator/scheduler via "${s}". IA-06: Transformation → Orchestrator; Registry → Scheduler = FORBIDDEN.`,
              evidence: `line ${imp.line}: import "${s}"`,
            });
          }
          if (RUNTIME_CONTEXT(s)) {
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Predicate/Registry declaration mengimpor RuntimeContext/RequestContext via "${s}". IA-06: Predicate → Runtime Context = FORBIDDEN. Predicate = pure truth-function declaration.`,
              evidence: `line ${imp.line}`,
            });
          }
        }
        if (f.relPath.startsWith("packages/core/predicate-registry/src/registry/predicates/")) {
          if (/\bprocess\s*\.\s*env\s*\?/.test(f.content) || /\bglobalThis\s*\.\s*\w+\s*\?/.test(f.content)) {
            const lineMatch = f.content.match(/^.*(process\.env|globalThis\.\w+).*\?$/m);
            const line = lineMatch ? f.content.slice(0, lineMatch.index ?? 0).split("\n").length : -1;
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Predicate declaration berisi conditional env-dependent. IA-06: Predicate → Runtime Context (env globals) = FORBIDDEN. Predicate = pure declaration, context-agnostic.`,
              evidence: line >= 0 ? `around line ${line}` : "conditional env-var access detected",
            });
          }
        }
      }

      if (f.relPath.startsWith("packages/core/proof-ledger/src/")) {
        if (MUTABLE_LEDGER(f.content)) {
          const m = /(deleteEntry|removeEntry|updateEntry|patchEntry|replaceEntry|rewriteLedger|reorder|ledger\s*\[\s*\w+\s*\]\s*=|splice.*ledger)/i.exec(f.content);
          const line = m && m.index !== undefined ? f.content.slice(0, m.index).split("\n").length : -1;
          violations.push({
            ruleId: "ARCH-18",
            file: f.relPath,
            message: `Ledger source berpotensi mutable storage API. IA-06: Ledger → Mutable Storage API (PUT/DELETE/PATCH/replace/reorder/rewrite) = FORBIDDEN. Ledger = append-only audit chain. ONLY APPEND via verified entry.`,
            evidence: line >= 0 ? `around line ${line}` : "mutable ledger pattern detected",
          });
        }
      }

      if (f.relPath.startsWith("packages/core/runtime/src/") || f.relPath.startsWith("packages/tooling/eos-cli/src/")) {
        for (const imp of f.imports) {
          const s = imp.specifier;
          if (s.includes("enterprise/constitution/") || s.includes("enterprise/schema/")) {
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Runtime/CLI source mengimpor Constitution/Schema source directly via "${s}". IA-06: Schema → Engine, Constitution → Runtime = FORBIDDEN. Runtime MUST load via Registry contract_ref filesystem read — NEVER direct import.`,
              evidence: `line ${imp.line}: import "${s}"`,
            });
          }
        }
      }

      if (f.layer === "composition") {
        for (const imp of f.imports) {
          const s = imp.specifier;
          if (/\bexecutor\b/i.test(s) || /\bExecutor\b/.test(s)) {
            violations.push({
              ruleId: "ARCH-18",
              file: f.relPath,
              message: `Composition layer mengimpor Executor via "${s}". IA-03 (Resolver/Executor split) + IA-06 (Contract → Executor FORBIDDEN reverse): Composition = descriptor engine, NOT execution driver. Executor = sibling Runtime component.`,
              evidence: `line ${imp.line}: import "${s}"`,
            });
          }
        }
      }
    }

    return violations;
  },
};

const ARCH_19: Rule = {
  id: "ARCH-19",
  title: "Knowledge Not In Runtime (IA-09): Runtime = Executor of Registry-Defined Knowledge",
  description:
    "Permanent EOS principle: Runtime executes what the Knowledge Layer defines; it never defines knowledge itself. " +
    "Runtime/CLI source TIDAK BOLEH hardcode: Transformation IDs whitelist arrays, Predicate IDs, Capability ID kebab-case strings outside registry lookup parameter, " +
    "Compatibility matrix literals, or Contract zod schemas duplicating YAML schemas. " +
    "Semua pengetahuan domain HARUS ada di manifest.yaml Knowledge/Registry layer.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];

    const TRANSFORM_ID_RE = /["']T\d{3}["']/g;
    const PRED_ID_RE = /["']PRED-[A-Z0-9-]+["']/g;
    const CAP_KEBAB_RE = /["']([a-z]+-[a-z-]+)["']/g;
    const CAPABILITY_BLACKLIST = new Set([
      "legal-case",
      "legal-document",
      "customer-management",
      "identity",
      "case-management",
    ]);

    const ALLOWED_TRANSFORM_CONTEXT_PREFIXES = new Set([
      "getTransformationById",
      "resolve(",
      "resolveRootOfTrust()",
      "isBlocked(",
      "REGISTRY_DOCUMENT",
      "RESOLVER_REGISTRY_DOCUMENT",
      "transformation_id",
      "TRANSFORMATION_ID",
      "implementation_ref",
      "contract_ref",
      "predecessor_id",
      "successor_id",
      "registry",
      "Registry",
      "TRANSFORMATION_REGISTRY",
      "catalog",
      "Catalog",
      "CATALOG_BY_ID",
      "regGetT",
      "regGetP",
      "resolveAll",
      "evidence_output_id",
      "TRF-PROOF-",
      "ROOT_OF_TRUST_TRANSFORMATION_ID",
      'workspace/packages/tooling/',
    ]);

    for (const f of sourceFiles) {
      const isRuntimeOrCli =
        f.relPath.startsWith("packages/core/runtime/src/") ||
        f.relPath.startsWith("packages/tooling/eos-cli/src/");
      const isOrchestrator = f.relPath.includes("orchestration/");
      if (!isRuntimeOrCli && !isOrchestrator) continue;

      for (let m: RegExpExecArray | null;
           (m = TRANSFORM_ID_RE.exec(f.content)) !== null; ) {
        const hit = m[0];
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        const windowSize = 140;
        const start = Math.max(0, (m.index ?? 0) - windowSize);
        const end = Math.min(f.content.length, (m.index ?? 0) + hit.length + windowSize);
        const ctx = f.content.slice(start, end);
        const allowed = [...ALLOWED_TRANSFORM_CONTEXT_PREFIXES].some(
          (kw) => ctx.includes(kw),
        );
        if (!allowed) {
          violations.push({
            ruleId: "ARCH-19",
            file: f.relPath,
            message: `Runtime/CLI/Orchestrator source mengandung hardcoded Transformation ID ${hit} TANPA melalui registry lookup. IA-09: "Pengetahuan ini seharusnya di Knowledge/Registry layer." Pindahkan ke manifest.yaml Registry, runtime hanya lakukan registry lookup by ID parameter dinamis, BUKAN string literal whitelist.`,
            evidence: `around line ${line}: …${ctx.slice(Math.max(0, ctx.length - 80))}…`,
          });
        }
      }

      for (let m: RegExpExecArray | null;
           (m = CAP_KEBAB_RE.exec(f.content)) !== null; ) {
        const hit = m[1] ?? "";
        if (!CAPABILITY_BLACKLIST.has(hit)) continue;
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        const windowSize = 120;
        const start = Math.max(0, (m.index ?? 0) - windowSize);
        const end = Math.min(f.content.length, (m.index ?? 0) + hit.length + windowSize);
        const ctx = f.content.slice(start, end);
        const allowed = ctx.includes("registry") || ctx.includes("Registry") ||
          ctx.includes("Capabilities") || ctx.includes("descriptor") ||
          ctx.includes("capability_id") || ctx.includes("lookup");
        if (!allowed) {
          violations.push({
            ruleId: "ARCH-19",
            file: f.relPath,
            message: `Runtime/Orchestrator source mengandung hardcoded Capability ID kebab-case "${hit}" TANPA registry descriptor context. IA-09: Capability vocab HARUS berasal dari Registry manifest.yaml, BUKAN inline di runtime.`,
            evidence: `around line ${line}: context snippet contains non-registry capability literal`,
          });
        }
      }
    }

    return violations;
  },
};

const ARCH_20: Rule = {
  id: "ARCH-20",
  title: "IA-10 Immutable Knowledge Snapshot Boundary — No Mutable Knowledge Read Post-Plan",
  description:
    "IA-10 formal: Every execution SHALL reference exactly one immutable Knowledge Snapshot (KS-...). " +
    "After planning begins, Planner / Runtime / Validator / Evidence MUST operate exclusively against that snapshot. " +
    "NO live reads of mutable knowledge paths (constitution/, contracts/, governance/*registry manifests/) inside planning-or-later code. " +
    "Resolver/runtime/executor/validator source code files MUST NOT fs.readFileSync from project-relative knowledge directories outside SNAPSHOT extraction path context.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];

    const SNAPSHOT_CONTRACT = resolve(
      EOS_ROOT,
      "workspace",
      "contracts",
      "KNOWLEDGE-SNAPSHOT.contract.yaml",
    );
    if (!existsSync(SNAPSHOT_CONTRACT)) {
      violations.push({
        ruleId: "ARCH-20",
        file: "workspace/contracts/KNOWLEDGE-SNAPSHOT.contract.yaml",
        message: `IA-10 membutuhkan kontrak Knowledge Snapshot. File tidak ditemukan.`,
        evidence: `expected at ${SNAPSHOT_CONTRACT}`,
      });
    }

    const SENSITIVE_KNOWLEDGE_PATTERNS: readonly RegExp[] = [
      /["']\s*(enterprise\/constitution|governance\/(?!GOVERNANCE_STATE|CERTIFICATION_REPORT|ARCHITECTURE_COMPLIANCE|DEPENDENCY_RULES|PACKAGE_AUTHORITY|ARTIFACT_LIFECYCLE|IMPLEMENTATION_DISCIPLINE|SPRINT0|RISK_REGISTER|TECH_DEBT|ISSUE|DECISION|CERTIFICATION|RELEASE|MIGRATION|INVARIANT|DEPLOYMENT|ARCH-CHECK|GET-CONFIG|BASELINE_LOCK|AXIOMS|SCHEMA-COMPLIANCE|ARCHITECTURE_GOVERNANCE|GOVERNANCE_STATE\.yaml))[^"']*["']/,
      /["']\s*workspace\/contracts\/[^"']*["']/,
      /["']\s*enterprise\/schema\/[^"']*["']/,
    ];
    const POST_PLANNING_SRC = (p: string) =>
      p.startsWith("packages/core/runtime/src/") ||
      p.startsWith("packages/tooling/eos-cli/src/") ||
      p.startsWith("packages/core/registry-resolver/src/") ||
      p.startsWith("packages/core/proof-ledger/src/") ||
      p.includes("orchestration/");

    const ALLOWED_LOADER_CONTEXT = new Set([
      "registry-resolver/src/index.ts",
      "registry-resolver/src/loader.ts",
      "registry-resolver/src/catalog-loader.ts",
      "transformation-registry/src/registry/load-manifest.ts",
      "predicate-registry/src/registry/load-manifest.ts",
      "arch-check",
      "arch-tests",
    ]);

    for (const f of sourceFiles) {
      if (!POST_PLANNING_SRC(f.relPath)) continue;
      const allowedLoader = [...ALLOWED_LOADER_CONTEXT].some((kw) =>
        f.relPath.includes(kw),
      );
      if (allowedLoader) continue;
      for (const pat of SENSITIVE_KNOWLEDGE_PATTERNS) {
        const m = pat.exec(f.content);
        if (!m) continue;
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-20",
          file: f.relPath,
          message: `POST-PLANNING layer source (${f.relPath}) membaca mutable knowledge path ${m[0]} secara direct. IA-10 Boundary: Setelah planning dimulai, MUTABLE knowledge artifact tidak boleh memengaruhi runtime/validator/evidence. Baca HANYA dari Knowledge Snapshot (archive extraction target / KS manifest copy), BUKAN project live paths.`,
          evidence: `around line ${line}: embedded knowledge dir path literal: …${m[0].slice(Math.max(0, m[0].length - 60))}…`,
        });
      }
    }

    for (const f of sourceFiles) {
      if (
        !(
          f.relPath.startsWith("packages/core/runtime/src/") ||
          f.relPath.startsWith("packages/core/registry-resolver/src/")
        )
      )
        continue;
      const execPlans = [
        ...f.content.matchAll(/execution[_\s-]?plan/gi),
      ];
      const ksRefs = [...f.content.matchAll(/KS-\d{4}\.\d{2}\.\d{2}\.\d{3}/g)];
      if (execPlans.length > 0) {
        const snapshotIdInOutput = /knowledge_snapshot\s*[:=]\s*["']KS-/.test(f.content);
        const snapshotViaPlan = /\bplan\s*\.\s*knowledge_snapshot\b/.test(f.content);
        if (!snapshotIdInOutput && !snapshotViaPlan) {
          const first = execPlans[0];
          const line = f.content.slice(0, first.index ?? 0).split("\n").length;
          violations.push({
            ruleId: "ARCH-20",
            file: f.relPath,
            message: `Execution Plan dihasilkan atau dikonsumsi TANPA knowledge_snapshot field KS- identifer yang melekat. IA-10: 1 execution = exactly 1 immutable snapshot ID. ExecutionPlan object WAJIB membawa field knowledge_snapshot: KS-YYYY.MM.DD.NNN.`,
            evidence: `around line ${line}: pertama kali execution plan dibentuk/dikonsumsi tanpa snapshot binding`,
          });
        }
      }
      void ksRefs;
    }

    return violations;
  },
};

const ARCH_21: Rule = {
  id: "ARCH-21",
  title: "IA-11 Semantic Determinism — Reasoner/Planner/Serializer MUST NOT depend on external state",
  description:
    "IA-11 formal: Every semantic conclusion SHALL be reproducible from same Knowledge Snapshot and Semantic Kernel. " +
    "Anti-patterns: reasoner/planner source calls Date.now(), Math.random(), fetch(), process.env conditional branches for decision-making, " +
    "or uses for-in iteration without explicit sort (which depends on V8 insertion order heuristic for unordered object keys). " +
    "Deterministic topological sort tie-break MUST use explicit lex-order of transformation_id.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];

    const SK_CONTRACT = resolve(
      EOS_ROOT,
      "enterprise",
      "specifications",
      "SEMANTIC-KERNEL.yaml",
    );
    if (!existsSync(SK_CONTRACT)) {
      violations.push({
        ruleId: "ARCH-21",
        file: "enterprise/specifications/SEMANTIC-KERNEL.yaml",
        message: `IA-11 semantic determinism membutuhkan Semantic Kernel contract sebagai SSOT dari relationship + inference rule definitions. File tidak ditemukan.`,
        evidence: `expected at ${SK_CONTRACT}`,
      });
    }

    const SEMANTIC_PLANNER_SRC = (p: string) =>
      p.startsWith("packages/core/registry-resolver/src/") ||
      p.includes("orchestration/") ||
      p.includes("orchestrator") ||
      p.startsWith("packages/core/runtime/src/") ||
      p.includes("reasoner") ||
      p.includes("planner");

    const NON_DET_CALLS: readonly { readonly sig: RegExp; readonly reason: string }[] = [
      {
        sig: /\bMath\s*\.\s*random\s*\(/,
        reason: "Math.random() = non-deterministic source.",
      },
      {
        sig: /\bDate\s*\.\s*now\s*\(\s*\)/,
        reason: "Date.now() = wall-clock time dependent; NOT semantic determinism.",
      },
      {
        sig: /\bnew\s+Date\s*\(\s*\)\s*(?!\s*\.)/,
        reason: "new Date() tanpa argumen = wall-clock dependent.",
      },
      {
        sig: /\b(?:fetch|axios|XMLHttpRequest|http\.get|https\.get|net\.)\b/,
        reason: "Network IO = external state dependency; breaks IA-11 reproducibility.",
      },
      {
        sig: /\bprocess\s*\.\s*env\s*\?\s*\?/,
        reason: "process.env conditional ternary = environment-dependent semantic branch.",
      },
    ];

    for (const f of sourceFiles) {
      if (!SEMANTIC_PLANNER_SRC(f.relPath)) continue;
      for (const { sig, reason } of NON_DET_CALLS) {
        const m = sig.exec(f.content);
        if (!m) continue;
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-21",
          file: f.relPath,
          message: `Semantic / Planner / Runtime layer memanggil ${m[0]} yang merusak semantic determinism. IA-11: same Snapshot + Semantic Kernel = same semantic conclusions SELALU. ${reason} Pindahkan non-determinism ke boundary input (parameter user / entrypoint wrapper), JANGAN di dalam reasoning / inference / planning core.`,
          evidence: `around line ${line}: match "${m[0].slice(0, 80)}"`,
        });
      }

      const forInMatches = [
        ...f.content.matchAll(/\bfor\s*\(\s*(?:const|let|var)\s+(\w+)\s+in\s+([A-Za-z0-9_$.]+)/g),
      ];
      const matchesWithSort = forInMatches.filter((m) => {
        const start = Math.max(0, (m.index ?? 0) - 180);
        const end = Math.min(f.content.length, (m.index ?? 0) + 600);
        const ctx = f.content.slice(start, end);
        const sorted = /Object\s*\.\s*keys\s*\(\s*\2\s*\)\s*\.\s*sort\s*\(/.test(ctx) ||
          /\.sort\s*\(\s*[a-z]\s*,\s*[a-z]\s*=>\s*[a-z]\s*\.\s*localeCompare\s*\(\s*[a-z]\s*\)/.test(ctx);
        return !sorted;
      });
      if (matchesWithSort.length > 0) {
        const first = matchesWithSort[0];
        const line = f.content.slice(0, first.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-21",
          file: f.relPath,
          message: `for-in iteration atas object keys TANPA explicit .sort() tie-break. IA-11: insertion order iteration = engine-dependent, rapuh terhadap V8 / Bun / Node variance. WAJIB Object.keys(x).sort((a,b) => a.localeCompare(b)) sebelum semantic iteration dijalankan.`,
          evidence: `around line ${line}: for(${first[1]} in ${first[2]}) without .sort()`,
        });
      }
    }

    for (const f of sourceFiles) {
      if (
        !f.relPath.startsWith("packages/core/registry-resolver/src/") &&
        !f.relPath.includes("orchestration/")
      )
        continue;
      const topoMatches = [
        ...f.content.matchAll(/\btopolog(?:ical|y)\b/gi),
      ];
      if (topoMatches.length > 0) {
        const hasExplicitTieBreak = /(transformation_id|node_id|id)\s*\.localeCompare\s*\(/.test(
          f.content,
        );
        const hasSortFn = /\.sort\s*\(\s*(?:\([a-zA-Z,\s_]+\)|[a-zA-Z_]+)\s*=>/.test(
          f.content,
        );
        if (!(hasExplicitTieBreak && hasSortFn) && !hasExplicitTieBreak) {
          const first = topoMatches[0];
          const line = f.content.slice(0, first.index ?? 0).split("\n").length;
          violations.push({
            ruleId: "ARCH-21",
            file: f.relPath,
            message: `Topological sort terdeteksi TANPA explicit tie-break deterministic (transformation_id localeCompare). IA-11: Graph yang sama SELALU menghasilkan execution plan yang sama. Tie-break saat beberapa node = in-degree 0 pada saat yang sama WAJIB menggunakan deterministic ordering = lex order transformation_id.`,
            evidence: `around line ${line}: pertama kali topology sort ditemukan`,
          });
        }
      }
    }

    return violations;
  },
};

const ARCH_22: Rule = {
  id: "ARCH-22",
  title: "IA-13 Stable Intermediate Representations — KIR/DIR/Plan/EPG IRs explicit and versioned",
  description:
    "IA-13 formal: Every transformation between major reasoning stages SHALL produce explicit, versioned, deterministic Intermediate Representation (IR). " +
    "Required IRs: KNOWLEDGE-IR (KIR) contract, DECISION-IR (DIR) contract, EXECUTION-PLAN boundary IR format, EVIDENCE-GRAPH contract. " +
    "Engines exchange IR artifacts, NEVER opaque internal runtime state objects. Every IR carries ir_format_version and ir_content_hash self-consistency.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const contractsDir = resolve(EOS_ROOT, "workspace", "contracts");
    const REQUIRED_IR_CONTRACTS = [
      { key: "KNOWLEDGE_IR", filename: "KNOWLEDGE-IR.contract.yaml" },
      { key: "DECISION_IR", filename: "DECISION-IR.contract.yaml" },
      { key: "KNOWLEDGE_SNAPSHOT", filename: "KNOWLEDGE-SNAPSHOT.contract.yaml" },
      { key: "EVIDENCE_PROVENANCE_GRAPH", filename: "EVIDENCE-PROVENANCE-GRAPH.contract.yaml" },
    ];
    for (const ir of REQUIRED_IR_CONTRACTS) {
      const p = resolve(contractsDir, ir.filename);
      if (!existsSync(p)) {
        violations.push({
          ruleId: "ARCH-22",
          file: `workspace/contracts/${ir.filename}`,
          message: `IA-13 membutuhkan kontrak Intermediate Representation untuk ${ir.key}. Kontrak tidak ditemukan. IR contract WAJIB ada sebagai SSOT sebelum implementasi emitters.`,
          evidence: `expected at ${p}`,
        });
      }
    }

    const SPEC_DIR = resolve(EOS_ROOT, "enterprise", "specifications");
    const PIPELINE_SPEC = resolve(SPEC_DIR, "KNOWLEDGE-COMPILER-PIPELINE.yaml");
    const PASS_SPEC = resolve(SPEC_DIR, "COMPILER-PASSES.spec.yaml");
    if (!existsSync(PIPELINE_SPEC)) {
      violations.push({
        ruleId: "ARCH-22",
        file: "enterprise/specifications/KNOWLEDGE-COMPILER-PIPELINE.yaml",
        message: `IA-13 Knowledge Compiler Pipeline spec tidak ditemukan. Pipeline epistemik (Knowledge→KnowledgeState→SemanticState→DecisionState→ExecutionState→EvidenceState) WAJIB ada sebagai SSOT.`,
        evidence: `expected at ${PIPELINE_SPEC}`,
      });
    }
    if (!existsSync(PASS_SPEC)) {
      violations.push({
        ruleId: "ARCH-22",
        file: "enterprise/specifications/COMPILER-PASSES.spec.yaml",
        message: `IA-13 + IA-14 membutuhkan 8-pass compiler framework specification. Spec tidak ditemukan. Pass purity + IR exchange contracts WAJIB ada di sini.`,
        evidence: `expected at ${PASS_SPEC}`,
      });
    }

    const RESOLVER_OR_PLANNER = (p: string) =>
      p.startsWith("packages/core/registry-resolver/src/") ||
      p.startsWith("packages/core/runtime/src/") ||
      p.includes("orchestration/");
    for (const f of sourceFiles) {
      if (!RESOLVER_OR_PLANNER(f.relPath)) continue;
      if (/\bExecutionPlan\b/.test(f.content) || /execution[_\s-]?plan/i.test(f.content)) {
        const hasFormatVersion = /ir_format_version|plan_format_version|plan\.version|format_version/.test(f.content);
        const hasContentHash = /ir_content_hash|plan_hash|content_hash|plan\.id\b.*sha256/.test(f.content);
        if (!hasFormatVersion && !hasContentHash) {
          const line =
            (f.content.match(/\bExecutionPlan\b/)?.index ??
              f.content.match(/execution[_\s-]?plan/i)?.index ??
              0);
          violations.push({
            ruleId: "ARCH-22",
            file: f.relPath,
            message: `Resolver/Runtime/Planner code berinteraksi dengan Execution Plan TANPA versioned/deterministic IR contract fields. IA-13: setiap IR WAJIB punya ir_format_version + ir_content_hash. Plan TIDAK BOLEH dipertukarkan via untyped anonymous object.`,
            evidence: `around line ${f.content.slice(0, line).split("\n").length}`,
          });
        }
      }
    }

    return violations;
  },
};

const ARCH_23: Rule = {
  id: "ARCH-23",
  title: "IA-14 Pure Compiler Passes — No undeclared state, no upstream mutation, no impurity",
  description:
    "IA-14 formal: Each reasoning pass SHALL be functionally pure with respect to its declared inputs. " +
    "Pass source (compiler passes, planner stages, normalizers) MUST NOT mutate upstream artifacts; MUST NOT depend on undeclared external state. " +
    "Anti-patterns detected: fs.writeFileSync to snapshot paths, env-conditional branches, Date.now, Math.random, fetch, globalThis mutable assignments, " +
    "for-in iteration without explicit sort tie-break, topological sort without localeCompare deterministic ordering.",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const PASS_SRC = (p: string) =>
      p.startsWith("packages/core/registry-resolver/src/") ||
      p.startsWith("packages/core/runtime/src/") ||
      p.startsWith("packages/core/proof-ledger/src/") ||
      p.includes("orchestration/") ||
      p.includes("planner") ||
      p.includes("reasoner") ||
      p.includes("compiler") ||
      p.includes("pass");

    const MUTATION_TO_UPSTREAM = (c: string) =>
      /writeFileSync\s*\(\s*["'][^"']*(enterprise\/(constitution|schema)|workspace\/contracts|enterprise\/execution|enterprise\/specifications\/SEMANTIC-KERNEL\.yaml|governance\/(INVARIANT|BASELINE|AXIOMS))/.test(
        c,
      );

    const NON_DET_CALLS: readonly { readonly sig: RegExp; readonly reason: string }[] = [
      { sig: /\bMath\s*\.\s*random\s*\(/, reason: "Math.random() non-deterministic." },
      { sig: /\bDate\s*\.\s*now\s*\(\s*\)/, reason: "wall-clock dependency." },
      { sig: /\bnew\s+Date\s*\(\s*\)\s*\.?(?!\s*toISO|toJSON.*diagnostic)/, reason: "new Date() without arguments used outside diagnostics context." },
      { sig: /\b(?:fetch|axios|XMLHttpRequest|http\.get|https\.get|net\.)\b/, reason: "network IO external state." },
    ];

    for (const f of sourceFiles) {
      if (!PASS_SRC(f.relPath)) continue;
      if (MUTATION_TO_UPSTREAM(f.content)) {
        const m = /writeFileSync\s*\(\s*["'][^"']*[^"']*["']/.exec(f.content);
        const line =
          m && m.index !== undefined
            ? f.content.slice(0, m.index).split("\n").length
            : -1;
        violations.push({
          ruleId: "ARCH-23",
          file: f.relPath,
          message: `Pass source menulis WRITE upstream artifact (constitution/contracts/schema/semantic-kernel/invariants). IA-14: pass TIDAK BOLEH mutate upstream artifacts. Pass only writes downstream output IRs. Upstream artifacts must be passed as read-only snapshot.`,
          evidence: line >= 0 ? `around line ${line}` : "upstream fs.writeFileSync call pattern detected",
        });
      }

      for (const { sig, reason } of NON_DET_CALLS) {
        const m = sig.exec(f.content);
        if (!m) continue;
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-23",
          file: f.relPath,
          message: `Pass/planner/normalizer source memanggil ${m[0]} yang impurity. IA-14 pure passes tidak boleh bergantung pada undeclared external state. ${reason}. Pindahkan ke input boundary wrapper, JANGAN di dalam pass body.`,
          evidence: `around line ${line}: match "${m[0].slice(0, 80)}"`,
        });
      }

      const envConditionalBranches =
        f.content.match(/\bif\s*\(\s*process\s*\.\s*env\s*[.?!=!<>]|process\s*\.\s*env\s*\?\s*\?/g) ?? [];
      for (const m of envConditionalBranches) {
        const idx = f.content.indexOf(m);
        const line = f.content.slice(0, idx).split("\n").length;
        violations.push({
          ruleId: "ARCH-23",
          file: f.relPath,
          message: `Pass source bergantung pada process.env conditional branch untuk semantic decision. IA-14: semantic logic TIDAK BOLEH env-dependent. Env configs HANYA boleh dibaca di entrypoint wrapper, NOT inside pass body.`,
          evidence: `around line ${line}: pattern ${m}`,
        });
      }

      const globalThisWrites = [...f.content.matchAll(/\b(global|globalThis)\s*\.\s*(\w+)\s*=\s*/g)];
      for (const m of globalThisWrites) {
        const line = f.content.slice(0, m.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-23",
          file: f.relPath,
          message: `Pass source menulis ke globalThis / global mutable state via ${m[0]}. IA-14: pass purity forbids mutable shared state. Pass output via return IR only, NO globals.`,
          evidence: `around line ${line}: global assignment detected`,
        });
      }
    }

    return violations;
  },
};

const ARCH_24: Rule = {
  id: "ARCH-24",
  title: "ASP-02 + Evolution Domains — Authority downward only, artifacts classified, no upward writes",
  description:
    "ASP-02 formal: Authority propagates STRICTLY DOWNWARD Constitution → Specs → Contracts → Protocols → Impl → Evidence. " +
    "No reverse authority. Implementation/Domain-C code MUST NOT directly modify ASP / IA / Evolution-Domains yaml / Protocol contracts. " +
    "ASP-04 / Evolution Domains: 4 meta-governance files WAJIB ada: ASP, EVOLUTION-DOMAINS, PROTOCOL-GOVERNANCE, CONFORMANCE-MODEL. " +
    "All new contracts / spec yamls WAJIB include evolution_domain header field (or explicit mapping in EVOLUTION-DOMAINS.yaml).",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];
    const GOV_DIR = resolve(EOS_ROOT, "governance");
    const META_FILES: readonly { readonly path: string; readonly name: string }[] = [
      { path: resolve(GOV_DIR, "ARCHITECTURAL-STABILITY-PRINCIPLES.yaml"), name: "ASP" },
      { path: resolve(GOV_DIR, "EVOLUTION-DOMAINS.yaml"), name: "Evolution Domains" },
      { path: resolve(GOV_DIR, "PROTOCOL-GOVERNANCE.yaml"), name: "Protocol Governance" },
      { path: resolve(GOV_DIR, "CONFORMANCE-MODEL.yaml"), name: "Conformance Model" },
    ];
    for (const m of META_FILES) {
      if (!existsSync(m.path)) {
        violations.push({
          ruleId: "ARCH-24",
          file: m.path.replace(EOS_ROOT + "/", ""),
          message: `Meta-governance file ${m.name} tidak ditemukan. EOS Evolution Governance Model membutuhkan ke-4 artefak ini agar perubahan arsitektur dapat diaudit jangka panjang.`,
          evidence: `path ${m.path}`,
        });
      }
    }

    const DOWNSTREAM_IMPL_CODE = (p: string) =>
      p.startsWith("packages/core/runtime/src/") ||
      p.startsWith("packages/core/registry-resolver/src/") ||
      p.startsWith("packages/core/execution/src/") ||
      p.startsWith("packages/core/proof-ledger/src/") ||
      p.startsWith("packages/composition/src/") ||
      p.startsWith("apps/") ||
      p.startsWith("capabilities/") ||
      p.includes("cli") ||
      p.includes("orchestration");

    const UPSTREAM_GOV_YAMLS = /["'][^"']*(governance\/(ARCHITECTURAL-STABILITY|INVARIANT-ARCHITECTURE|EVOLUTION-DOMAINS|PROTOCOL-GOVERNANCE|CONFORMANCE-MODEL|BASELINE_LOCK|GOVERNANCE_STATE|dependency-rules|package-authority)\.yaml|enterprise\/specifications\/(SEMANTIC-KERNEL|KNOWLEDGE-COMPILER-PIPELINE|COMPILER-PASSES\.spec)\.yaml)/;

    for (const f of sourceFiles) {
      if (!DOWNSTREAM_IMPL_CODE(f.relPath)) continue;

      const upstreamWrites = [
        ...f.content.matchAll(/writeFileSync\s*\(\s*(["'][^"']+["'])/g),
        ...f.content.matchAll(/appendFile(?:Sync)?\s*\(\s*(["'][^"']+["'])/g),
        ...f.content.matchAll(/rm(?:Sync|dirSync)?\s*\(\s*(["'][^"']+["'])/g),
      ];
      for (const m of upstreamWrites) {
        const arg = m[1] ?? "";
        if (UPSTREAM_GOV_YAMLS.test(arg)) {
          const line = f.content.slice(0, m.index ?? 0).split("\n").length;
          violations.push({
            ruleId: "ARCH-24",
            file: f.relPath,
            message: `Implementation code melakukan WRITE / DELETE upstream governance / spec yaml (${arg.slice(0, 100)}). ASP-02 authority DOWNWARD only. Impl TIDAK BOLEH menulis / menghapus kontrak / protocol / ASP. Perubahan kontrak harus melalui Domain A/B approval pathway.`,
            evidence: `around line ${line}`,
          });
        }
      }
    }

    const CONTRACTS_DIR = resolve(EOS_ROOT, "workspace", "contracts");
    const SPEC_DIR = resolve(EOS_ROOT, "enterprise", "specifications");
    const EVO_DOMAINS_PATH = resolve(GOV_DIR, "EVOLUTION-DOMAINS.yaml");
    let mappedGlobs: readonly { readonly glob_pattern: string; readonly evolution_domain: string }[] = [];
    try {
      if (existsSync(EVO_DOMAINS_PATH)) {
        const evo = readFileSync(EVO_DOMAINS_PATH, "utf8");
        const match = [...evo.matchAll(/glob_pattern:\s*["']?([^"'\n]+)["']?[\s\S]{0,120}?evolution_domain:\s*([A-Z_-]+)/g)];
        mappedGlobs = match.map(m => ({ glob_pattern: m[1] ?? "", evolution_domain: m[2] ?? "" }));
      }
    } catch {
      // ignore
    }
    const pathMatchesGlob = (rel: string, pat: string) => {
      const pat2 = pat.replace(/\./g, "\\.").replace(/\*\*/g, ".*").replace(/\*/g, "[^/]*").replace(/\?/g, ".");
      return new RegExp(`^${pat2}$`).test(rel) || new RegExp(pat2).test(rel);
    };
    const skipByGlob = (labelFilename: string) =>
      mappedGlobs.some(g => {
        const withRoot = labelFilename.replace(/^workspace\//, "workspace/").replace(/^enterprise\//, "enterprise/");
        const root2 = EOS_ROOT.endsWith("/") ? EOS_ROOT.slice(0, -1) : EOS_ROOT;
        const abs = `${root2}/${labelFilename}`;
        return pathMatchesGlob(labelFilename, g.glob_pattern) ||
          pathMatchesGlob(withRoot, g.glob_pattern) ||
          pathMatchesGlob(abs, g.glob_pattern);
      });

    const scanForEvolutionDomain = (root: string, label: string) => {
      if (!existsSync(root)) return;
      const files = readdirSync(root, { withFileTypes: true });
      for (const entry of files) {
        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(".yaml") && !entry.name.endsWith(".yml")) continue;
        const labelFull = `${label}/${entry.name}`;
        if (skipByGlob(labelFull)) continue;
        const fullpath = resolve(root, entry.name);
        try {
          const content = readFileSync(fullpath, "utf8");
          const hasDomainField = /evolution_domain[:\s]/i.test(content) ||
            /domain[:\s]*["']?(DOMAIN-|DOMAIN_A|DOMAIN_B|DOMAIN_C|Constitution|Specification|Implementation)/i.test(content);
          const skipListKnown = ["workspace.yaml"];
          if (skipListKnown.includes(entry.name)) continue;
          if (!hasDomainField) {
            violations.push({
              ruleId: "ARCH-24",
              file: labelFull,
              message: `Spec/Contract yaml tidak memiliki field 'evolution_domain' classification DAN tidak ada di explicit glob mapping EVOLUTION-DOMAINS.yaml. ASP-04 + Evolution Domains: setiap artifact B WAJIB dinyatakan masuk domain mana untuk governance enforcement. Tambahkan field evolution_domain: DOMAIN-B-SPECIFICATION ATAU tambahkan ke mapping glob di EVOLUTION-DOMAINS.yaml.`,
              evidence: `file: ${labelFull}`,
            });
          }
        } catch {
          // ignore read errors; other check will catch
        }
      }
    };
    scanForEvolutionDomain(CONTRACTS_DIR, "workspace/contracts");
    scanForEvolutionDomain(SPEC_DIR, "enterprise/specifications");
    return violations;
  },
};

const ARCH_25: Rule = {
  id: "ARCH-25",
  title: "Protocol-Governed Architecture Boundary — Components communicate via stable protocol exchange only",
  description:
    "PROPOSITION: EOS = Protocol-Governed Architecture (not mere PO). " +
    "Components communicate via EXPLICIT, VERSIONED, HASH-CHECKED PROTOCOL ARTIFACTS (KIR / DIR / Execution Plan / snapshot) as per PROTOCOL-GOVERNANCE.yaml. " +
    "Anti-patterns detected: (A) Runtime imports resolver internals / writes ad-hoc typed objects between components WITHOUT ir_format_version/ir_content_hash header " +
    "(B) Conformance suite importing private-impl modules (breaks Conformance Model POSIX pattern).",
  severity: "error",
  check: ({ sourceFiles }) => {
    const violations: Violation[] = [];

    const RUNTIME_CODE = (p: string) =>
      p.startsWith("packages/core/runtime/src/") ||
      p.startsWith("packages/core/execution/src/") ||
      p.startsWith("packages/composition/src/certification/") ||
      p.includes("orchestration");

    const IMPL_PRIVATE_IMPORT = (c: string) =>
      /import\s*\{[^}]*\}\s*from\s*["']@repo\/[^"']*\/src\/[^"']*(private|internal|impl)[^"']*["']/i.test(c) ||
      /import\s+[^"']*from\s*["'][^"']*src\/[^"']*\.ts["']/i.test(c);

    const PLATFORM_INTERNAL_KNOWN = new Set<string>([
      "packages/composition/src/certification/producers/correlate.ts",
      "packages/composition/src/certification/types.ts",
    ]);

    for (const f of sourceFiles) {
      if (/conformance|conform/.test(f.relPath) || /test.*conform/i.test(f.relPath)) {
        if (IMPL_PRIVATE_IMPORT(f.content)) {
          const m = f.content.match(/import[^;"']*from\s*["'][^"']*["']/);
          const line = f.content.slice(0, m?.index ?? 0).split("\n").length;
          violations.push({
            ruleId: "ARCH-25",
            file: f.relPath,
            message: `Conformance test suite mengimport private impl module. Conformance Model (POSIX pattern): test HANYA boleh menggunakan public protocol interfaces, NO private-impl imports. Hal ini membuat conformance suite terikat pada reference implementation — jadinya tidak bisa menilai alternative implementations.`,
            evidence: `around line ${line} — suspect match "${(m?.[0] ?? "").slice(0, 120)}"`,
          });
        }
      }

      if (!RUNTIME_CODE(f.relPath)) continue;
      if (PLATFORM_INTERNAL_KNOWN.has(f.relPath)) continue;
      const adHocObjExchange =
        /(?:^|[^a-zA-Z_\d])export\s+(?:interface|type|const)\s+\w*(?:Execution|Runtime|Plan|Compiler)\w*\s*[=:][^{]*\{(?!\s*[\s\S]*ir_format_version)(?![\s\S]*ir_content_hash)(?![\s\S]*format_version)(?![\s\S]*plan_hash)[\s\S]{0,400}?\}/m;
      if (adHocObjExchange.test(f.content)) {
        const m = f.content.match(adHocObjExchange);
        const line = f.content.slice(0, m?.index ?? 0).split("\n").length;
        violations.push({
          ruleId: "ARCH-25",
          file: f.relPath,
          message: `Runtime / Composition code mendefinisikan interface exchange antar-tanpa versioned protocol fields (ir_format_version / ir_content_hash / plan_hash). Protocol-Governed Architecture: interface exchange WAJIB membawa protocol version + content hash self-consistency per PROTOCOL-GOVERNANCE.yaml. Hindari untyped anonymous object di antara batas komponen.`,
          evidence: `around line ${line}`,
        });
      }
    }

    return violations;
  },
};

const ALL_RULES: readonly Rule[] = [...RULES, ARCH_16, ARCH_17, ARCH_18, ARCH_19, ARCH_20, ARCH_21, ARCH_22, ARCH_23, ARCH_24, ARCH_25];

function printRepositoryStateHeader(state: RepositoryState | { readonly loadError: string }): void {
  const sub = "-".repeat(78);
  console.log(sub);
  console.log("Repository State Source: governance/GOVERNANCE_STATE.yaml (repository_state key)");
  if ("loadError" in state) {
    console.log(`  \x1b[31m[LOAD ERROR]\x1b[0m ${state.loadError}`);
    console.log(sub);
    return;
  }
  console.log(`  Constitution : ${state.constitution === "locked" ? "\x1b[32mLOCKED\x1b[0m" : "\x1b[31mUNLOCKED\x1b[0m"}`);
  console.log(`  Governance   : ${state.governance}`);
  console.log(`  Gates        : ${Object.entries(state.gates)
    .map(([g, s]) => `${g}=${s}`)
    .join("  ")}`);
  console.log(`  Readiness    : ${Object.entries(state.readiness)
    .map(([k, v]) => `${k}=${v ? "\x1b[32mREADY\x1b[0m" : "\x1b[31mNOT_READY\x1b[0m"}`)
    .join("  ")}`);
  console.log(`  Proof Hashes : baseline=${state.proof.baseline_hash.slice(0, 24)}…  governance=${state.proof.governance_hash.slice(0, 24)}…`);
  console.log(`  Contract     : ACL + CLI + CI + Dashboard = SUMBER YANG SAMA. NO independent calculation.`);
  console.log(sub);
}

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
  printRepositoryStateHeader(loadRepositoryState());
  console.log(`Rules: ${results.length}  ·  Scanned files: ${(globalThis as { __fileCount?: number }).__fileCount ?? results.length}`);
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
    }${"\x1b[0m"} · errors=${totalErrors} · warnings=${totalWarnings} · rules=${rulesChecked}/${results.length}`
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
  const results = ALL_RULES.map((rule) => ({ rule, violations: rule.check(ctx) }));
  const ok = printResults(results);
  return ok ? 0 : 1;
}

process.exitCode = await main();
