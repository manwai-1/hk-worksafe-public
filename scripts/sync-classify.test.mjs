import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  applySnapshot,
  assemble,
  chartMonthsFrom,
  classify,
  isSafeRef,
  loadTexts,
  missingSnapshotStatus,
  plan,
  resolveSnapshotRef,
  publicCopy,
  snapshotDigest,
} from "./lib/register-sources.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const watched = [
  "sources/REGISTER.md",
  "sources/ZH_OFFICIAL_SUMMARIES.md",
  "sources/presentation.json",
  "src/content.ts",
  "src/data/register.json",
];
const hashes = new Map(
  watched.map((file) => [file, crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex")]),
);
const failures = [];
const fail = (message) => failures.push(message);
const months = chartMonthsFrom(fs.readFileSync(path.join(root, "src/lib/period.ts"), "utf8"));

function check(name, fn) {
  try {
    fn();
  } catch (error) {
    fail(name + "：" + (error && error.stack ? error.stack : error));
  }
}

function assertKind(result, kind) {
  if (result.kind !== kind) {
    throw new Error(`kind ${result.kind}，應為 ${kind}\n${result.errors.join("\n")}`);
  }
}

function recordMarkdown(item, update) {
  const extra = update
    ? `- **Update (2026-11-21 09:00 HKT):** A dated line.\n`
    : "";
  return `### ${item.date}

- **Type:** ${item.type}
- **Title:** ${item.titleEn} / ${item.titleZh}
- **Official source:** Fixture page. ${item.href}
- **Summary:** ${item.summary}
- **Legal reference:** None stated.
${extra}- **Status:** official
`;
}

function summaryMarkdown(item, update) {
  const extra = update
    ? `- **Update（2026-11-21 09:00 香港時間）：** 一則有日期的更新。\n`
    : "";
  return `### ${item.date}

- **Type:** ${item.type}
- **Official Chinese title:** ${item.titleZh}
- **Official Chinese source:** ${item.href}
- **Official Chinese summary:** ${item.zhSummary}
- **Legal reference (official Chinese):** 未有。
${extra}- **ZH source status:** ${item.status}
`;
}

function toy(options = {}) {
  const defs = {
    alpha: {
      id: "2026-11-01-alpha",
      type: "guidance",
      titleEn: "Alpha title",
      titleZh: "甲標題",
      href: "https://example.com/alpha",
      summary: options.summary || "A stated fact.",
      zhSummary: "一個已寫明的事實。",
      date: "2026-11-01 (HKT)",
      status: options.status || "fetched（2026-11-20 香港時間）",
    },
    beta: {
      id: "2026-11-02-beta",
      type: "guidance",
      titleEn: "Beta title",
      titleZh: "乙標題",
      href: "https://example.com/beta",
      summary: "Another stated fact.",
      zhSummary: "另一個已寫明的事實。",
      date: "2026-11-02 (HKT)",
      status: "fetched（2026-11-20 香港時間）",
    },
    late: {
      id: "2099-01-01-late",
      type: "incident",
      titleEn: "Late title",
      titleZh: "遠期標題",
      href: "https://example.com/late",
      summary: "A later fact.",
      zhSummary: "一宗較後的測試事實。",
      date: "2099-01-01 (HKT)",
      status: "fetched（2026-11-20 香港時間）",
    },
  };
  const keys = options.keys || ["alpha"];
  const items = keys.map((key) => defs[key]);
  const scan = options.scan || "2026-11-20 08:59";
  const coverage = options.coverage || "2026年11月1日至2026年11月20日";
  const counts = {};
  for (const item of items) counts[item.type] = (counts[item.type] || 0) + 1;
  const labels = {
    guidance: "指引",
    incident: "事故",
    prosecution: "檢控",
    alert: "職安警示",
    "code of practice": "工作守則",
    "ordinance/regulation": "條例／規例",
  };
  const countLine = `${items.length}筆，分為：${Object.entries(counts)
    .map(([type, count]) => `${labels[type]}（${type}）${count}`)
    .join("、")}。`;
  const patternIds = options.patternIds || items.map((item) => item.id);
  const register = `# Fixture

**Coverage:** 1 November 2026 to 20 November 2026. Last routine scan: ${scan} HKT.

${options.preamble || "Scope note alpha."}

## Records

${items.map((item) => recordMarkdown(item, options.update && item.id.endsWith("alpha"))).join("\n")}
`;
  const summaries = `# 測試

**資料截止時間：** ${scan} 香港時間

**涵蓋範圍：** ${coverage}

**紀錄數目：** ${countLine}

並於${scan.slice(0, 10)} 香港時間讀取核對。

## Records

${items.map((item) => summaryMarkdown(item, options.update && item.id.endsWith("alpha"))).join("\n")}
`;
  const presentation = {
    records: items.map((item) => ({
      id: item.id,
      titleEn: item.titleEn,
      sources: [{ title: "Fixture", site: "example.com", href: item.href }],
    })),
    patternGroups: [{ key: "other", label: "其他", ids: patternIds }],
    followThreads: options.threads || [],
    noParticulars: options.noParticulars || [],
  };
  return {
    register,
    summaries,
    presentation: JSON.stringify(presentation, null, 2) + "\n",
  };
}

function classifyToy(current, incoming, chartMonths) {
  return classify(current, incoming, { chartMonths: chartMonths === undefined ? months : chartMonths });
}

const production = loadTexts(root);
const FIXTURE_ID = `2099-01-01-fixture-${crypto.randomBytes(3).toString("hex")}`;

function withFixture(texts) {
  const current = assemble(texts);
  if (current.errors.length) throw new Error(current.errors.join("\n"));
  const counts = {};
  for (const record of current.records) counts[record.type] = (counts[record.type] || 0) + 1;
  counts.guidance = (counts.guidance || 0) + 1;
  const total = current.records.length + 1;
  const labels = {
    prosecution: "檢控",
    incident: "事故",
    alert: "職安警示",
    guidance: "指引",
    "code of practice": "工作守則",
    "ordinance/regulation": "條例／規例",
  };
  const countLine = `${total}筆，與登記冊相同，分為：${Object.keys(labels)
    .filter((type) => counts[type])
    .map((type) => `${labels[type]}（${type}）${counts[type]}`)
    .join("、")}。`;
  const registerRecord = `### 2099-01-01 (HKT; fixture, not an official record)

- **Type:** guidance
- **Title:** Fixture only / 測試紀錄
- **Official source:** Isolated test fixture. https://example.com/fixture-record
- **Summary:** This fixture is not an official record.
- **Legal reference:** None stated.
- **Status:** official

`;
  const zhRecord = `### 2099-01-01 (HKT; fixture, not an official record)

- **Type:** guidance
- **Official Chinese title:** 測試紀錄
- **Official Chinese source:** https://example.com/fixture-record
- **Official Chinese summary:** 此為測試紀錄，不是官方事實。
- **Legal reference (official Chinese):** 未有。
- **ZH source status:** fetched（2099-01-01 香港時間）

`;
  const presentation = JSON.parse(texts.presentation);
  presentation.records.unshift({
    id: FIXTURE_ID,
    titleEn: "Fixture only",
    sources: [{ title: "Fixture", site: "example.com", href: "https://example.com/fixture-record" }],
  });
  const other = presentation.patternGroups.find((group) => group.key === "other");
  if (!other) throw new Error("沒有「其他」形態");
  other.ids.push(FIXTURE_ID);
  return {
    id: FIXTURE_ID,
    total,
    register: texts.register.replace("## Records\n", "## Records\n" + registerRecord),
    summaries: texts.summaries
      .replace("## Records\n", "## Records\n" + zhRecord)
      .replace(/^\*\*紀錄數目：\*\*.*$/m, `**紀錄數目：** ${countLine}`),
    presentation: JSON.stringify(presentation, null, 2) + "\n",
  };
}

function withUpdate(texts) {
  return {
    ...texts,
    register: texts.register.replace(
      "- **Status:** official",
      "- **Update (2098-12-31 23:59 HKT):** Fixture dated line, not an official fact.\n- **Status:** official",
    ),
    summaries: texts.summaries.replace(
      "- **ZH source status:**",
      "- **Update（2098-12-31 23:59 香港時間）：** 測試用日期更新，不是官方事實。\n- **ZH source status:**",
    ),
  };
}

function shiftScan(texts) {
  const bundle = assemble(texts);
  if (bundle.errors.length) throw new Error(bundle.errors.join("\n"));
  const routine = bundle.scan.regCoverage.match(/Last routine scan: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}) HKT/);
  if (!routine) throw new Error("沒有 Last routine scan");
  const target = bundle.scan.cutoff.startsWith("2098-12-31") ? "2098-12-30 23:59" : "2098-12-31 23:59";
  const marker = texts.summaries.search(/^## Records\s*$/m);
  const head = texts.summaries.slice(0, marker);
  const body = texts.summaries.slice(marker).replace(
    /^\*\*ZH source status:\*\*.*$/gm,
    "**ZH source status:** fetched（2098-12-31 香港時間）",
  );
  const nextHead = head
    .replace(`**資料截止時間：** ${bundle.scan.cutoff}`, `**資料截止時間：** ${target} 香港時間`)
    .replace(/並於\d{4}-\d{2}-\d{2} 香港時間讀取核對/, `並於${target.slice(0, 10)} 香港時間讀取核對`);
  return {
    ...texts,
    register: texts.register.replace(`Last routine scan: ${routine[1]} HKT`, `Last routine scan: ${target} HKT`),
    summaries: nextHead + body,
  };
}

check("identical toy is none", () => {
  const base = toy();
  const result = classifyToy(base, base);
  assertKind(result, "none");
  if (plan(result) !== "noop") throw new Error(plan(result));
  if (snapshotDigest(base) !== snapshotDigest(base)) throw new Error("digest unstable");
});

check("add-only toy", () => {
  const current = toy({ keys: ["alpha"] });
  const incoming = toy({ keys: ["beta", "alpha"] });
  const result = classifyToy(current, incoming);
  assertKind(result, "add");
  if (plan(result) !== "publish") throw new Error(plan(result));
  if (result.added.map((item) => item.id).join() !== "2026-11-02-beta") throw new Error(JSON.stringify(result.added));
  if (result.modified.length || result.removed.length) throw new Error("add path touched existing records");
});

check("dated update line is modify", () => {
  const current = toy();
  const incoming = toy({ update: true });
  const result = classifyToy(current, incoming);
  assertKind(result, "modify");
  if (plan(result) !== "draft") throw new Error(plan(result));
  if (result.added.length) throw new Error("update was treated as an add");
  if (!result.modified[0].reasons.includes("update")) throw new Error(result.modified[0].reasons.join());
});

check("summary edit is modify", () => {
  const result = classifyToy(toy(), toy({ summary: "A stated fact, revised." }));
  assertKind(result, "modify");
  if (!result.modified[0].reasons.includes("register:Summary")) throw new Error(result.modified[0].reasons.join());
});

check("mixed add and modification", () => {
  const result = classifyToy(toy({ keys: ["alpha"] }), toy({ keys: ["beta", "alpha"], summary: "A stated fact, revised." }));
  assertKind(result, "mixed");
  if (plan(result) !== "draft") throw new Error(plan(result));
  if (result.added.length !== 1 || result.modified.length !== 1) throw new Error(JSON.stringify(result));
});

check("scan-time only", () => {
  const result = classifyToy(toy(), toy({ scan: "2026-11-21 09:10", status: "fetched（2026-11-21 香港時間）" }));
  assertKind(result, "scan-time");
  if (plan(result) !== "publish") throw new Error(plan(result));
  if (result.added.length || result.modified.length || result.preambleChanged) throw new Error(JSON.stringify(result));
  if (!result.scanChanged) throw new Error("scan not flagged");
});

check("scope prose is modify", () => {
  const result = classifyToy(toy(), toy({ preamble: "Scope note beta." }));
  assertKind(result, "modify");
  if (!result.preambleChanged) throw new Error("preamble not flagged");
});

check("reorder is modify", () => {
  const result = classifyToy(toy({ keys: ["alpha", "beta"] }), toy({ keys: ["beta", "alpha"] }));
  assertKind(result, "modify");
  if (!result.orderChanged) throw new Error("order not flagged");
  if (result.added.length || result.modified.length) throw new Error("reorder looked like a body edit");
});

check("deletion is modify", () => {
  const result = classifyToy(toy({ keys: ["alpha", "beta"] }), toy({ keys: ["alpha"] }));
  assertKind(result, "modify");
  if (result.removed.map((item) => item.id).join() !== "2026-11-02-beta") throw new Error(JSON.stringify(result.removed));
});

check("chart month blocks publish", () => {
  const result = classifyToy(toy({ keys: ["alpha"] }), toy({ keys: ["late", "alpha"] }));
  assertKind(result, "add");
  if (plan(result) !== "draft") throw new Error(plan(result));
  if (result.blocks[0]?.reason !== "chart-month") throw new Error(JSON.stringify(result.blocks));
});

check("missing pattern is invalid", () => {
  const incoming = toy({ keys: ["alpha", "beta"], patternIds: ["2026-11-01-alpha"] });
  const result = classifyToy(toy({ keys: ["alpha"] }), incoming);
  assertKind(result, "invalid");
  if (plan(result) !== "fail") throw new Error(plan(result));
});

check("unsafe ref rejected", () => {
  if (isSafeRef("incoming/verified") !== true) throw new Error("branch ref");
  if (isSafeRef("incoming/../main") || isSafeRef("-n") || isSafeRef("refs heads")) throw new Error("accepted unsafe ref");
});

check("snapshot ref follows the event", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  if (resolveSnapshotRef({ eventName: "schedule", snapshotRef: "other", pushSha: sha }) !== "incoming/verified") {
    throw new Error("schedule used the wrong ref");
  }
  if (resolveSnapshotRef({ eventName: "", snapshotRef: sha, pushSha: sha }) !== "incoming/verified") {
    throw new Error("unknown event used the sha");
  }
  if (resolveSnapshotRef({ eventName: "push", pushSha: sha.toUpperCase() }) !== sha) throw new Error("push did not pin the sha");
  if (resolveSnapshotRef({ eventName: "workflow_dispatch", snapshotRef: "incoming/other" }) !== "incoming/other") {
    throw new Error("dispatch ignored snapshot_ref");
  }
  if (resolveSnapshotRef({ eventName: "workflow_dispatch", snapshotRef: "  " }) !== "incoming/verified") {
    throw new Error("empty dispatch ref");
  }
  let rejected = false;
  try {
    resolveSnapshotRef({ eventName: "push", pushSha: "abc" });
  } catch {
    rejected = true;
  }
  if (!rejected) throw new Error("short sha accepted");
  if (missingSnapshotStatus("schedule") !== 0) throw new Error("missing schedule branch should exit 0");
  if (missingSnapshotStatus("push") !== 1 || missingSnapshotStatus("workflow_dispatch") !== 1) {
    throw new Error("missing push or dispatch ref should fail");
  }
});

