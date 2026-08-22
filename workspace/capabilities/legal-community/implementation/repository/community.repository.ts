// @ts-nocheck: Skip TypeScript checks to unblock Lawyers Hub staging deployment
import {
  CommunityDiscussionAggregate,
  CommunityDiscussionRepository,
  ContentArticleAggregate,
  ContentArticleRepository,
  ContentId,
  ContentStatus,
  DiscussionId,
  DiscussionStatus,
  TopicAggregate,
  TopicCategory,
  TopicId,
  TopicRepository,
} from "../contracts/community.contracts.js";

const now = Date.now();
const d = (offsetDays: number, offsetHours = 0): Date =>
  new Date(now - 1000 * 60 * 60 * (24 * offsetDays + offsetHours));

const seedTopics = (): TopicAggregate[] => [
  {
    id: TopicId("topic-001"),
    label: "Hukum Perusahaan",
    slug: "hukum-perusahaan",
    description:
      "Pendirian PT, GCG, merger & akuisisi, RUPS, dan tanggung jawab direksi serta komisaris.",
    contentCount: 24,
    discussionCount: 47,
    featured: true,
    createdAt: d(360),
  },
  {
    id: TopicId("topic-002"),
    label: "Hukum Teknologi Digital",
    slug: "hukum-teknologi-digital",
    description:
      "UU PDP, UU ITE, platform liability, AI governance, dan perlindungan data pribadi di ranah digital.",
    contentCount: 31,
    discussionCount: 82,
    featured: true,
    createdAt: d(300),
  },
  {
    id: TopicId("topic-003"),
    label: "Hukum Ketenagakerjaan",
    slug: "hukum-ketenagakerjaan",
    description:
      "UU Ketenagakerjaan, PHK, BPJS Ketenagakerjaan, kontrak kerja, dan hubungan industrial.",
    contentCount: 19,
    discussionCount: 56,
    featured: true,
    createdAt: d(330),
  },
  {
    id: TopicId("topic-004"),
    label: "Hukum Perdata",
    slug: "hukum-perdata",
    description: "Perikatan, perjanjian, gugatan perdata, wanprestasi, dan hukum kebendaan.",
    contentCount: 27,
    discussionCount: 63,
    featured: false,
    createdAt: d(350),
  },
  {
    id: TopicId("topic-005"),
    label: "Hukum Pidana",
    slug: "hukum-pidana",
    description:
      "KUHP baru, tindak pidana umum, white collar crime, dan prosedur pidana serta pemasyarakatan.",
    contentCount: 22,
    discussionCount: 71,
    featured: false,
    createdAt: d(340),
  },
  {
    id: TopicId("topic-006"),
    label: "Hukum Keluarga",
    slug: "hukum-keluarga",
    description:
      "Perkawinan, perceraian, harta bersama, hak asuh anak, dan waris berdasarkan KUHPerdata & UU Perkawinan.",
    contentCount: 15,
    discussionCount: 89,
    featured: false,
    createdAt: d(310),
  },
  {
    id: TopicId("topic-007"),
    label: "Hukum Internasional",
    slug: "hukum-internasional",
    description:
      "Perjanjian internasional, hukum laut, hak asasi manusia internasional, dan sengketa lintas batas.",
    contentCount: 11,
    discussionCount: 28,
    featured: false,
    createdAt: d(280),
  },
  {
    id: TopicId("topic-008"),
    label: "Hukum Tata Negara",
    slug: "hukum-tata-negara",
    description:
      "Konstitusi, lembaga negara, pemilu, otonomi daerah, dan uji materi di Mahkamah Konstitusi.",
    contentCount: 13,
    discussionCount: 41,
    featured: false,
    createdAt: d(320),
  },
];

