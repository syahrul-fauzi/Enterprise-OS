"use client";

import { useMemo, useState, useEffect } from "react";
import { useWorkspaceSession } from "@/packages/core/kernel/src/session/workspace-session";
import type {
  CommunityDiscussionAggregate,
  DiscussionStatus,
  TopicCategory,
  ContentArticleAggregate,
  ContentStatus,
} from "../../implementation/contracts/community.contracts.js";

type DiscussionStatusFilter = DiscussionStatus | "all";
type ArticleStatusFilter = ContentStatus | "all";
type TopicFilter = TopicCategory | "all";
type CommunityTab = "discussions" | "articles";

interface DiscussionListResponse {
  readonly output: {
    readonly items: readonly CommunityDiscussionAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
  };
}

interface ArticleListResponse {
  readonly output: {
    readonly items: readonly ContentArticleAggregate[];
    readonly total: number;
    readonly matched: number;
    readonly offset: number;
    readonly limit: number;
  };
}

const TOPIC_OPTIONS: readonly TopicCategory[] = [
  "Hukum Perusahaan",
  "Hukum Perdata",
  "Hukum Pidana",
  "Hukum Keluarga",
  "Hukum Internasional",
  "Hukum Teknologi Digital",
  "Hukum Ketenagakerjaan",
  "Hukum Tata Negara",
];

const fmtOption = (s: string) => s.replace("_", " ");