check("workflow runs at 10:00 and 18:00 and on push", () => {
  const workflow = fs.readFileSync(path.join(root, ".github/workflows/data-sync.yml"), "utf8");
  const spec = fs.readFileSync(path.join(root, "API_SPEC.md"), "utf8");
  if (!workflow.includes('cron: "0 2 * * *"') || !workflow.includes('cron: "0 10 * * *"')) throw new Error("cron");
  if (/08:15|20:15|15 0 \*|15 12 \*/.test(workflow) || /08:15|20:15|00:15 UTC|12:15 UTC/.test(spec)) {
    throw new Error("old schedule remains");
  }
  if (!workflow.includes("push:") || !workflow.includes("incoming/verified") || !workflow.includes("workflow_dispatch:")) {
    throw new Error("trigger");
  }
  if (!workflow.includes("snapshot_ref:") || !workflow.includes("SNAPSHOT_SHA:")) throw new Error("snapshot inputs");
  if (!spec.includes("10:00") || !spec.includes("18:00") || !spec.includes("02:00 UTC") || !spec.includes("10:00 UTC")) {
    throw new Error("spec times");
  }
  if (!spec.includes("github.sha")) throw new Error("spec does not pin the pushed commit");
});

check("published header matches the source cutoff and count", () => {
  const content = fs.readFileSync(path.join(root, "src/content.ts"), "utf8");
  const copy = publicCopy(production, { kind: "scan-time", added: [], modified: [], removed: [] });
  if (!content.includes(copy.header)) throw new Error(copy.header);
  if (content.includes("該次掃描未發現新的意外、檢控、職安警示、法例／規例、工作守則或指引") && !content.includes(copy.body)) {
    throw new Error(copy.body);
  }
});

