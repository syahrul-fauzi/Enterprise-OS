import { compose, buildGraph } from "./src/index.js";

const REGION_SIDEBAR = "region::sidebar" as any;
const REGION_MAIN = "region::main" as any;
const REGION_TOOLBAR = "region::toolbar" as any;
const SLOT_NAV = "slot::nav" as any;
const SLOT_TOOLBAR = "slot::toolbar" as any;
const SLOT_MAIN = "slot::main" as any;

const demoLayout = {
  id: "layout::demo-layout" as any,
  name: "Demo Layout",
  pattern: "sidebar-main" as const,
  regions: Object.freeze([
    { region: REGION_SIDEBAR, kind: "app-sidebar" as const, weight: 1, minSizePx: 240 },
    { region: REGION_TOOLBAR, kind: "workspace" as const, weight: 0 },
    { region: REGION_MAIN, kind: "main" as const, weight: 4 },
  ]),
};

const demoNav = {
  id: "nav::demo",
  name: "Primary",
  kind: "primary" as const,
  items: [
    { id: "cases", label: "Case List", kind: "capability" as const, href: "/cases", order: 10, capabilityId: "legal-case" },
    { id: "docs", label: "Documents", kind: "capability" as const, href: "/documents", order: 20, capabilityId: "legal-document" },
  ],
};

const demoDescriptor = {
  id: "legal.workspace.demo",
  name: "Demo Workspace",
  workspace: { id: "demo", capabilities: ["legal-case", "legal-document"] },
  layout: "layout::demo-layout",
  regions: [REGION_SIDEBAR, REGION_MAIN, REGION_TOOLBAR],
  slots: [
    { slot: SLOT_NAV, region: REGION_SIDEBAR },
    { slot: SLOT_TOOLBAR, region: REGION_TOOLBAR },
    { slot: SLOT_MAIN, region: REGION_MAIN },
  ],
  defaults: [{ slot: SLOT_MAIN, capabilityId: "legal-case", view: "CaseView", priority: 0 }],
  navigation: { primary: "nav::demo" },
  permissions: { requireCapabilities: ["legal-case", "legal-document"], requireRoles: [] },
};

const source: any = {
  workspace: demoDescriptor,
  layoutRegistry: { ["layout::demo-layout"]: demoLayout },
  navigationRegistry: { ["nav::demo"]: demoNav },
};

const ctx = {
  actor: { id: "tester", roles: ["admin"], permissions: [] },
  features: { flags: {} },
  capabilityEntries: {
    "legal-case": { id: "legal-case", available: true },
    "legal-document": { id: "legal-document", available: true },
  },
  requestId: "test-req-0",
};

const r1 = compose({ ...source, resolver: ctx });
const r2 = compose({ ...source, resolver: ctx });
const g1 = buildGraph(source);
const g2 = buildGraph(source);

let fail = 0;
function check(name: string, ok: boolean, info: string) {
  if (!ok) {
    console.log(`FAIL\t${name}\t${info}`);
    fail += 1;
  } else {
    console.log(`PASS\t${name}\t${info}`);
  }
}

check("6A Normalize id", r1.normalized.id === r2.normalized.id, `${r1.normalized.id}`);
check("6A Normalize canonicalId", r1.normalized.canonicalId === r2.normalized.canonicalId, r1.normalized.canonicalId);
check("6A Normalize regions count", Object.keys(r1.normalized.regions).length === Object.keys(r2.normalized.regions).length, `regions=${Object.keys(r1.normalized.regions).length}`);
check("6A Normalize issues valid", r1.normalized.validation.valid, `issues=${r1.normalized.validation.issues.length}`);

check("6B Graph hash", g1.hash === g2.hash, `hash=${g1.hash}`);
check("6B Graph nodes count", Object.keys(g1.nodes).length === Object.keys(g2.nodes).length, `nodes=${Object.keys(g1.nodes).length}`);
check("6B Graph root", g1.root === g2.root, `root=${String(g1.root)}`);
check("6B Graph order", g1.order.length === g2.order.length && g1.order.every((v, i) => String(v) === String(g2.order[i])), `order=${g1.order.length}`);
check("6B Graph capabilities referenced", g1.referencedCapabilityIds.length >= 2, g1.referencedCapabilityIds.join(", "));

check("6C Resolved", r1.resolved.resolved, `errors=${r1.resolved.errors.length} warnings=${r1.resolved.warnings.length}`);
check("6C Active capabilities length", r1.resolved.activeCapabilityIds.length === r2.resolved.activeCapabilityIds.length, `active=${r1.resolved.activeCapabilityIds.join(",")}`);
check("6C Resolved graphHash", r1.resolved.graphHash === r1.graphHash, `${r1.resolved.graphHash}`);
check("6C Resolved layout pattern", r1.resolved.layoutPattern === "sidebar-main", r1.resolved.layoutPattern);
check("6C Compose determinism hash", r1.graphHash === r2.graphHash, `${r1.graphHash}===${r2.graphHash}`);

console.log("");
console.log(`Duration avg: normalize=${((r1.duration.normalizeMs + r2.duration.normalizeMs) / 2).toFixed(2)}ms build=${((r1.duration.graphMs + r2.duration.graphMs) / 2).toFixed(2)}ms resolve=${((r1.duration.resolveMs + r2.duration.resolveMs) / 2).toFixed(2)}ms`);

process.exit(fail === 0 ? 0 : 1);