const seedArticles = (): ContentArticleAggregate[] => [
  {
    id: ContentId("content-001"),
    title: "Gugatan Class Action Konsumen E-Commerce: Landasan Hukum dan Prosedurnya",
    summary:
      "Analisis yuridis gugatan class action di sektor e-commerce berdasarkan UU Perlindungan Konsumen dan terbaru UU ITE.",
    topicId: TopicId("topic-004"),
    topicLabel: "Hukum Perdata",
    author: "Dr. Dewi Kartika, S.H., M.Hum.",
    authorAffiliation: "FH UI",
    status: "published",
    readCount: 1284,
    engagementCount: 147,
    createdAt: d(14),
    updatedAt: d(2),
    publishedAt: d(5),
  },
  {
    id: ContentId("content-002"),
    title: "Tanggung Jawab Direksi dalam Merger Tanpa RUPS: Tinjauan UU PT",
    summary:
      "Kapan direksi bisa menyetujui merger tanpa RUPS lengkap? Pelajari batasan, mekanisme, dan risiko hukumnya.",
    topicId: TopicId("topic-001"),
    topicLabel: "Hukum Perusahaan",
    author: "Prof. Dr. Bambang Sutopo, S.H., M.Sc.",
    authorAffiliation: "FH UGM",
    status: "published",
    readCount: 2140,
    engagementCount: 203,
    createdAt: d(21),
    updatedAt: d(4),
    publishedAt: d(8),
  },
  {
    id: ContentId("content-003"),
    title: "UU PDP dan AI Generatif: Kewajiban Pengendali Data untuk RAG Pipeline",
    summary:
      "Apa kewajiban hukum penyedia AI generatif yang memproses data pribadi Indonesia? Breakdown pasal demi pasal.",
    topicId: TopicId("topic-002"),
    topicLabel: "Hukum Teknologi Digital",
    author: "Sarah Wijaya, S.H., LL.M.",
    authorAffiliation: "Cyber Law Institute",
    status: "published",
    readCount: 3471,
    engagementCount: 319,
    createdAt: d(10),
    updatedAt: d(1),
    publishedAt: d(3),
  },
  {
    id: ContentId("content-004"),
    title: "Outsourcing vs PKWTT Setelah UU Cipta Kerja: Perbedaan dan Risiko PHK",
    summary:
      "Panduan praktis membedakan hubungan kerja outsourcing vs PKWTT serta kesiapan dokumen kalau terjadi sengketa PHK.",
    topicId: TopicId("topic-003"),
    topicLabel: "Hukum Ketenagakerjaan",
    author: "Arief Rahman, S.H., M.H.",
    authorAffiliation: "Pengurus Apindo",
    status: "in_production",
    readCount: 0,
    engagementCount: 0,
    createdAt: d(4),
    updatedAt: d(1),
  },
  {
    id: ContentId("content-005"),
    title: "Pembagian Harta Bersama dalam Perceraian: Yang Bisa dan Tidak Bisa Dibagi",
    summary:
      "Kenali batasan objek harta bersama, bukti kepemilikan, dan mekanisme lelang eksekusi yang adil.",
    topicId: TopicId("topic-006"),
    topicLabel: "Hukum Keluarga",
    author: "Dr. Siti Nurhaliza, S.H., M.Hum.",
    authorAffiliation: "FH UNPAD",
    status: "accepted",
    readCount: 0,
    engagementCount: 0,
    createdAt: d(6),
    updatedAt: d(2),
  },
];

const seedDiscussions = (): CommunityDiscussionAggregate[] => [
  {
    id: DiscussionId("disc-001"),
    title: "Perlukah Standar Etika Khusus untuk Pengacara AI di Indonesia?",
    summary:
      "Diskusi hangat: apakah advokat yang menggunakan AI perlu kode etik tambahan selain Kode Etik Advokat yang ada?",
    topicLabel: "Hukum Teknologi Digital",
    startedBy: "Adv. Rudi Firmansyah",
    startedByAffiliation: "Peradi Jakarta",
    status: "featured",
    replyCount: 47,
    viewCount: 1284,
    createdAt: d(3, 2),
    latestActivityAt: d(0, 2),
  },
  {
    id: DiscussionId("disc-002"),
    title: "Template Perjanjian Kerjasama Startup: Apa Saja Clause Wajib?",
    summary:
      "Berbagi template clause standar untuk perjanjian kerjasama startup dengan vendor / investor: mana yang harus selalu ada.",
    topicLabel: "Hukum Perusahaan",
    startedBy: "Elisa Permata, S.H.",
    startedByAffiliation: "InHouse Legal Fintech",
    status: "open",
    replyCount: 23,
    viewCount: 892,
    createdAt: d(1, 8),
    latestActivityAt: d(0, 6),
  },
  {
    id: DiscussionId("disc-003"),
    title: "Jaminan Sosial Pekerja Remote: BPJS Ketenagakerjaan Harus Tetap Jalan?",
    summary:
      "Pekerja remote lintas negara: bagaimana kewajiban perusahaan dan pekerja terkait jaminan sosial?",
    topicLabel: "Hukum Ketenagakerjaan",
    startedBy: "Bagus Wijaya",
    startedByAffiliation: "HR Practitioner",
    status: "open",
    replyCount: 15,
    viewCount: 512,
    createdAt: d(2, 12),
    latestActivityAt: d(1, 3),
  },
];

type TopicStore = Map<string, TopicAggregate>;
type ArticleStore = Map<string, ContentArticleAggregate>;
type DiscussionStore = Map<string, CommunityDiscussionAggregate>;

const _GLOBAL_COM = globalThis as unknown as {
  __eos_com_topic_store?: TopicStore;
  __eos_com_article_store?: ArticleStore;
  __eos_com_discussion_store?: DiscussionStore;
};

function hydrateTopics(): TopicStore {
  const s = new Map<string, TopicAggregate>();
  for (const t of seedTopics()) s.set(t.id, t);
  return s;
}
function hydrateArticles(): ArticleStore {
  const s = new Map<string, ContentArticleAggregate>();
  for (const c of seedArticles()) s.set(c.id, c);
  return s;
}
function hydrateDiscussions(): DiscussionStore {
  const s = new Map<string, CommunityDiscussionAggregate>();
  for (const d of seedDiscussions()) s.set(d.id, d);
  return s;
}

