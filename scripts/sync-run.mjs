import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  SNAPSHOT_BRANCH,
  SNAPSHOT_FILES,
  applySnapshot,
  chartMonthsFrom,
  classify,
  isSafeRef,
  loadTexts,
  plan,
  summarize,
} from "./lib/register-sources.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function arg(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || "" : "";
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
}

function must(command, args) {
  const result = run(command, args);
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} 失敗\n${result.stderr || result.stdout || ""}`);
  }
  return result.stdout || "";
}

function chartMonths() {
  return chartMonthsFrom(fs.readFileSync(path.join(repoRoot, "src/lib/period.ts"), "utf8"));
}

function commitSubject(result) {
  if (result.kind === "add") return `sync: add ${result.added.length} register records`;
  if (result.kind === "scan-time") return "sync: update scan cutoff";
  if (result.kind === "mixed") {
    return `sync: review ${result.added.length} new and ${result.modified.length + result.removed.length} changed records`;
  }
  if (result.modified.length + result.removed.length === 0) return "sync: review register metadata";
  return `sync: review ${result.modified.length + result.removed.length} register changes`;
}

function prTitle(result) {
  if (result.kind === "add") return `資料同步：加入 ${result.added.length} 筆`;
  if (result.kind === "scan-time") return "資料同步：更新掃描截止時間";
  if (result.kind === "mixed") return "資料同步：覆核新增與改動";
  return "資料同步：覆核既有紀錄改動";
}

function report(result, ci) {
  const decision = plan(result);
  const tail =
    decision === "draft"
      ? "請覆核 diff。此草稿不會自動合併。"
      : "CI 已在此工作流程通過。自動合併啟用後，會觸發既有的 Pages 工作流程。";
  return `${summarize(result)}\n\n## CI\n\n${ci}\n\n${tail}\n`;
}

