const fs = require("node:fs");
const path = require("node:path");

const workspaceRoot = path.resolve(__dirname, "..", "..");

function listFiles(dir, exts, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.name === "node_modules" || e.name === ".next" || e.name === "dist" || e.name === ".turbo") continue;
    if (e.isDirectory()) listFiles(p, exts, acc);
    else if (exts.some((x) => e.name.endsWith(x))) acc.push(p);
  }
  return acc;
}

function stripComments(content) {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/#[^\n]*/g, " ");
}

function hasImport(content, patterns) {
  const clean = stripComments(content);
  return patterns.some((pat) => clean.includes(pat));
}

const rules = [];

function rule(name, desc, check) {
  rules.push({ name, desc, check });
}

/* ───────────────────────────────────────────────────────────
   Rule 1. Presentation must NOT know Capability / Business names
   e.g. no "from \".../capabilities/legal-case\"" in presentation/
   ─────────────────────────────────────────────────────────── */
rule(
  "PRES-001",
  "Presentation layer must not import capabilities (ui-system must not know Case/Document etc.)",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "presentation"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".css",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, ['capabilities/', 'legal-case', 'legal-document', 'CaseCard', 'DocumentCard'])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 2. UI System / Presentation must NOT import @repo/core-* runtime contracts
   ─────────────────────────────────────────────────────────── */
rule(
  "PRES-002",
  "Presentation/ui-system must not import @repo/core-* (runtime/kernel/registry are business runtime concerns)",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "presentation"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, ['@repo/core-kernel', '@repo/core-runtime', '@repo/core-capability-registry'])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 3. Kernel must NOT know React / Presentation concerns
   ─────────────────────────────────────────────────────────── */
rule(
  "CORE-001",
  "Kernel (contract layer) must not import React — Kernel never knows React.",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "core", "kernel"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, [
        '"react"', "'react'", '"react-dom"', "'react-dom'",
        '"react/jsx-runtime"', "'react/jsx-runtime'",
        '@repo/presentation', '"next/', "'next/",
      ])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 4. Runtime must NOT use fs module (Runtime should be platform-agnostic until adapter layer)
   ─────────────────────────────────────────────────────────── */
rule(
  "CORE-002",
  "Runtime (orchestration engine) must not import 'fs' / 'node:fs' directly — filesystem concern lives in registry adapters (FilesystemRegistry)",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "core", "runtime"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, ['"fs"', "'fs'", '"node:fs"', "'node:fs'"])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 5. Kernel (lowest) must NOT import back to Runtime or Registry — DAG
   ─────────────────────────────────────────────────────────── */
rule(
  "CORE-003",
  "Kernel must not import Runtime or CapabilityRegistry — contracts cannot depend on orchestrators (DAG direction: Kernel ← Registry ← Runtime)",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "core", "kernel"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, ['@repo/core-runtime', '@repo/core-capability-registry', '/runtime/', '/capability-registry/'])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 6. Config packages must not import business/runtime/capability contracts
   ─────────────────────────────────────────────────────────── */
rule(
  "CFG-001",
  "Config tooling packages must not import runtime/capability concerns",
  () => {
    const files = listFiles(path.join(workspaceRoot, "packages", "config"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, [
        '@repo/core-kernel', '@repo/core-runtime', '@repo/core-capability-registry',
        '@repo/presentation-ui-system', 'capabilities/',
      ])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 7. Business Components / Capability Experience must not import Apps
   ─────────────────────────────────────────────────────────── */
rule(
  "CAP-001",
  "Capability Business Components and Experience must not import Apps layers (apps/*) — composition runs FROM apps toward capabilities, not the reverse",
  () => {
    const files = listFiles(path.join(workspaceRoot, "capabilities"), [
      ".ts", ".tsx", ".js", ".mjs", ".cjs",
    ]);
    const bad = [];
    for (const f of files) {
      const c = fs.readFileSync(f, "utf8");
      if (hasImport(c, ['/apps/', '"../../apps', "'../../apps", '"../../../apps', "'../../../apps", '@repo/lawyershub', '@repo/docs'])) {
        bad.push(path.relative(workspaceRoot, f));
      }
    }
    return { ok: bad.length === 0, violations: bad };
  }
);

/* ───────────────────────────────────────────────────────────
   Rule 8. UI System imports within Capability Experience are ALLOWED
   (direction is correct: Experience → Presentation)
   BUT: Ensure no REVERSE: Capability types imported INTO Presentation layer
   (Rule 1 + 2 already cover reverse, this rule is POSITIVE: verify stack exists)
   ─────────────────────────────────────────────────────────── */
rule(
  "VERIFY-STACK",
  "Positive fitness: Experience 3-layer (views → workspaces → components → implementation) established in capabilities",
  () => {
    const required = [
      [
        path.join(workspaceRoot, "capabilities", "legal-case", "experience", "views", "CaseView.tsx"),
        ["../workspaces/CaseWorkspace"],
      ],
      [
        path.join(workspaceRoot, "capabilities", "legal-case", "experience", "workspaces", "CaseWorkspace.tsx"),
        ["../components/CaseCard", "../../implementation/service"],
      ],
      [
        path.join(workspaceRoot, "capabilities", "legal-document", "experience", "views", "DocumentView.tsx"),
        ["../workspaces/DocumentWorkspace"],
      ],
      [
        path.join(workspaceRoot, "capabilities", "legal-document", "experience", "workspaces", "DocumentWorkspace.tsx"),
        ["../components/DocumentCard", "../../implementation/service"],
      ],
    ];
    const violations = [];
    for (const [file, patterns] of required) {
      const c = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      for (const p of patterns) {
        if (!c.includes(p)) violations.push(`${path.relative(workspaceRoot, file)} missing stack import: ${p}`);
      }
    }
    return { ok: violations.length === 0, violations };
  }
);

/* ───────────────────────────────────────────────────────────
   Runner
   ─────────────────────────────────────────────────────────── */
const passed = [];
const failed = [];
for (const r of rules) {
  let result;
  try {
    result = r.check();
  } catch (e) {
    result = { ok: false, violations: [`EXCEPTION: ${e && e.message}`] };
  }
  if (result.ok) passed.push(r);
  else failed.push({ rule: r, violations: result.violations });
}

console.log("");
console.log("═══ EOS Architecture Fitness Suite ═══");
console.log(`Workspace: ${workspaceRoot}`);
console.log(`Rules checked: ${rules.length}`);
console.log(`Passed: ${passed.length}`);
console.log(`Failed: ${failed.length}`);
console.log("");
for (const r of passed) {
  console.log(`  ✅ ${r.name}  ${r.desc}`);
}
if (failed.length > 0) {
  console.log("");
  for (const f of failed) {
    console.log(`  ❌ ${f.rule.name}  ${f.rule.desc}`);
    for (const v of f.violations) console.log(`       ↳ ${v}`);
  }
  console.log("");
  process.exit(1);
}
console.log("");
console.log("🎯 All EOS Architecture Fitness Rules PASS — boundaries clean.");
