import { capabilityRegistry, type CommandInvocationRecord } from "../apps/web/lib/capability-command-registry";
import {
  ServiceProviderRepositoryInMemory,
  ServiceRequestRepositoryInMemory,
} from "../capabilities/service-directory/implementation/repository";
import {
  CaseRepositoryInMemory,
} from "../capabilities/legal-case/implementation/repository";
import {
  TopicRepositoryInMemory,
  ContentArticleRepositoryInMemory,
  CommunityDiscussionRepositoryInMemory,
} from "../capabilities/legal-community/implementation/repository";
import { readProductPreviewBinding } from "../apps/web/lib/product-binding";
import type { ServiceRequestAggregate } from "../capabilities/service-directory/implementation/contracts/service.contracts";
import type { CaseAggregate } from "../capabilities/legal-case/implementation/contracts/case.contracts";
import type { ContentArticleAggregate } from "../capabilities/legal-community/implementation/contracts/community.contracts";
import fs from "node:fs";
import path from "node:path";

interface JourneyStep {
  readonly n: number;
  readonly stage: string;
  readonly label: string;
  readonly ok: boolean;
  readonly evidence?: ReadonlyArray<string>;
  readonly error?: string;
}

interface JourneyResult {
  readonly product: "services-id" | "lawyershub" | "ilc";
  readonly steps: ReadonlyArray<JourneyStep>;
  readonly totalSteps: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly completedAtISO: string;
  readonly evidenceChain: ReadonlyArray<Record<string, unknown>>;
}

// ================================================================
// SHARED HELPERS  (one primitive — used by all 3 products)
// ================================================================
const W = 92;

const stageBanner = (title: string): void => {
  const pad = Math.max(0, W - title.length - 4);
  const l = Math.floor(pad / 2);
  const r = pad - l;
  console.log();
  console.log("━".repeat(W));
  console.log(`┃${" ".repeat(l)} ${title} ${" ".repeat(r)}┃`);
  console.log("━".repeat(W));
};

const stageLabel = (n: number, stage: string, label: string): void => {
  console.log();
  console.log(`  STEP ${n}  [${stage.padEnd(10, " ")}]  ${label}`);
  console.log(`  ${"─".repeat(Math.min(88, 30 + label.length))}`);
};

function finalize(
  product: JourneyResult["product"],
  steps: JourneyStep[],
  evidenceChain: Record<string, unknown>[],
): JourneyResult {
  const passCount = steps.filter((s) => s.ok).length;
  return {
    product,
    steps,
    totalSteps: steps.length,
    passCount,
    failCount: steps.length - passCount,
    completedAtISO: new Date().toISOString(),
    evidenceChain,
  };
}

function pushStep(
  steps: JourneyStep[],
  args: { n: number; stage: string; label: string; ok: boolean; evidence?: ReadonlyArray<string>; error?: string },
): void {
  steps.push({
    n: args.n,
    stage: args.stage,
    label: args.label,
    ok: args.ok,
    evidence: args.evidence,
    error: args.error,
  });
}

function printSummary(result: JourneyResult): void {
  console.log();
  console.log("═".repeat(W));
  const title = `REAL USER JOURNEY · ${result.product.toUpperCase()}  —  ${result.passCount}/${result.totalSteps} PASS`;
  const pad = Math.max(0, W - title.length - 4);
  const l = Math.floor(pad / 2);
  const r = pad - l;
  console.log(`║${" ".repeat(l)} ${title} ${" ".repeat(r)}║`);
  console.log("═".repeat(W));
  console.log();
  console.log("┌────┬────────────┬────────────────────────────────────────────────────────────────┬──────────┐");
  console.log("│ #  │ STAGE      │ STEP DETAIL                                                     │ STATUS   │");
  console.log("├────┼────────────┼────────────────────────────────────────────────────────────────┼──────────┤");
  result.steps.forEach((s) => {
    const padN = String(s.n).padStart(2, " ");
    const stage = s.stage.padEnd(10, " ");
    const detail = s.label.padEnd(62, " ").slice(0, 62);
    const status = s.ok ? "✅ PASS" : "❌ FAIL";
    console.log(`│ ${padN} │ ${stage} │ ${detail} │ ${status} │`);
  });
  console.log("└────┴────────────┴────────────────────────────────────────────────────────────────┴──────────┘");
  console.log();
  console.log(`  PASS  : ${result.passCount}`);
  console.log(`  FAIL  : ${result.failCount}`);
  console.log(`  WHEN  : ${result.completedAtISO}`);
  console.log();
}

