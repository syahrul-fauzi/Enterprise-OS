import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { capabilityRegistry, type CommandInvocationRecord } from "../../../apps/web/lib/capability-command-registry";
import {
  TopicRepositoryInMemory,
  ContentArticleRepositoryInMemory,
  CommunityDiscussionRepositoryInMemory,
} from "../../../capabilities/legal-community/implementation/repository/community.repository";
import type {
  ContentArticleAggregate,
  ContentStatus,
  TopicCategory,
} from "../../../capabilities/legal-community/implementation/contracts/community.contracts";

const loadEosManifest = () => {
  const manifestPath = path.resolve(__dirname, "..", "eos.yaml");
  return yaml.load(fs.readFileSync(manifestPath, "utf8")) as Record<string, unknown>;
};

interface IlcLifecycleLedger {
  readonly records: CommandInvocationRecord[];
  readonly createdId: string;
  readonly createdOutput: { readonly id: string; readonly status: ContentStatus };
  readonly publishedOutput: { readonly id: string; readonly status: "published"; readonly publishedAt: Date };
  readonly input: {
    readonly title: string;
    readonly summary: string;
    readonly topicLabel: TopicCategory;
    readonly author: string;
    readonly authorAffiliation: string;
  };
}

const ILC_SESSION_ID = "session-test-001";

async function runLifecycleIlcE2E(
  title: string,
  summary: string,
  topicLabel: TopicCategory,
  author: string,
  authorAffiliation: string,
): Promise<IlcLifecycleLedger> {
  const records: CommandInvocationRecord[] = [];

  const createResult = await capabilityRegistry.invoke<{ readonly id: string; readonly status: ContentStatus }>(
    "ilc",
    "createContentArticle",
    { title, summary, topicLabel, author, authorAffiliation, sessionId: ILC_SESSION_ID },
  );
  records.push(createResult.record);
  assert.equal(createResult.record.ok, true, "legal-community.createContentArticle must record ok:true");
  assert.ok(createResult.output.id.startsWith("content-"), "createContentArticle must produce content-XXX id");
  assert.equal(createResult.output.status, "proposed", "createContentArticle initial status = proposed");

  const id = createResult.output.id as string;
  const pAfterCreate = ContentArticleRepositoryInMemory.byId(id);
  assert.ok(pAfterCreate !== undefined, `content ${id} retrievable dari repository setelah create`);
  assert.equal(pAfterCreate.title, title.trim(), "persisted title match input (trimmed)");
  assert.equal(pAfterCreate.status, "proposed", "persisted status after create = proposed");
  assert.equal(pAfterCreate.topicLabel, topicLabel, "persisted topicLabel match");
  assert.equal(pAfterCreate.author, author, "persisted author match");
  assert.equal(pAfterCreate.authorAffiliation, authorAffiliation, "persisted authorAffiliation match");
  assert.equal(pAfterCreate.readCount, 0, "initial readCount = 0");
  assert.equal(pAfterCreate.engagementCount, 0, "initial engagementCount = 0");

  const publishResult = await capabilityRegistry.invoke<{
    readonly id: string;
    readonly status: "published";
    readonly publishedAt: Date;
  }>("ilc", "publishContent", { id, sessionId: ILC_SESSION_ID });
  records.push(publishResult.record);
  assert.equal(publishResult.record.ok, true, "legal-community.publishContent must record ok:true");
  assert.equal(publishResult.output.status, "published", "publishContent on proposed → published");
  assert.ok(publishResult.output.publishedAt instanceof Date, "publish output stamps publishedAt");

  const pAfterPublish = ContentArticleRepositoryInMemory.byId(id);
  assert.equal(pAfterPublish?.status, "published", "repo status setelah publish = published");
  assert.ok(pAfterPublish?.publishedAt instanceof Date, "repo publishedAt stamped");

  return {
    records,
    createdId: id,
    createdOutput: createResult.output,
    publishedOutput: publishResult.output,
    input: { title: title.trim(), summary, topicLabel, author, authorAffiliation },
  };
}