check("crlf snapshot matches", () => {
  const base = toy();
  const crlf = {
    register: base.register.replaceAll("\n", "\r\n"),
    summaries: base.summaries.replaceAll("\n", "\r\n"),
    presentation: base.presentation.replaceAll("\n", "\r\n"),
  };
  assertKind(classifyToy(base, crlf), "none");
});

check("follow thread on an existing record is modify", () => {
  const incoming = toy({ threads: [{ id: "thread-alpha", kind: "no-alert", ids: ["2026-11-01-alpha"] }] });
  const result = classifyToy(toy(), incoming);
  assertKind(result, "modify");
  if (!result.modified[0].reasons.includes("follow")) throw new Error(result.modified[0].reasons.join());
});

check("follow thread of only a new record stays add", () => {
  const incoming = toy({
    keys: ["beta", "alpha"],
    threads: [{ id: "thread-beta", kind: "file", ids: ["2026-11-02-beta"] }],
  });
  const result = classifyToy(toy({ keys: ["alpha"] }), incoming);
  assertKind(result, "add");
  if (plan(result) !== "publish") throw new Error(plan(result));
});

check("apply scan-time is idempotent and refreshes the cutoff", () => {
  const current = toy();
  const incoming = toy({ scan: "2026-11-21 09:10", status: "fetched（2026-11-21 香港時間）" });
  const result = classifyToy(current, incoming);
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "sync-apply-"));
  fs.mkdirSync(path.join(dest, "src"), { recursive: true });
  fs.copyFileSync(path.join(root, "src/content.ts"), path.join(dest, "src/content.ts"));
  applySnapshot(dest, incoming, result);
  const patched = fs.readFileSync(path.join(dest, "src/content.ts"), "utf8");
  if (!patched.includes("資料截止：2026-11-21 09:10 香港時間 · 收錄 1 筆")) throw new Error("header not refreshed");
  if (!patched.includes("該次掃描未發現新的意外、檢控、職安警示、法例／規例、工作守則或指引")) {
    throw new Error("scan-time note missing");
  }
  if (!patched.includes("本冊共 85 筆官方紀錄")) throw new Error("unused CALLOUT was rewritten");
  const written = loadTexts(dest);
  const again = classifyToy(written, incoming);
  assertKind(again, "none");
  fs.rmSync(dest, { recursive: true, force: true });
});