function writeEvidenceArtifacts(results: ReadonlyArray<JourneyResult>): void {
  const baseDir = path.resolve(__dirname, "..", ".eos", "evidence");
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  results.forEach((r) => {
    const p = path.join(baseDir, `d13-real-user-journey-${r.product}-${ts}.json`);
    fs.writeFileSync(p, JSON.stringify(r, null, 2), "utf8");
    console.log(`  ✍️  ${p}`);
  });
}

// ================================================================
// PRODUCT 1 — SERVICES.ID
// ================================================================
function runServicesId(): JourneyResult {
  const steps: JourneyStep[] = [];
  const ledger: CommandInvocationRecord[] = [];
  const evidenceChain: Record<string, unknown>[] = [];
  let n = 0;

  const USER_REQ_TITLE = "Penetration Test Aplikasi Mobile Banking";
  const USER_REQ_BUDGET = "Rp 285.000.000";
  const USER_REQUESTER = "Bp. Andi Wijaya — Divisi TI Manufaktur Nusantara";
  let createdId: string | null = null;
  const PROVIDER = "sp-003";

  stageBanner("SERVICES.ID  ·  OPEN → DISCOVER → REQUEST → ACCEPT → DELIVERED → EVIDENCE → SEE");

  // 1 OPEN
  n += 1;
  stageLabel(n, "OPEN", "User membuka /products/services-id → binding loaded");
  try {
    const b = readProductPreviewBinding("services-id");
    const ok = b.productId.toLowerCase() === "services-id" && b.displayName.length > 0;
    console.log(`    productId/displayName/route/surface : ${b.productId} / ${b.displayName} / ${b.route} / ${b.surface}`);
    evidenceChain.push({ step: n, stage: "OPEN", productId: b.productId, displayName: b.displayName });
    pushStep(steps, { n, stage: "OPEN", label: "Services.ID binding valid", ok });
    if (!ok) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "OPEN", label: "Services.ID binding", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 2 DISCOVER
  n += 1;
  stageLabel(n, "DISCOVER", "User browse Cybersecurity category → pilih provider");
  try {
    const ps = ServiceProviderRepositoryInMemory.list();
    const cyber = ps.filter((p) => p.category === "Cybersecurity");
    const picked = cyber.find((p) => p.id.endsWith("003")) ?? cyber[0];
    const ok = cyber.length >= 1 && picked?.verified === true;
    console.log(`    providers: total=${ps.length}, cybersecurity=${cyber.length}, picked=${picked?.id} (rating ${picked?.rating}, verified=${picked?.verified})`);
    evidenceChain.push({ step: n, stage: "DISCOVER", category: "Cybersecurity", count: cyber.length, picked: picked?.id });
    pushStep(steps, { n, stage: "DISCOVER", label: "Browse Cybersecurity providers", ok, evidence: picked?.id ? [`picked=${picked.id}`] : undefined });
    if (!ok) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "DISCOVER", label: "Browse providers", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 3 ACTION
  n += 1;
  stageLabel(n, "ACTION", "User submit request → sreq-* created, draft");
  try {
    const invoke = capabilityRegistry.invoke<{ id: string; status: string }>(
      "services-id", "createServiceRequest",
      { title: USER_REQ_TITLE, description: "Blackbox pentest iOS/Android + API", category: "Cybersecurity", requesterName: USER_REQUESTER, providerId: PROVIDER, budget: USER_REQ_BUDGET },
    );
    ledger.push(invoke.record);
    createdId = invoke.output.id;
    const ok = invoke.record.ok === true && invoke.output.status === "draft" && createdId.startsWith("sreq-");
    console.log(`    evidenceId=${createdId}, status=${invoke.output.status}, cmdKey=${invoke.record.commandKey}, invoke_ok=${invoke.record.ok}`);
    evidenceChain.push({ step: n, stage: "ACTION", capability: "service-directory.createServiceRequest", evidence_id: createdId });
    pushStep(steps, { n, stage: "ACTION", label: `Create service request (${createdId})`, ok, evidence: [`id=${createdId}`] });
    if (!ok) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "ACTION", label: "Create service request", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 4 EXECUTE (accept)
  n += 1;
  stageLabel(n, "EXECUTE", "Vendor accept → accepted");
  try {
    const inv = capabilityRegistry.invoke<ServiceRequestAggregate>("services-id", "acceptServiceRequest", { id: createdId as string, providerId: PROVIDER });
    ledger.push(inv.record);
    const ok = inv.record.ok === true && inv.output.status === "accepted";
    console.log(`    status=${inv.output.status}, provider=${inv.output.providerId as unknown as string}`);
    evidenceChain.push({ step: n, stage: "EXECUTE", transition: "draft→accepted", evidence_id: createdId });
    pushStep(steps, { n, stage: "EXECUTE", label: "Vendor accepts request", ok, evidence: ["status=accepted"] });
    if (!ok) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EXECUTE", label: "Accept request", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 5 STATE (delivered)
  n += 1;
  stageLabel(n, "STATE", "Vendor mark delivered → terminal deliveredAt");
  try {
    const inv = capabilityRegistry.invoke<ServiceRequestAggregate>("services-id", "markServiceDelivered", { id: createdId as string });
    ledger.push(inv.record);
    const ok = inv.record.ok === true && inv.output.status === "delivered" && inv.output.deliveredAt instanceof Date;
    console.log(`    status=${inv.output.status}, deliveredAt=${inv.output.deliveredAt?.toISOString()}`);
    evidenceChain.push({ step: n, stage: "STATE", transition: "accepted→delivered", terminal: true, evidence_id: createdId });
    pushStep(steps, { n, stage: "STATE", label: "Mark delivered (terminal)", ok });
    if (!ok) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "STATE", label: "Mark delivered", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 6 EVIDENCE
  n += 1;
  stageLabel(n, "EVIDENCE", "Ledger 3 record, semua ok=true, invokedAt valid");
  try {
    const recs = ledger.filter((r) => r.commandKey.includes("createServiceRequest") || r.commandKey.includes("acceptServiceRequest") || r.commandKey.includes("markServiceDelivered"));
    const allOk = recs.length >= 3 && recs.every((r) => r.ok === true && r.invokedAt.length > 10);
    console.log(`    records=${recs.length}, all_ok=${allOk}`);
    evidenceChain.push({ step: n, stage: "EVIDENCE", ledger: recs.map((r) => ({ key: r.commandKey, ok: r.ok, t: r.invokedAt })) });
    pushStep(steps, { n, stage: "EVIDENCE", label: "Verify attribution ledger", ok: allOk });
    if (!allOk) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EVIDENCE", label: "Verify ledger", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  // 7 SEE
  n += 1;
  stageLabel(n, "SEE", "User lihat hasil akhir → delivered, detail match");
  try {
    const found = createdId ? ServiceRequestRepositoryInMemory.byId(createdId) : undefined;
    const userCanSee = found !== undefined && found.status === "delivered" && found.title === USER_REQ_TITLE && found.budget === USER_REQ_BUDGET && found.requesterName === USER_REQUESTER && found.deliveredAt instanceof Date;
    console.log(`    found=${found !== undefined}, status=${found?.status}, titleMatch=${found?.title === USER_REQ_TITLE}, budget=${found?.budget}, requester=${found?.requesterName}`);
    evidenceChain.push({ step: n, stage: "SEE", evidence_id: createdId, user_sees_status: found?.status });
    pushStep(steps, { n, stage: "SEE", label: "User sees delivered result", ok: userCanSee });
    if (!userCanSee) return finalize("services-id", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "SEE", label: "User sees result", ok: false, error: String(e) }); return finalize("services-id", steps, evidenceChain); }

  return finalize("services-id", steps, evidenceChain);
}

// ================================================================
// PRODUCT 2 — LAWYERSHUB
// ================================================================
function runLawyersHub(): JourneyResult {
  const steps: JourneyStep[] = [];
  const ledger: CommandInvocationRecord[] = [];
  const evidenceChain: Record<string, unknown>[] = [];
  let n = 0;

  const CASE_TITLE = "Litigasi Gugatan Perdata Wanprestasi Kontrak Distributor";
  const CASE_PRIORITY = "high";
  const LAWYER_ID = "lawyer-d13-e2e";
  let createdId: string | null = null;

  stageBanner("LAWYERSHUB  ·  OPEN → DISCOVER (case list) → CREATE MATTER → ASSIGN → CLOSE → EVIDENCE → SEE");

  // 1 OPEN
  n += 1;
  stageLabel(n, "OPEN", "User membuka /products/lawyershub → binding loaded");
  try {
    const b = readProductPreviewBinding("lawyershub");
    const ok = b.productId.toLowerCase() === "lawyershub" && b.displayName.length > 0;
    console.log(`    productId/displayName/route/surface : ${b.productId} / ${b.displayName} / ${b.route} / ${b.surface}`);
    evidenceChain.push({ step: n, stage: "OPEN", productId: b.productId, displayName: b.displayName });
    pushStep(steps, { n, stage: "OPEN", label: "LawyersHub binding valid", ok });
    if (!ok) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "OPEN", label: "LawyersHub binding", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 2 DISCOVER — user lihat daftar kasus dashboard / recent activity
  n += 1;
  stageLabel(n, "DISCOVER", "User browse kasus aktif → lihat existing matters");
  try {
    const cases = CaseRepositoryInMemory.list();
    const activeCases = cases.filter((c) => c.status === "open" || c.status === "draft");
    const ok = Array.isArray(cases) && cases.length >= 1 && activeCases.length >= 0;
    console.log(`    matters: total=${cases.length}, active/draft=${activeCases.length}, first_id=${cases[0]?.id ?? "none"}`);
    evidenceChain.push({ step: n, stage: "DISCOVER", cases_total: cases.length, active: activeCases.length });
    pushStep(steps, { n, stage: "DISCOVER", label: "Browse recent matters (discover)", ok, evidence: [`total=${cases.length}`] });
    if (!ok) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "DISCOVER", label: "Browse matters", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 3 ACTION — create matter
  n += 1;
  stageLabel(n, "ACTION", "User klik 'Buat Kasus Baru' → submit form → case created");
  try {
    const invoke = capabilityRegistry.invoke<{ id: string; status: string }>(
      "lawyershub", "create",
      { title: CASE_TITLE, description: "Gugatan wanprestasi terkait perjanjian distribusi produk, nilai sengketa Rp 2.1 Miliar.", priority: CASE_PRIORITY, clientName: "PT Maju Jaya Abadi" },
    );
    ledger.push(invoke.record);
    createdId = invoke.output.id;
    const ok = invoke.record.ok === true && invoke.output.status === "draft" && createdId.startsWith("case-");
    console.log(`    evidenceId=${createdId}, status=${invoke.output.status}, cmdKey=${invoke.record.commandKey}, invoke_ok=${invoke.record.ok}`);
    evidenceChain.push({ step: n, stage: "ACTION", capability: "legal-case.createCase", evidence_id: createdId });
    pushStep(steps, { n, stage: "ACTION", label: `Create legal matter (${createdId})`, ok, evidence: [`id=${createdId}`] });
    if (!ok) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "ACTION", label: "Create legal matter", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 4 EXECUTE — assign lawyer
  n += 1;
  stageLabel(n, "EXECUTE", "Managing partner assign lawyer → open");
  try {
    const inv = capabilityRegistry.invoke<CaseAggregate>("lawyershub", "assignLawyer", { id: createdId as string, lawyerId: LAWYER_ID });
    ledger.push(inv.record);
    const ok = inv.record.ok === true && inv.output.status === "open" && inv.output.lawyerId === LAWYER_ID;
    console.log(`    status=${inv.output.status}, lawyerId=${inv.output.lawyerId}`);
    evidenceChain.push({ step: n, stage: "EXECUTE", transition: "draft→open", evidence_id: createdId, lawyer: LAWYER_ID });
    pushStep(steps, { n, stage: "EXECUTE", label: "Assign lawyer → open", ok, evidence: ["status=open", `lawyer=${LAWYER_ID}`] });
    if (!ok) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EXECUTE", label: "Assign lawyer", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 5 STATE — close case (terminal)
  n += 1;
  stageLabel(n, "STATE", "Kasus selesai → close, closedAt stamped (terminal)");
  try {
    const inv = capabilityRegistry.invoke<CaseAggregate>("lawyershub", "close", { id: createdId as string });
    ledger.push(inv.record);
    const ok = inv.record.ok === true && inv.output.status === "closed" && inv.output.closedAt instanceof Date;
    console.log(`    status=${inv.output.status}, closedAt=${inv.output.closedAt?.toISOString()}`);
    evidenceChain.push({ step: n, stage: "STATE", transition: "open→closed", terminal: true, evidence_id: createdId });
    pushStep(steps, { n, stage: "STATE", label: "Close case (terminal closedAt)", ok });
    if (!ok) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "STATE", label: "Close case", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 6 EVIDENCE
  n += 1;
  stageLabel(n, "EVIDENCE", "Ledger 3 record, semua ok=true, invokedAt valid");
  try {
    const recs = ledger.filter((r) => r.commandKey.includes("case.create") || r.commandKey.includes("assignLawyer") || r.commandKey.includes("case.close"));
    const allOk = recs.length >= 3 && recs.every((r) => r.ok === true && r.invokedAt.length > 10);
    console.log(`    records=${recs.length}, all_ok=${allOk}`);
    evidenceChain.push({ step: n, stage: "EVIDENCE", ledger: recs.map((r) => ({ key: r.commandKey, ok: r.ok, t: r.invokedAt })) });
    pushStep(steps, { n, stage: "EVIDENCE", label: "Verify attribution ledger", ok: allOk });
    if (!allOk) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EVIDENCE", label: "Verify ledger", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  // 7 SEE
  n += 1;
  stageLabel(n, "SEE", "User cek dashboard → case closed, title/priority/closedAt match");
  try {
    const found = createdId ? CaseRepositoryInMemory.byId(createdId) : undefined;
    const userCanSee = found !== undefined && found.status === "closed" && found.title === CASE_TITLE && found.priority === CASE_PRIORITY && found.lawyerId === LAWYER_ID && found.closedAt instanceof Date;
    console.log(`    found=${found !== undefined}, status=${found?.status}, titleMatch=${found?.title === CASE_TITLE}, priority=${found?.priority}, lawyerId=${found?.lawyerId}`);
    evidenceChain.push({ step: n, stage: "SEE", evidence_id: createdId, user_sees_status: found?.status });
    pushStep(steps, { n, stage: "SEE", label: "User sees closed matter result", ok: userCanSee });
    if (!userCanSee) return finalize("lawyershub", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "SEE", label: "User sees result", ok: false, error: String(e) }); return finalize("lawyershub", steps, evidenceChain); }

  return finalize("lawyershub", steps, evidenceChain);
}

// ================================================================
// PRODUCT 3 — ILC (Indonesian Legal Commons)
// ================================================================
function runILC(): JourneyResult {
  const steps: JourneyStep[] = [];
  const ledger: CommandInvocationRecord[] = [];
  const evidenceChain: Record<string, unknown>[] = [];
  let n = 0;

  const ARTICLE_TITLE = "Tinjauan Yuridis Implementasi UU PDP Pasal 26 untuk Perusahaan ASEAN";
  const TOPIC_LABEL = "Hukum Teknologi Digital";
  const AUTHOR = "Prof. Dr. Ratna Dewi, S.H., M.Hum. — FH UI";
  let createdId: string | null = null;

  stageBanner("ILC  ·  OPEN → DISCOVER (topics) → CREATE ARTICLE → PUBLISH → EVIDENCE → SEE");

  // 1 OPEN
  n += 1;
  stageLabel(n, "OPEN", "User membuka /products/ilc → binding loaded");
  try {
    const b = readProductPreviewBinding("ilc");
    const ok = b.productId.toLowerCase() === "ilc" && b.displayName.length > 0;
    console.log(`    productId/displayName/route/surface : ${b.productId} / ${b.displayName} / ${b.route} / ${b.surface}`);
    evidenceChain.push({ step: n, stage: "OPEN", productId: b.productId, displayName: b.displayName });
    pushStep(steps, { n, stage: "OPEN", label: "ILC binding valid", ok });
    if (!ok) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "OPEN", label: "ILC binding", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 2 DISCOVER — user explore topic grid
  n += 1;
  stageLabel(n, "DISCOVER", "User browse topic grid → lihat diskusi & artikel terbaru");
  try {
    const topics = TopicRepositoryInMemory.list();
    const discussions = CommunityDiscussionRepositoryInMemory.list();
    const articles = ContentArticleRepositoryInMemory.list();
    const matched = topics.find((t) => t.label === TOPIC_LABEL) ?? topics[0];
    const ok = Array.isArray(topics) && topics.length >= 1 && discussions.length >= 0 && articles.length >= 0 && matched !== undefined;
    console.log(`    topics=${topics.length}, discussions=${discussions.length}, articles=${articles.length}, matched_topic=${matched?.label ?? "none"}`);
    evidenceChain.push({ step: n, stage: "DISCOVER", topics_total: topics.length, discussions: discussions.length, articles: articles.length, matched_topic: matched?.label });
    pushStep(steps, { n, stage: "DISCOVER", label: "Explore topic grid + recent activity", ok, evidence: [`topics=${topics.length}`, `discussions=${discussions.length}`, `articles=${articles.length}`] });
    if (!ok) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "DISCOVER", label: "Explore topics", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 3 ACTION — create article (proposed)
  n += 1;
  stageLabel(n, "ACTION", "User klik 'Tulis Artikel' → submit → content-* created, proposed");
  try {
    const invoke = capabilityRegistry.invoke<{ id: string; status: string }>(
      "ilc", "createContentArticle",
      { title: ARTICLE_TITLE, summary: "Analisis tantangan praktis lintas-batas data ASEAN + adequacy assessment vs SCC, dengan studi kasus sektor perbankan.", topicLabel: TOPIC_LABEL, author: AUTHOR, authorAffiliation: "FH UI" },
    );
    ledger.push(invoke.record);
    createdId = invoke.output.id;
    const ok = invoke.record.ok === true && invoke.output.status === "proposed" && createdId.startsWith("content-");
    console.log(`    evidenceId=${createdId}, status=${invoke.output.status}, cmdKey=${invoke.record.commandKey}, invoke_ok=${invoke.record.ok}`);
    evidenceChain.push({ step: n, stage: "ACTION", capability: "legal-community.createContentArticle", evidence_id: createdId });
    pushStep(steps, { n, stage: "ACTION", label: `Create community article (${createdId})`, ok, evidence: [`id=${createdId}`, "status=proposed"] });
    if (!ok) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "ACTION", label: "Create article", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 4 EXECUTE (state transition — publish)
  n += 1;
  stageLabel(n, "EXECUTE", "Moderator approve → publishContent → published");
  try {
    const inv = capabilityRegistry.invoke<ContentArticleAggregate>("ilc", "publishContent", { id: createdId as string });
    ledger.push(inv.record);
    const ok = inv.record.ok === true && inv.output.status === "published" && inv.output.publishedAt instanceof Date;
    console.log(`    status=${inv.output.status}, publishedAt=${inv.output.publishedAt?.toISOString()}`);
    evidenceChain.push({ step: n, stage: "EXECUTE", transition: "proposed→published", evidence_id: createdId });
    pushStep(steps, { n, stage: "EXECUTE", label: "Publish article (moderator approve)", ok, evidence: ["status=published"] });
    if (!ok) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EXECUTE", label: "Publish article", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 5 STATE — terminal published (tidak ada state lebih lanjut)
  n += 1;
  stageLabel(n, "STATE", "Verify state: published terminal, publishedAt ada + status konsisten repo");
  try {
    const fromRepo = createdId ? ContentArticleRepositoryInMemory.byId(createdId) : undefined;
    const ok = fromRepo !== undefined && fromRepo.status === "published" && fromRepo.publishedAt instanceof Date;
    console.log(`    repo_status=${fromRepo?.status}, publishedAt=${fromRepo?.publishedAt?.toISOString()}, titleMatch=${fromRepo?.title === ARTICLE_TITLE}`);
    evidenceChain.push({ step: n, stage: "STATE", terminal: true, evidence_id: createdId, repo_status: fromRepo?.status });
    pushStep(steps, { n, stage: "STATE", label: "Terminal published state verified", ok });
    if (!ok) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "STATE", label: "Verify terminal state", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 6 EVIDENCE
  n += 1;
  stageLabel(n, "EVIDENCE", "Ledger 2 record (create + publish) semua ok=true, invokedAt valid");
  try {
    const recs = ledger.filter((r) => r.commandKey.includes("createContentArticle") || r.commandKey.includes("publishContent"));
    const allOk = recs.length >= 2 && recs.every((r) => r.ok === true && r.invokedAt.length > 10);
    console.log(`    records=${recs.length}, all_ok=${allOk}`);
    evidenceChain.push({ step: n, stage: "EVIDENCE", ledger: recs.map((r) => ({ key: r.commandKey, ok: r.ok, t: r.invokedAt })) });
    pushStep(steps, { n, stage: "EVIDENCE", label: "Verify attribution ledger (create + publish)", ok: allOk });
    if (!allOk) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "EVIDENCE", label: "Verify ledger", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  // 7 SEE
  n += 1;
  stageLabel(n, "SEE", "User buka community feed → artikel muncul published, author/topic/title match");
  try {
    const found = createdId ? ContentArticleRepositoryInMemory.byId(createdId) : undefined;
    const allArticles = ContentArticleRepositoryInMemory.list();
    const allPublished = allArticles.filter((a) => a.status === "published");
    const userCanSee = found !== undefined && found.status === "published" && found.title === ARTICLE_TITLE && found.author === AUTHOR && found.topicLabel === TOPIC_LABEL && found.publishedAt instanceof Date && allPublished.length >= 1;
    console.log(`    found=${found !== undefined}, status=${found?.status}, titleMatch=${found?.title === ARTICLE_TITLE}, author=${found?.author}, topicLabel=${found?.topicLabel}, published_total=${allPublished.length}`);
    evidenceChain.push({ step: n, stage: "SEE", evidence_id: createdId, user_sees_status: found?.status, published_total: allPublished.length });
    pushStep(steps, { n, stage: "SEE", label: "User sees published article", ok: userCanSee });
    if (!userCanSee) return finalize("ilc", steps, evidenceChain);
  } catch (e) { pushStep(steps, { n, stage: "SEE", label: "User sees article", ok: false, error: String(e) }); return finalize("ilc", steps, evidenceChain); }

  return finalize("ilc", steps, evidenceChain);
}

// ================================================================
// MAIN
// ================================================================
async function main(): Promise<void> {
  console.log();
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║  ENTERPRISE OS  ·  PHASE D1.3  —  3 PRODUCTS  ×  7-STEP REAL USER JOURNEY  ·  1 SHARED PRIMITIVE ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║  Pattern:  OPEN → DISCOVER → ACTION → EXECUTE → STATE → EVIDENCE → SEE                          ║");
  console.log("║  1 primitive = readProductPreviewBinding + Repository + capabilityRegistry + Attribution Ledger  ║");
  console.log("║  Applied to:  LAWYERSHUB  |  SERVICES.ID  |  ILC  (Indonesian Legal Commons)                    ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════╝");

  const results: JourneyResult[] = [
    runServicesId(),
    runLawyersHub(),
    runILC(),
  ];

  console.log();
  console.log("─".repeat(W));
  console.log("  D1.3 — ALL PRODUCT JOURNEY RUN SUMMARY");
  console.log("─".repeat(W));
  results.forEach(printSummary);

  writeEvidenceArtifacts(results);

  const totalPass = results.reduce((a, r) => a + r.passCount, 0);
  const totalSteps = results.reduce((a, r) => a + r.totalSteps, 0);
  const anyFail = results.some((r) => r.failCount > 0);
  const perProduct = results.map((r) => `${r.product}=${r.passCount}/${r.totalSteps}`).join(", ");

  console.log();
  console.log("─".repeat(W));
  console.log(`  PRODUCTS EVALUATED    : ${results.length}  (${results.map((r) => r.product).join(", ")})`);
  console.log(`  TOTAL E2E STEPS       : ${totalSteps}`);
  console.log(`  TOTAL E2E STEPS PASS  : ${totalPass}`);
  console.log(`  PER PRODUCT SCORE     : ${perProduct}`);
  console.log(`  EVIDENCE ARTIFACTS    : ${results.length} JSON files written to .eos/evidence/`);
  console.log("─".repeat(W));

  if (anyFail) {
    console.error("\n❌ D1.3 REAL USER JOURNEY INCOMPLETE — ada product yang gagal di beberapa step.");
    process.exit(1);
  }

  console.log();
  console.log("╔══════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ D1.3  CERTIFIED  —  3 PRODUCTS  ×  7 STEPS  =  21/21 EXECUTABLE E2E USER JOURNEY PASS      ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║  LEVERAGE = 3 PRODUCTS / 1 SHARED PRIMITIVE = 3× direct product leverage                        ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║  SERVICES.ID  7/7 : OPEN binding → DISCOVER Cybersecurity → REQUEST → ACCEPT → DELIVER → LEDGER  ║");
  console.log("║   → SEE delivered request (sreq-*)                                                                 ║");
  console.log("║                                                                                                    ║");
  console.log("║  LAWYERSHUB   7/7 : OPEN binding → DISCOVER recent matters → CREATE → ASSIGN → CLOSE → LEDGER     ║");
  console.log("║   → SEE closed case (case-*, closedAt stamped, lawyerId assigned)                                  ║");
  console.log("║                                                                                                    ║");
  console.log("║  ILC           7/7 : OPEN binding → DISCOVER topics → CREATE ARTICLE → PUBLISH → STATE → LEDGER   ║");
  console.log("║   → SEE published article (content-*, publishedAt stamped, author+topic+title match)               ║");
  console.log("╠══════════════════════════════════════════════════════════════════════════════════════════════════╣");
  console.log("║  NEAREST NEXT GATE:                                                                                ║");
  console.log("║    1. Update README.md scoreboard: E2E Journey column = 3✓                                         ║");
  console.log("║    2. Update eos-state.yaml D1.3 records                                                           ║");
  console.log("║    3. HUMAN BLACK-BOX ACCEPTANCE (manual use-the-product-for-real session)                        ║");
  console.log("║    4. DEPLOY HARDENING → staging check → SHIP 3 USABLE PRODUCTS                                   ║");
  console.log("╚══════════════════════════════════════════════════════════════════════════════════════════════════╝");
  console.log();
}

main().catch((err) => {
  console.error();
  console.error("╔══════════════════════════════════════════════════════════════════════════════════════════════════╗");
  console.error("║  D1.3 ALL-PRODUCT JOURNEY  FATAL ERROR                                                            ║");
  console.error("╚══════════════════════════════════════════════════════════════════════════════════════════════════╝");
  console.error(err);
  process.exit(1);
});