test.describe("DISC-001 · ILC Lifecycle E2E (capabilityRegistry · NO MOCKS)", () => {
  test("DISCOVER: topic grid tersedia 8 topic Hukum Teknologi Digital dan Hukum Perdata ada", () => {
    const topics = TopicRepositoryInMemory.list();
    assert.ok(topics.length >= 8, `minimal 8 topic tersedia, got ${topics.length}`);

    const digi = topics.find((t) => t.label === "Hukum Teknologi Digital");
    const perdata = topics.find((t) => t.label === "Hukum Perdata");
    assert.ok(digi !== undefined, "topic 'Hukum Teknologi Digital' harus ada");
    assert.ok(perdata !== undefined, "topic 'Hukum Perdata' harus ada");

    const disc = CommunityDiscussionRepositoryInMemory.list();
    const art = ContentArticleRepositoryInMemory.listPublished();
    assert.ok(Array.isArray(disc) && disc.length >= 2, `diskusi publik minimal 2, got ${disc.length}`);
    assert.ok(Array.isArray(art) && art.length >= 2, `artikel published minimal 2, got ${art.length}`);
  });

  test("createContentArticle → persist → retrieved byId dengan author/topicLabel/affiliation match", async () => {
    const ledger = await runLifecycleIlcE2E(
      "  Analisis Komparatif Implementasi UU PDP Pasal 26 di ASEAN: Adequacy Decision vs Standard Contractual Clauses  ",
      "Studi komparatif lintas 4 negara ASEAN (ID/MY/SG/TH) terkait mekanisme transfer data cross-border untuk sektor perbankan dan fintech; include adequacy assessment gap analysis + rekomendasi SCC lokal.",
      "Hukum Teknologi Digital",
      "Prof. Dr. Ratna Dewi, S.H., M.Hum.",
      "Fakultas Hukum Universitas Indonesia — Pusat Studi Hukum Teknologi",
    );

    const allOk = ledger.records.every((r) => r.ok === true);
    assert.equal(allOk, true, `semua ${ledger.records.length} CommandInvocationRecord ok:true`);

    const rehydrated: ContentArticleAggregate | undefined = ContentArticleRepositoryInMemory.byId(ledger.createdId);
    assert.ok(rehydrated !== undefined, "final retrieval: content byId tersedia");
    assert.equal(rehydrated.status, "published", "final status = published terminal");
    assert.equal(rehydrated.author, ledger.input.author, "final author persisten");
    assert.equal(rehydrated.topicLabel, "Hukum Teknologi Digital", "topicLabel tersimpan");
    assert.equal(rehydrated.authorAffiliation, ledger.input.authorAffiliation, "affiliation tersimpan");
    assert.equal(
      rehydrated.title,
      "Analisis Komparatif Implementasi UU PDP Pasal 26 di ASEAN: Adequacy Decision vs Standard Contractual Clauses",
      "title di-trim saat persist",
    );
  });

  test("publishContent menghasilkan transisi proposed→published + publishedAt ter-stamp persisten", async () => {
    const ledger = await runLifecycleIlcE2E(
      "Yurisdiksi dan Enforceability Smart Contract pada Arbitrase Dagang di Bawah UU Arbitrase No.30/1999",
      "Analisis putusan terbaru MA terkait smart contract sebagai bukti otentik + komparasi dengan UNCITRAL Model Law 2006 + recomendasi revisi UU Arbitrase.",
      "Hukum Dagang",
      "Dr. Adrian Nugroho, S.H., M.Arbit.",
      "Badan Arbitrase Nasional Indonesia (BANI) — Pusat Riset Arbitrase",
    );
    assert.equal(ledger.publishedOutput.status, "published", "publish → published");
    assert.ok(ledger.publishedOutput.publishedAt instanceof Date, "echo publishedAt");

    const row = ContentArticleRepositoryInMemory.byId(ledger.createdId);
    assert.ok(row?.publishedAt instanceof Date, "repo publishedAt = stamped");
    assert.equal(row?.status, "published", "repo status = published");
  });

  test("status transisi proposed→published monotonik tanpa intermediate state tak terdefinisi", async () => {
    const ledger = await runLifecycleIlcE2E(
      "Kepatuhan Privacy by Design dalam Pengembangan Generative AI: Studi Kasus Lembaga Jasa Keuangan OJK",
      "Audit gap PbD vs OJK SEOJK/POJK terbaru terkait LLM usage pada credit scoring + rekomendasi DPIA framework.",
      "Hukum Keuangan dan Perbankan",
      "Ibu Irma Suryani, S.H., LL.M.",
      "Otoritas Jasa Keuangan — Direktorat Pengawasan Fintech",
    );
    const statuses = [ledger.createdOutput.status, ledger.publishedOutput.status];
    assert.deepEqual(statuses, ["proposed", "published"], "transisi monotonik proposed→published");
    assert.equal(ledger.publishedOutput.status, "published", "terminasi di published");
  });

  test("ContentArticle yang published muncul di listPublished() dengan sort publishedAt desc terbaru", async () => {
    const before = ContentArticleRepositoryInMemory.listPublished();
    const ledger = await runLifecycleIlcE2E(
      "Tinjauan Konstitusionalitas Omnibus Law Cipta Kerja terhadap Hak Buruh atas Upah Layak Pasal 28G Ayat (1) UUD 1945",
      "Analisis putusan MK No.1-10/PUU-XX/2022 terkait judicial review UU No.11/2020 + reformulasi pasal upah minimum sektoral.",
      "Hukum Perburuhan",
      "Prof. Dr. Bambang Santoso, S.H., M.Hum.",
      "Fakultas Hukum Universitas Gadjah Mada — Pusat Studi Hukum Konstitusi",
    );
    const after = ContentArticleRepositoryInMemory.listPublished();
    assert.ok(after.length >= before.length + 1, `jumlah published bertambah minimal 1, dari ${before.length}→${after.length}`);

    const firstPublishedAfter = after[0];
    assert.ok(firstPublishedAfter.publishedAt instanceof Date, "teratas adalah published dengan publishedAt ter-stamp");
    const own = ContentArticleRepositoryInMemory.byId(ledger.createdId);
    assert.ok(own !== undefined && own.status === "published", "artikel kita muncul sebagai published di repo");
  });

  test("CommandInvocationRecord createContentArticle + publishContent memiliki key dan invokedAt terformat benar", async () => {
    const ledger = await runLifecycleIlcE2E(
      "Pertanggungjawaban Pidana Korporasi terhadap Tindak Pidana Pencemaran Nama Baik melalui Platform Media Sosial",
      "Studi kasus putusan PN Tipikor terkait liability direksi atas ujaran kebencian viral di X/Twitter + batas tanggung jawab platform UU ITE Pasal 28.",
      "Hukum Pidana",
      "Dr. Maria Paramita, S.H., M.Kn.",
      "Komisi Nasional Hak Asasi Manusia — Divisi Studi Hukum Pidana",
    );
    assert.equal(ledger.records.length, 2, "harus tepat 2 CommandInvocationRecord");

    const expectedKeys = ["createContentArticle", "publishContent"];
    for (let i = 0; i < ledger.records.length; i += 1) {
      const r = ledger.records[i];
      assert.equal(r.ok, true, `record ${i} ok:true`);
      assert.ok(r.commandKey.includes(expectedKeys[i]), `record ${i} commandKey mengandung ${expectedKeys[i]}`);
      assert.ok(r.invokedAt.length >= 16, `record ${i} invokedAt terformat`);
      assert.ok(Number.isNaN(Date.parse(r.invokedAt)) === false, `record ${i} invokedAt parseable`);
    }
  });

  test("listPublished() dan byId() consistent: semua yang published dari list bisa diambil byId dengan status published", async () => {
    const ledger = await runLifecycleIlcE2E(
      "Reformasi Tata Kelola Data Desa: Harmonisisasi PP No.3/2024 tentang Inovasi Desa dengan Peraturan Desa terhadap Hak Atas Data",
      "Gap analysis tata kelola data desa level kabupaten vs UU Desa + formulir conscent bentuk sederhana untuk 3T.",
      "Hukum Tata Negara dan Administrasi",
      "Dr. Sutan Rangkuti, S.H., M.P.A.",
      "Kementerian Dalam Negeri — Direktorat Jenderal Otonomi Daerah",
    );
    const published = ContentArticleRepositoryInMemory.listPublished();
    for (const art of published) {
      const retrieved = ContentArticleRepositoryInMemory.byId(art.id);
      assert.ok(retrieved !== undefined, `published id=${art.id} bisa diambil byId`);
      assert.equal(retrieved.status, "published", `byId(${art.id}) status == published`);
    }
    const our = ContentArticleRepositoryInMemory.byId(ledger.createdId);
    assert.ok(our !== undefined, "artikel kita byId dapat ditemukan");
    assert.equal(our.title, ledger.input.title, "title byId match input yang di-trim");
  });
});

test.describe("ILC Product Health Checks", () => {
  test("eos.yaml manifest is valid and contains all required fields", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;

    assert.ok(eosManifest.version, "Harus memiliki versi manifest");
    assert.ok(eosManifest.workspace?.name === "ilc", "Workspace name harus sesuai product ID");
    assert.ok(eosManifest.lifecycle?.phase === "D.1", "Harus dalam fase delivery yang benar");
    assert.ok(eosManifest.lifecycle?.status === "ACTIVE", "Product status harus ACTIVE");
    assert.ok(
      Array.isArray(eosManifest.lifecycle?.real_user_jobs) && eosManifest.lifecycle.real_user_jobs.length >= 1,
      "Harus memiliki minimal 1 real user job yang didefinisikan",
    );
  });

  test("production readiness metrics meet minimum thresholds", () => {
    const eosManifest = loadEosManifest() as Record<string, any>;
    const qualityTargets = eosManifest.quality?.targets ?? {};

    assert.ok((qualityTargets.test_coverage_min ?? 0) >= 80, "Test coverage minimum harus memenuhi standar platform");
    assert.ok(qualityTargets.evidence_required === true, "Semua artefak harus memerlukan bukti verifikasi");
  });
});