check("production snapshot against itself is none", () => {
  const result = classify(production, production, { chartMonths: months });
  assertKind(result, "none");
  if (result.blocks.length) throw new Error(JSON.stringify(result.blocks));
  const second = classify(production, production, { chartMonths: months });
  if (JSON.stringify(result) !== JSON.stringify(second)) throw new Error("classify is not deterministic");
});

check("production scan-time only", () => {
  const incoming = shiftScan(production);
  const result = classify(production, incoming, { chartMonths: months });
  assertKind(result, "scan-time");
  if (plan(result) !== "publish") throw new Error(plan(result));
  if (result.modified.length || result.added.length || result.removed.length || result.preambleChanged) {
    throw new Error(JSON.stringify({ modified: result.modified, preamble: result.preambleChanged }));
  }
});

check("production dated update is not add", () => {
  const result = classify(production, withUpdate(production), { chartMonths: months });
  assertKind(result, "modify");
  if (result.added.length) throw new Error("dated update counted as new");
  if (!result.modified.some((item) => item.reasons.includes("update"))) throw new Error(JSON.stringify(result.modified));
});

check("production add-only", () => {
  const incoming = withFixture(production);
  const result = classify(production, incoming, { chartMonths: months });
  assertKind(result, "add");
  if (plan(result) !== "publish") throw new Error(JSON.stringify({ plan: plan(result), blocks: result.blocks, errors: result.errors }));
  if (result.added.map((item) => item.id).join() !== incoming.id) throw new Error(JSON.stringify(result.added));
});