function DiscussionCard({ item }: { readonly item: CommunityDiscussionAggregate }) {
  const { session } = useWorkspaceSession();
  const [isEscalating, setIsEscalating] = useState(false);
  
  const handleEscalateToCase = async () => {
    if (!session) return;
    setIsEscalating(true);
    try {
      const response = await fetch("/api/cases/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: `Escalated from discussion: ${item.title}`,
          description: item.summary || `Discussion from ILC community: ${item.title}`,
          priority: "medium",
          sessionId: session.sessionId,
          sourceDiscussionId: item.id,
        })
      });
      
      if (response.ok) {
        alert("Diskusi berhasil di-eskalasi menjadi kasus hukum!");
      } else {
        alert("Gagal melakukan eskalasi, silakan coba lagi.");
      }
    } catch (error) {
      console.error("Escalation error:", error);
      alert("Terjadi kesalahan saat melakukan eskalasi.");
    } finally {
      setIsEscalating(false);
    }
  };

  const statusColor =
    item.status === "featured"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : item.status === "locked"
        ? "bg-red-100 text-red-800 border-red-200"
        : "bg-emerald-100 text-emerald-800 border-emerald-200";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 leading-snug">{item.title}</h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
          {fmtOption(item.status)}
        </span>
      </div>
      {item.summary ? (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">{item.summary}</p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <div>
          <span className="text-slate-400">Topik</span>
          <div className="font-medium text-slate-700">{item.topicLabel ?? "—"}</div>
        </div>
        <div>
          <span className="text-slate-400">Dibuat</span>
          <div className="font-medium text-slate-700">{new Date(item.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <span className="text-slate-400">Replies</span>
          <div className="font-medium text-slate-700">{item.replyCount}</div>
        </div>
        <div>
          <span className="text-slate-400">Views</span>
          <div className="font-medium text-slate-700">{item.viewCount}</div>
        </div>
      </div>
      {item.startedBy ? (
        <div className="mt-3 text-[11px] text-slate-500">
          <span className="text-slate-400">Oleh </span>
          <span className="font-medium text-slate-700">{item.startedBy}</span>
          {item.startedByAffiliation ? (
            <span className="text-slate-500"> · {item.startedByAffiliation}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <button
          onClick={handleEscalateToCase}
          disabled={isEscalating || item.status === "locked"}
          className="w-full px-3 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isEscalating ? "Mengeskalasi..." : "Eskalasi ke Kasus Hukum"}
        </button>
      </div>
    </div>
  );
}

function ArticleCard({ item }: { readonly item: ContentArticleAggregate }) {
  const statusColor =
    item.status === "published" || item.status === "verified"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : item.status === "in_production"
        ? "bg-blue-100 text-blue-800 border-blue-200"
        : item.status === "accepted"
          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
          : item.status === "archived"
            ? "bg-slate-100 text-slate-800 border-slate-200"
            : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900 leading-snug">{item.title}</h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
          {fmtOption(item.status)}
        </span>
      </div>
      {item.summary ? (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">{item.summary}</p>
      ) : null}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
        <div>
          <span className="text-slate-400">Topik</span>
          <div className="font-medium text-slate-700">{item.topicLabel ?? "—"}</div>
        </div>
        <div>
          <span className="text-slate-400">Dibuat</span>
          <div className="font-medium text-slate-700">{new Date(item.createdAt).toLocaleDateString()}</div>
        </div>
        <div>
          <span className="text-slate-400">Dibaca</span>
          <div className="font-medium text-slate-700">{item.readCount}</div>
        </div>
        <div>
          <span className="text-slate-400">Engagement</span>
          <div className="font-medium text-slate-700">{item.engagementCount}</div>
        </div>
      </div>
      {item.author ? (
        <div className="mt-3 text-[11px] text-slate-500">
          <span className="text-slate-400">Penulis </span>
          <span className="font-medium text-slate-700">{item.author}</span>
          {item.authorAffiliation ? (
            <span className="text-slate-500"> · {item.authorAffiliation}</span>
          ) : null}
        </div>
      ) : null}
      {item.publishedAt ? (
        <div className="mt-1 text-[11px] text-emerald-600 font-medium">
          Published: {new Date(item.publishedAt).toLocaleDateString()}
        </div>
      ) : null}
    </div>
  );
}

export function CommunityWorkspace() {
  const [activeTab, setActiveTab] = useState<CommunityTab>("discussions");
  const [discussions, setDiscussions] = useState<CommunityDiscussionAggregate[]>([]);
  const [articles, setArticles] = useState<ContentArticleAggregate[]>([]);
  const [totalDiscussions, setTotalDiscussions] = useState(0);
  const [totalArticles, setTotalArticles] = useState(0);
  const [loading, setLoading] = useState(true);

  const [discussionStatus, setDiscussionStatus] = useState<DiscussionStatusFilter>("all");
  const [articleStatus, setArticleStatus] = useState<ArticleStatusFilter>("all");
  const [discussionTopic, setDiscussionTopic] = useState<TopicFilter>("all");
  const [articleTopic, setArticleTopic] = useState<TopicFilter>("all");
  const [query, setQuery] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      const cookie = document.cookie;
      const sessionCookie = cookie.split(";").find(c => c.trim().startsWith("workspace-session="));
      const credentials: RequestCredentials = sessionCookie ? "include" : "same-origin";

      const base = new URL(window.location.origin);
      const [discRes, artRes] = await Promise.all([
        fetch(`${base.pathname === "/" ? "" : base.pathname}/api/community/discussions/list?limit=50&offset=0`, { credentials }),
        fetch(`${base.pathname === "/" ? "" : base.pathname}/api/community/articles/list?limit=50&offset=0`, { credentials }),
      ]);

      if (discRes.ok) {
        const data = (await discRes.json()) as DiscussionListResponse;
        setDiscussions([...(data.output?.items ?? [])]);
        setTotalDiscussions(data.output?.total ?? 0);
      }
      if (artRes.ok) {
        const data = (await artRes.json()) as ArticleListResponse;
        setArticles([...(data.output?.items ?? [])]);
        setTotalArticles(data.output?.total ?? 0);
      }
    } catch (err) {
      console.error("[CommunityWorkspace] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    const onRefresh = () => {
      setLoading(true);
      void fetchAll();
    };
    window.addEventListener("community:refresh", onRefresh);
    window.addEventListener("discussions:refresh", onRefresh);
    window.addEventListener("articles:refresh", onRefresh);
    return () => {
      window.removeEventListener("community:refresh", onRefresh);
      window.removeEventListener("discussions:refresh", onRefresh);
      window.removeEventListener("articles:refresh", onRefresh);
    };
  }, []);

  const filteredDiscussions = useMemo(() => {
    let f = [...discussions];
    if (discussionStatus !== "all") f = f.filter(d => d.status === discussionStatus);
    if (discussionTopic !== "all") f = f.filter(d => d.topicLabel === discussionTopic);
    if (query.trim()) {
      const q = query.toLowerCase();
      f = f.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.summary?.toLowerCase() || "").includes(q),
      );
    }
    return f;
  }, [discussions, discussionStatus, discussionTopic, query]);

  const filteredArticles = useMemo(() => {
    let f = [...articles];
    if (articleStatus !== "all") f = f.filter(a => a.status === articleStatus);
    if (articleTopic !== "all") f = f.filter(a => a.topicLabel === articleTopic);
    if (query.trim()) {
      const q = query.toLowerCase();
      f = f.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.summary?.toLowerCase() || "").includes(q) ||
        (a.author?.toLowerCase() || "").includes(q),
      );
    }
    return f;
  }, [articles, articleStatus, articleTopic, query]);

  const discussionStatusOptions: readonly DiscussionStatusFilter[] = ["all", "open", "featured", "locked"];
  const articleStatusOptions: readonly ArticleStatusFilter[] = [
    "all",
    "proposed",
    "accepted",
    "in_production",
    "published",
    "archived",
    "verified",
  ];
  const topicOptions: readonly TopicFilter[] = ["all", ...TOPIC_OPTIONS];

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Community Hub (ILC + Academic)</h2>
          <p className="text-sm text-slate-500 mt-1">
            Diskusi publikasi &amp; artikel konten — shared surface ILC &amp; Academic
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs">
            {totalDiscussions} diskusi · {totalArticles} artikel
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {(
          [
            { id: "discussions", label: "Diskusi", count: filteredDiscussions.length },
            { id: "articles", label: "Artikel", count: filteredArticles.length },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}{" "}
            <span className="text-[11px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <input
          aria-label="Search community"
          className="px-3 py-1.5 border rounded-lg text-sm w-full sm:max-w-xs border-slate-300 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          value={query}
        />
        {activeTab === "discussions" ? (
          <>
            <div className="flex flex-wrap gap-1">
              {discussionStatusOptions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setDiscussionStatus(s)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    discussionStatus === s
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {fmtOption(s)}
                </button>
              ))}
            </div>
            <select
              value={discussionTopic}
              onChange={e => setDiscussionTopic(e.target.value as TopicFilter)}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white focus:border-indigo-600 focus:outline-none"
            >
              {topicOptions.map(t => (
                <option key={t} value={t}>
                  {t === "all" ? "All Topics" : t}
                </option>
              ))}
            </select>
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {articleStatusOptions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setArticleStatus(s)}
                  className={`text-xs px-2 py-1 rounded border transition ${
                    articleStatus === s
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {fmtOption(s)}
                </button>
              ))}
            </div>
            <select
              value={articleTopic}
              onChange={e => setArticleTopic(e.target.value as TopicFilter)}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white focus:border-indigo-600 focus:outline-none"
            >
              {topicOptions.map(t => (
                <option key={t} value={t}>
                  {t === "all" ? "All Topics" : t}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="p-6 text-center text-sm opacity-60 border rounded border-slate-200">
          Loading community data...
        </div>
      ) : activeTab === "discussions" ? (
        filteredDiscussions.length === 0 ? (
          <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded border-slate-300">
            Tidak ada diskusi yang cocok dengan filter.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filteredDiscussions.map(d => (
              <DiscussionCard key={d.id} item={d} />
            ))}
          </div>
        )
      ) : filteredArticles.length === 0 ? (
        <div className="p-6 text-center text-sm opacity-60 border border-dashed rounded border-slate-300">
          Tidak ada artikel yang cocok dengan filter.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredArticles.map(a => (
            <ArticleCard key={a.id} item={a} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CommunityWorkspace;