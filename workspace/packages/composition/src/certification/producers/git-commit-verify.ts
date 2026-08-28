//import { spawnSync } from "node:child_process";
//import type { IndependentEvidenceProducer, ProducerContext } from "./types.js";
//import { produceEvidencePackageEnvelope } from "./types.js";
//
//const PRODUCER_ID = "git-commit-verify-v1";
//const PRODUCER_NAME = "Git Commit Hash & Diff-Stat External IEP";
//const TARGET_ARTIFACT = "entire repository HEAD commit + tree";
//const EXPERIMENT_ID = "EXP-A8-EXT-001-GIT-COMMIT-VERIFY";
//
//export class GitCommitHashProducer implements IndependentEvidenceProducer {
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
//    function runGit(args: readonly string[]): { readonly ok: boolean; readonly stdout: string; readonly stderr: string; readonly status: number | null } {
//      try {
//        const res = spawnSync("git", args as string[], {
//          cwd: ctx.repoRoot,
//          encoding: "utf8",
//          timeout: 15000,
//          maxBuffer: 10 * 1024 * 1024,
//        });
//        return {
//          ok: res.status === 0 && res.error === undefined,
//          stdout: (res.stdout ?? "").trimEnd(),
//          stderr: (res.stderr ?? "").trimEnd(),
//          status: res.status,
//        };
//      } catch (err) {
//        return { ok: false, stdout: "", stderr: err instanceof Error ? (err.stack ?? err.message) : String(err), status: null };
//      }
//    }
//
//    assertions.push("GIT-1: Repo adalah working tree git (git rev-parse --is-inside-work-tree=true)");
//    assertions.push("GIT-2: HEAD commit hash 40-hex tersedia");
//    assertions.push("GIT-3: Working tree CLEAN (TIDAK ada perubahan uncommitted) ATAU dirty-diff stats terekam");
//    assertions.push("GIT-4: `git log -1` author + date + subject terekam dengan format RFC2822");
//    assertions.push("GIT-5: Short tree status (number changed files, insertions, deletions) tersedia");
//
//    const isGit = runGit(["rev-parse", "--is-inside-work-tree"]);
//    observations.push(`GIT-1 inside_work_tree=${String(isGit.ok && isGit.stdout === "true")} stdout='${isGit.stdout}' status=${String(isGit.status)}`);
//    if (!(isGit.ok && isGit.stdout === "true")) {
//      exitCode = 1;
//      observations.push(`GIT-1 FAIL — repo root=${ctx.repoRoot} BUKAN working tree git. stderr='${isGit.stderr.slice(0, 200)}'`);
//    }
//
//    let commitHash = "";
//    const head = runGit(["rev-parse", "HEAD"]);
//    observations.push(`GIT-2 rev-parse HEAD=${head.ok ? head.stdout : "(FAIL)"} status=${String(head.status)} stderr='${head.stderr.slice(0, 120)}'`);
//    if (head.ok && /^[0-9a-f]{40}$/.test(head.stdout)) {
//      commitHash = head.stdout;
//      observations.push(`GIT-2 HEAD_commit_sha=${commitHash}`);
//    } else {
//      exitCode = 1;
//      observations.push("GIT-2 FAIL — HEAD bukan 40-hex SHA-1.");
//    }
//
//    const log1 = runGit(["log", "-1", "--format=format:%H%x1f%an%x1f%ae%x1f%aD%x1f%cn%x1f%ce%x1f%cD%x1f%s"]);
//    observations.push(`GIT-4 author+date subject status=${String(log1.ok)}`);
//    if (log1.ok && log1.stdout.length > 0) {
//      const parts = log1.stdout.split("\x1f");
//      observations.push(`GIT-4 commit=${parts[0] ?? ""} author=${parts[1] ?? ""} <${parts[2] ?? ""}> authorDate=${parts[3] ?? ""} committer=<${parts[5] ?? ""}> commitDate=${parts[6] ?? ""} subject=${JSON.stringify(parts[7] ?? "")}`);
//    } else if (exitCode === 0) {
//      observations.push(`GIT-4 FAIL — status=${String(log1.status)} stderr='${log1.stderr.slice(0, 200)}'`);
//      exitCode = 1;
//    }
//
//    const statusPorcelain = runGit(["status", "--porcelain=v2", "--untracked-files=no"]);
//    const changes = statusPorcelain.ok ? statusPorcelain.stdout.split("\n").filter(l => l.length > 0).length : -1;
//    observations.push(`GIT-3 working-tree-dirty modified+staged tracked count=${changes}`);
//    if (changes > 0) {
//      observations.push(`GIT-3 working tree TIDAK clean — ${changes} line perubahan terdeteksi. Snapshot certification ini mencerminkan state working tree TIDAK = HEAD commit.`);
//    }
//
//    let statsFiles = 0;
//    let statsInsertions = 0;
//    let statsDeletions = 0;
//    const numstat = runGit(["diff", "--numstat", "HEAD", "--"]);
//    if (numstat.ok && numstat.stdout.length > 0) {
//      for (const line of numstat.stdout.split("\n")) {
//        if (!line.trim()) continue;
//        const [addS, delS] = line.split("\t");
//        const add = addS === "-" ? 0 : Number.parseInt(addS ?? "0", 10);
//        const del = delS === "-" ? 0 : Number.parseInt(delS ?? "0", 10);
//        if (Number.isFinite(add)) statsInsertions += add;
//        if (Number.isFinite(del)) statsDeletions += del;
//        statsFiles++;
//      }
//    }
//    observations.push(`GIT-5 numstat diff-vs-HEAD files=${statsFiles} insertions(+)=${statsInsertions} deletions(-)=${statsDeletions}`);
//
//    return produceEvidencePackageEnvelope(
//      this,
//      {
//        experimentProtocol: Object.freeze([
//          "Call git via spawnSync from node:child_process (NOT via libgit2 / isomorphic-git — using system-native binary).",
//          "Run 5 probes: rev-parse is-inside-work-tree, rev-parse HEAD, log -1 with %H|%an|%ae|%aD|%cn|%ce|%cD|%s separated by 0x1F, status --porcelain=v2 (untracked=no), diff --numstat HEAD.",
//          "Record exit status, stdout truncated, and stderr per probe. Compute working-tree-dirty count and diff-vs-HEAD numstat summary.",
//          "DO NOT modify working tree. All commands read-only (safe).",
//        ]),
//        rawObservations: Object.freeze(observations),
//        assertionIds: Object.freeze(assertions),
//        evidenceSources: Object.freeze([
//          `native system git binary (${runGit(["--version"]).stdout || "version-unknown"})`,
//          "git rev-parse HEAD → commit identity",
//          "git log -1 → author/committer/date/subject provenance",
//          "git status --porcelain=v2 → working tree cleanliness",
//          "git diff --numstat HEAD → insertions/deletions count",
//        ]),
//        scriptFile: "packages/composition/src/certification/producers/git-commit-verify.ts",
//        functionName: "GitCommitHashProducer.produce()",
//        gitCommit: commitHash || undefined,
//        exitCode,
//      },
//      ctx,
//    );
//  }
//}
//
//export const gitCommitHashProducer: IndependentEvidenceProducer = new GitCommitHashProducer();