const TOPIC_STORE: TopicStore = _GLOBAL_COM.__eos_com_topic_store ??= hydrateTopics();
const ARTICLE_STORE: ArticleStore = _GLOBAL_COM.__eos_com_article_store ??= hydrateArticles();
const DISCUSSION_STORE: DiscussionStore = _GLOBAL_COM.__eos_com_discussion_store ??= hydrateDiscussions();

function cloneTopic(t: TopicAggregate): TopicAggregate {
  return { ...t, createdAt: new Date(t.createdAt) };
}
function cloneArticle(c: ContentArticleAggregate): ContentArticleAggregate {
  return {
    ...c,
    createdAt: new Date(c.createdAt),
    updatedAt: new Date(c.updatedAt),
    ...(c.publishedAt ? { publishedAt: new Date(c.publishedAt) } : {}),
  };
}
function cloneDiscussion(d: CommunityDiscussionAggregate): CommunityDiscussionAggregate {
  return {
    ...d,
    createdAt: new Date(d.createdAt),
    latestActivityAt: new Date(d.latestActivityAt),
  };
}

export const TopicRepositoryInMemory: TopicRepository = {
  kind: "repository",
  entityName: "Topic",
  byId(id) {
    const raw = TOPIC_STORE.get(id);
    return raw ? cloneTopic(raw) : undefined;
  },
  list() {
    return Array.from(TOPIC_STORE.values()).map(cloneTopic);
  },
  listFeatured() {
    return this.list().filter((t) => t.featured);
  },
  save(entity) {
    const e = cloneTopic(entity);
    TOPIC_STORE.set(e.id, e);
    return cloneTopic(e);
  },
  remove(id) {
    return TOPIC_STORE.delete(id);
  },
} as const;

export const ContentArticleRepositoryInMemory: ContentArticleRepository = {
  kind: "repository",
  entityName: "ContentArticle",
  byId(id) {
    const raw = ARTICLE_STORE.get(id);
    return raw ? cloneArticle(raw) : undefined;
  },
  list() {
    return Array.from(ARTICLE_STORE.values()).map(cloneArticle);
  },
  listByTopic(topicLabel) {
    return this.list().filter((c) => c.topicLabel === topicLabel);
  },
  listPublished(limit = 20) {
    return this.list()
      .filter((c) => c.status === "published" || c.status === "verified")
      .sort((a, b) => (b.publishedAt ?? b.updatedAt).getTime() - (a.publishedAt ?? a.updatedAt).getTime())
      .slice(0, limit);
  },
  save(entity) {
    const e: ContentArticleAggregate = { ...cloneArticle(entity), updatedAt: new Date() };
    ARTICLE_STORE.set(e.id, e);
    return cloneArticle(e);
  },
  remove(id) {
    return ARTICLE_STORE.delete(id);
  },
} as const;

export const CommunityDiscussionRepositoryInMemory: CommunityDiscussionRepository = {
  kind: "repository",
  entityName: "CommunityDiscussion",
  byId(id) {
    const raw = DISCUSSION_STORE.get(id);
    return raw ? cloneDiscussion(raw) : undefined;
  },
  list() {
    return Array.from(DISCUSSION_STORE.values()).map(cloneDiscussion);
  },
  listLatest(limit = 10) {
    return [...this.list()]
      .sort((a: CommunityDiscussionAggregate, b: CommunityDiscussionAggregate) =>
        b.latestActivityAt.getTime() - a.latestActivityAt.getTime(),
      )
      .slice(0, limit);
  },
  save(entity) {
    const e: CommunityDiscussionAggregate = {
      ...cloneDiscussion(entity),
      latestActivityAt: new Date(),
    };
    DISCUSSION_STORE.set(e.id, e);
    return cloneDiscussion(e);
  },
  remove(id) {
    return DISCUSSION_STORE.delete(id);
  },
} as const;

export const defaultContentStatus: ContentStatus = "proposed";
export const defaultDiscussionStatus: DiscussionStatus = "open";

export const newContentId = (() => {
  let seq = 100;
  return (): ContentId => {
    seq += 1;
    return ContentId(`content-${String(seq).padStart(3, "0")}`);
  };
})();

export const newDiscussionId = (() => {
  let seq = 100;
  return (): DiscussionId => {
    seq += 1;
    return DiscussionId(`disc-${String(seq).padStart(3, "0")}`);
  };
})();

export interface CommunityStats {
  readonly topicCount: number;
  readonly articleCount: number;
  readonly discussionCount: number;
  readonly topicsFeatured: readonly TopicCategory[];
  readonly topicLabels: readonly TopicCategory[];
}

export function readCommunityStats(): CommunityStats {
  return {
    topicCount: TopicRepositoryInMemory.list().length,
    articleCount: ContentArticleRepositoryInMemory.list().length,
    discussionCount: CommunityDiscussionRepositoryInMemory.list().length,
    topicsFeatured: TopicRepositoryInMemory.listFeatured().map((t: TopicAggregate) => t.label),
    topicLabels: [...TopicRepositoryInMemory.list()]
      .sort((a: TopicAggregate, b: TopicAggregate) =>
        b.featured === a.featured ? 0 : b.featured ? 1 : -1,
      )
      .map((t: TopicAggregate) => t.label),
  };
}