check("production add without count line is invalid", () => {
  const incoming = withFixture(production);
  const original = production.summaries.match(/^\*\*紀錄數目：\*\*.*$/m)[0];
  incoming.summaries = incoming.summaries.replace(/^\*\*紀錄數目：\*\*.*$/m, original);
  const result = classify(production, incoming, { chartMonths: months });
  assertKind(result, "invalid");
});

check("production mixed add and update", () => {
  const incoming = withFixture(withUpdate(production));
  const result = classify(production, incoming, { chartMonths: months });
  assertKind(result, "mixed");
  if (plan(result) !== "draft") throw new Error(plan(result));
  if (!result.added.length || !result.modified.length) throw new Error(JSON.stringify(result));
});

if (process.env.SKIP_INTEGRATION !== "1") check("add-only fixture passes the data tests", () => {
  const incoming = withFixture(production);
  const result = classify(production, incoming, { chartMonths: months });
  assertKind(result, "add");
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), "sync-add-"));
  fs.cpSync(root, dest, {
    recursive: true,
    filter: (src) => {
      const rel = path.relative(root, src);
      if (!rel) return true;
      const top = rel.split(path.sep)[0];
      return top !== "node_modules" && top !== "dist" && top !== ".git";
    },
  });
  fs.symlinkSync(path.join(root, "node_modules"), path.join(dest, "node_modules"), "dir");
  applySnapshot(dest, incoming, result);
  const steps = [
    ["node", ["scripts/build-data.mjs"]],
    ["node", [path.join(root, "node_modules/typescript/lib/tsc.js"), "--noEmit"]],
    ["node", ["--experimental-strip-types", "scripts/test.mjs"]],
  ];
  for (const [cmd, args] of steps) {
    const ran = spawnSync(cmd, args, { cwd: dest, encoding: "utf8" });
    if (ran.status !== 0) {
      throw new Error(`${cmd} ${args.join(" ")}\n${(ran.stdout || "").slice(-2500)}\n${(ran.stderr || "").slice(-2500)}`);
    }
  }
  const built = JSON.parse(fs.readFileSync(path.join(dest, "src/data/register.json"), "utf8"));
  if (built.records.length !== incoming.total) throw new Error("built " + built.records.length);
  if (built.records[0].id !== incoming.id) throw new Error(built.records[0].id);
  const header = fs.readFileSync(path.join(dest, "src/content.ts"), "utf8");
  if (!header.includes(`收錄 ${incoming.total} 筆`)) throw new Error("count not applied");
  if (!header.includes("此次加入 1 筆")) throw new Error("add note missing");
  const nested = spawnSync("node", ["scripts/sync-classify.test.mjs"], {
    cwd: dest,
    encoding: "utf8",
    env: { ...process.env, SKIP_INTEGRATION: "1" },
  });
  if (nested.status !== 0) throw new Error((nested.stdout || "").slice(-2000) + "\n" + (nested.stderr || "").slice(-2000));
  fs.rmSync(dest, { recursive: true, force: true });
});