function trimLog(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`.trim().slice(-12000);
}

function runCi() {
  const test = run("npm", ["test"]);
  if (test.status !== 0) return { ok: false, log: trimLog(test) };
  const build = run("npm", ["run", "build"]);
  if (build.status !== 0) return { ok: false, log: trimLog(build) };
  return { ok: true, log: "npm test 與 npm run build 已通過。" };
}

function openPullRequest(digest) {
  const raw = must("gh", ["pr", "list", "--state", "open", "--limit", "100", "--json", "number,body,headRefName,isDraft"]);
  return JSON.parse(raw).find((item) => typeof item.body === "string" && item.body.includes(`Snapshot-Digest: ${digest}`)) || null;
}

function enableAutoMerge(branch, subject) {
  const result = run("gh", ["pr", "merge", branch, "--squash", "--auto", "--delete-branch", "--subject", subject]);
  if (result.status === 0) return;
  const text = `${result.stderr || ""}\n${result.stdout || ""}`;
  if (!/already/i.test(text)) throw new Error(text);
}

function waitUntilMerged(branch) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const view = JSON.parse(must("gh", ["pr", "view", branch, "--json", "state"]));
    if (view.state === "MERGED") return true;
    run("sleep", ["10"]);
  }
  return false;
}

function dispatchPages() {
  must("gh", ["workflow", "run", "pages.yml", "--ref", "main"]);
}

function ensurePagesForHead() {
  const subject = must("git", ["log", "-1", "--format=%s"]).trim();
  if (!subject.startsWith("sync:")) return;
  const sha = must("git", ["rev-parse", "HEAD"]).trim();
  const runs = JSON.parse(must("gh", ["run", "list", "--workflow", "pages.yml", "--commit", sha, "--json", "databaseId"]));
  if (runs.length > 0) return;
  dispatchPages();
  console.log("已補觸發 Pages 工作流程：" + sha);
}

function finishPublish(selector, subject) {
  enableAutoMerge(selector, subject);
  if (!waitUntilMerged(selector)) {
    throw new Error("自動合併未在時限內完成。若倉庫未允許 auto-merge，或分支保護要求覆核，拉取請求會保持開啟，下次排程會再試。");
  }
  dispatchPages();
  console.log("已合併並觸發 Pages 工作流程。");
}

function readSnapshot(ref) {
  const texts = {};
  const names = {
    "sources/REGISTER.md": "register",
    "sources/ZH_OFFICIAL_SUMMARIES.md": "summaries",
    "sources/presentation.json": "presentation",
  };
  for (const [file, key] of Object.entries(names)) {
    const shown = run("git", ["show", `${ref}:${file}`]);
    if (shown.status !== 0) throw new Error(`快照缺少 ${file}`);
    texts[key] = shown.stdout;
  }
  return texts;
}

function main() {
  if (process.argv.includes("--self-check")) {
    const result = classify(loadTexts(repoRoot), loadTexts(repoRoot), { chartMonths: chartMonths() });
    const decision = plan(result);
    console.log(JSON.stringify({ kind: result.kind, plan: decision, errors: result.errors, blocks: result.blocks }));
    process.exit(result.kind === "none" && decision === "noop" && result.blocks.length === 0 ? 0 : 1);
  }

  const currentDir = arg("--current-dir");
  const incomingDir = arg("--incoming-dir");
  if (currentDir || incomingDir) {
    if (!currentDir || !incomingDir) throw new Error("--current-dir 與 --incoming-dir 要一併使用");
    const result = classify(loadTexts(currentDir), loadTexts(incomingDir), { chartMonths: chartMonths() });
    console.log(JSON.stringify({
      plan: plan(result),
      kind: result.kind,
      added: result.added.map((item) => item.id),
      modified: result.modified,
      removed: result.removed.map((item) => item.id),
      blocks: result.blocks,
      errors: result.errors,
    }));
    process.exit(result.kind === "invalid" ? 1 : 0);
  }

  const push = process.argv.includes("--push");
  if (push && process.env.GITHUB_ACTIONS !== "true") {
    console.error("sync-run --push 只在 GitHub Actions 執行。");
    process.exit(1);
  }
  if (!push) {
    console.log("未加 --push，不讀取遠端快照。");
    process.exit(0);
  }

  ensurePagesForHead();
  const refName = process.env.SNAPSHOT_REF || SNAPSHOT_BRANCH;
  if (!isSafeRef(refName)) throw new Error("snapshot_ref 不接受");
  const remoteRef = `refs/remotes/origin/${refName}`;
  const fetched = run("git", ["fetch", "--depth=1", "origin", `+refs/heads/${refName}:${remoteRef}`]);
  if (fetched.status !== 0) {
    if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") throw new Error("找不到快照 ref " + refName);
    console.log("沒有快照分支，結束。");
    process.exit(0);
  }

  const current = loadTexts(repoRoot);
  const incoming = readSnapshot(remoteRef);
  const result = classify(current, incoming, { chartMonths: chartMonths() });
  const decision = plan(result);
  console.log(summarize(result));
  console.log("合併路徑：" + decision);
  if (decision === "fail") process.exit(1);
  if (decision === "noop") process.exit(0);

  const subject = commitSubject(result);
  const existing = openPullRequest(result.digest);
  if (existing) {
    if (decision === "publish" && !existing.isDraft) {
      finishPublish(String(existing.number), subject);
      process.exit(0);
    }
    console.log("已有開啟的拉取請求 #" + existing.number + "，結束。");
    process.exit(0);
  }

  const branch = `sync/data-${result.digest.slice(0, 12)}-${Date.now().toString(36)}`;
  must("git", ["config", "user.name", "github-actions[bot]"]);
  must("git", ["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"]);
  must("git", ["checkout", "-B", branch]);
  applySnapshot(repoRoot, incoming, result);
  must("node", ["scripts/build-data.mjs"]);
  must("git", ["add", "--", ...SNAPSHOT_FILES, "src/data/register.json", "src/content.ts"]);
  const staged = must("git", ["diff", "--cached", "--name-only"]).trim();
  if (!staged) throw new Error("分類有變，但沒有可提交的檔案");
  must("git", ["commit", "-m", subject]);

  const ci = runCi();
  console.log(ci.log);
  const dirty = must("git", ["status", "--porcelain"]).trim();
  if (dirty) throw new Error("CI 改動了已提交檔案：\n" + dirty);
  if (decision === "publish" && !ci.ok) {
    console.error("CI 未通過，不推送、不合併。");
    process.exit(1);
  }

  must("git", ["push", "--set-upstream", "origin", branch]);
  const bodyPath = path.join(os.tmpdir(), `sync-pr-${result.digest.slice(0, 12)}.md`);
  fs.writeFileSync(bodyPath, report(result, ci.ok ? ci.log : "未通過：\n\n```\n" + ci.log + "\n```"));
  const create = ["pr", "create", "--base", "main", "--head", branch, "--title", prTitle(result), "--body-file", bodyPath];
  if (decision === "draft") create.push("--draft");
  const created = must("gh", create).trim();
  if (decision === "draft") {
    console.log("已開草稿，不自動合併。");
    console.log(created);
    process.exit(0);
  }
  finishPublish(created.split("\n").pop(), subject);
}

main();