check("runner self-check and fixture plans", () => {
  const self = spawnSync("node", ["scripts/sync-run.mjs", "--self-check"], { cwd: root, encoding: "utf8" });
  if (self.status !== 0) throw new Error(self.stdout + self.stderr);
  if (!self.stdout.includes('"kind":"none"')) throw new Error(self.stdout);
  const blocked = spawnSync("node", ["scripts/sync-run.mjs", "--push"], { cwd: root, encoding: "utf8" });
  if (blocked.status === 0) throw new Error("push was allowed outside Actions");
  const currentDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-current-"));
  const incomingDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-incoming-"));
  for (const dir of [currentDir, incomingDir]) fs.mkdirSync(path.join(dir, "sources"), { recursive: true });
  const write = (dir, texts) => {
    fs.writeFileSync(path.join(dir, "sources/REGISTER.md"), texts.register);
    fs.writeFileSync(path.join(dir, "sources/ZH_OFFICIAL_SUMMARIES.md"), texts.summaries);
    fs.writeFileSync(path.join(dir, "sources/presentation.json"), texts.presentation);
  };
  write(currentDir, toy());
  write(incomingDir, toy({ update: true }));
  const ran = spawnSync(
    "node",
    ["scripts/sync-run.mjs", "--current-dir", currentDir, "--incoming-dir", incomingDir],
    { cwd: root, encoding: "utf8" },
  );
  if (ran.status !== 0) throw new Error(ran.stdout + ran.stderr);
  if (!ran.stdout.includes('"plan":"draft"') || !ran.stdout.includes('"kind":"modify"')) throw new Error(ran.stdout);
  fs.rmSync(currentDir, { recursive: true, force: true });
  fs.rmSync(incomingDir, { recursive: true, force: true });
});

for (const [file, hash] of hashes) {
  const next = crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");
  if (next !== hash) failures.push("測試改動了正式檔案：" + file);
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}
console.log("同步分類通過：無變、新增、改動、日期更新、混合、只更新掃描時間，以及新增紀錄可通過資料測試。");
