import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const SNAPSHOT_BRANCH = "incoming/verified";

export function resolveSnapshotRef({ eventName, snapshotRef, pushSha }) {
  if (eventName === "workflow_dispatch") {
    const ref = String(snapshotRef || "").trim();
    return ref || SNAPSHOT_BRANCH;
  }
  if (eventName === "push") {
    const sha = String(pushSha || "").trim().toLowerCase();
    if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("push 事件沒有完整 sha");
    return sha;
  }
  return SNAPSHOT_BRANCH;
}

export function missingSnapshotStatus(eventName) {
  return eventName === "schedule" ? 0 : 1;
}

export function syncBranchPrefix(digest) {
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error("摘要不是 64 位");
  return `sync/data-${digest.slice(0, 12)}`;
}

export function bodyHasSnapshotDigest(body, digest) {
  if (typeof body !== "string" || !/^[0-9a-f]{64}$/.test(digest)) return false;
  const needle = `Snapshot-Digest: ${digest}`;
  let from = 0;
  while (from < body.length) {
    const at = body.indexOf(needle, from);
    if (at < 0) return false;
    const next = body[at + needle.length];
    if (next === undefined || !/[0-9a-f]/i.test(next)) return true;
    from = at + needle.length;
  }
  return false;
}

export function isSyncHeadBranch(name, digest) {
  if (typeof name !== "string") return false;
  const prefix = syncBranchPrefix(digest);
  return name === prefix || name.startsWith(`${prefix}-`);
}

export function selectOwnedSyncPullRequest(pulls, { digest, repository }) {
  if (!repository) return [];
  return pulls.filter((pr) => {
    if (!pr || pr.isCrossRepository) return false;
    if (pr.repository !== repository || pr.headRepository !== repository) return false;
    if (!isSyncHeadBranch(pr.headRefName, digest)) return false;
    if (pr.snapshotDigest !== digest) return false;
    if (!bodyHasSnapshotDigest(pr.body, digest)) return false;
    return true;
  });
}

export function pullRequestAction({ decision, owned }) {
  const match = owned[0] || null;
  if (decision === "publish" && match && !match.isDraft) {
    return { action: "auto-merge", pr: match.number, branch: match.headRefName, draft: false, dispatch: true };
  }
  if (decision === "publish" && match && match.isDraft) {
    return { action: "update", pr: match.number, branch: match.headRefName, draft: true, dispatch: false };
  }
  if (decision === "publish") {
    return { action: "create", pr: null, branch: null, draft: false, dispatch: false };
  }
  if (decision === "draft" && match) {
    return { action: "update", pr: match.number, branch: match.headRefName, draft: true, dispatch: false };
  }
  if (decision === "draft") {
    return { action: "create", pr: null, branch: null, draft: true, dispatch: false };
  }
  return { action: "none", pr: null, branch: null, draft: false, dispatch: false };
}

export const SNAPSHOT_FILES = [
  "sources/REGISTER.md",
  "sources/ZH_OFFICIAL_SUMMARIES.md",
  "sources/presentation.json",
];

export const KNOWN_TYPES = new Set([
  "incident",
  "prosecution",
  "alert",
  "guidance",
  "ordinance/regulation",
  "code of practice",
]);

const MONTH_FROM_NAME = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

const SCAN_NOTE =
  "最近一次例行掃描；該次掃描未發現新的意外、檢控、職安警示、法例／規例、工作守則或指引";

export function parseRecords(markdown) {
  const body = normalizeNewlines(markdown).split(/^## Records\s*$/m)[1];
  if (!body) throw new Error("找不到 ## Records");
  return body
    .split(/^### /m)
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const lines = chunk.replace(/\s+$/, "").split("\n");
      const heading = lines[0].trim();
      const raw = lines.slice(1).join("\n");
      const fields = {};
      let key = null;
      let buf = [];
      const flush = () => {
        if (!key) return;
        fields[key] = buf.join("\n").trim();
        key = null;
        buf = [];
      };
      for (const line of lines.slice(1)) {
        const match = line.match(/^- \*\*(.+?)[:：]\*\*\s*(.*)$/);
        if (match) {
          flush();
          key = match[1];
          buf = [match[2]];
        } else if (key) {
          buf.push(line);
        }
      }
      flush();
      return { heading, fields, raw };
    });
}

export function normalizeNewlines(text) {
  return String(text).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function periodKey(datetime) {
  const iso = String(datetime).match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const named = String(datetime).match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (!named) return null;
  const month = MONTH_FROM_NAME[named[1].toLowerCase()];
  return month ? `${named[2]}-${month}` : null;
}

export function chartMonthsFrom(source) {
  const start = source.indexOf("export const CHART_MONTHS");
  if (start < 0) return [];
  const end = source.indexOf("] as const", start);
  const slice = source.slice(start, end < 0 ? start : end);
  return [...slice.matchAll(/"(\d{4}-\d{2})"/g)].map((match) => match[1]);
}

export function isSafeRef(ref) {
  return (
    typeof ref === "string" &&
    /^[A-Za-z0-9._/-]{1,200}$/.test(ref) &&
    !ref.includes("..") &&
    !ref.startsWith("/") &&
    !ref.startsWith("-") &&
    !ref.endsWith("/")
  );
}

export function snapshotDigest(texts) {
  const hash = crypto.createHash("sha256");
  hash.update(normalizeNewlines(texts.register));
  hash.update("\0");
  hash.update(normalizeNewlines(texts.summaries));
  hash.update("\0");
  hash.update(normalizeNewlines(texts.presentation));
  return hash.digest("hex");
}

export function loadTexts(dir) {
  return {
    register: fs.readFileSync(path.join(dir, "sources/REGISTER.md"), "utf8"),
    summaries: fs.readFileSync(path.join(dir, "sources/ZH_OFFICIAL_SUMMARIES.md"), "utf8"),
    presentation: fs.readFileSync(path.join(dir, "sources/presentation.json"), "utf8"),
  };
}

function urlsIn(text) {
  return [...String(text).matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0].replace(/[),.;]+$/, ""));
}

function isUpdateKey(key) {
  return key.startsWith("Update");
}

function emptyBundle(errors, texts) {
  return {
    errors,
    records: [],
    byId: new Map(),
    presentation: { records: [], patternGroups: [], followThreads: [], noParticulars: [] },
    scan: { cutoff: "", coverage: "", regCoverage: "" },
    preambleNorm: { register: "", summaries: "" },
    digest: snapshotDigest(texts),
  };
}

function readScan(register, summaries) {
  const regHead = preambleOf(register);
  const zhHead = preambleOf(summaries);
  const cutoff = (zhHead.match(/^\*\*資料截止時間：\*\*\s*(.*)$/m) || [])[1]?.trim() || "";
  const coverage = (zhHead.match(/^\*\*涵蓋範圍：\*\*\s*(.*)$/m) || [])[1]?.trim() || "";
  const countLine = (zhHead.match(/^\*\*紀錄數目：\*\*\s*(.*)$/m) || [])[1]?.trim() || "";
  const regCoverage = (regHead.match(/^\*\*Coverage:\*\*\s*(.*)$/m) || [])[1]?.trim() || "";
  return { cutoff, coverage, countLine, regCoverage };
}

function preambleOf(markdown) {
  const parts = normalizeNewlines(markdown).split(/^## Records\s*$/m);
  return parts[0] || "";
}

const COUNT_LABELS = [
  ["prosecution", "檢控"],
  ["incident", "事故"],
  ["alert", "職安警示"],
  ["guidance", "指引"],
  ["code of practice", "工作守則"],
  ["ordinance/regulation", "條例／規例"],
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countResidue(text) {
  const token = new RegExp(
    COUNT_LABELS.map(([type, label]) => `${escapeRegExp(label)}（${escapeRegExp(type)}）\\s*\\d+`).join("|"),
    "g",
  );
  const masked = text.replace(/\d+\s*筆/, "«TOTAL»");
  return masked
    .split(token)
    .filter((part) => !/^[、\s]*$/.test(part))
    .join("")
    .replaceAll("«TOTAL»", "");
}

function normalizePreamble(register, summaries) {
  let reg = preambleOf(register);
  let zh = preambleOf(summaries);
  reg = reg.replace(/^\*\*Coverage:\*\*.*$/m, "**Coverage:** «COVERAGE»");
  zh = zh.replace(/^\*\*資料截止時間：\*\*.*$/m, "**資料截止時間：** «CUTOFF»");
  zh = zh.replace(/^\*\*涵蓋範圍：\*\*.*$/m, "**涵蓋範圍：** «COVERAGE»");
  zh = zh.replace(/^\*\*紀錄數目：\*\*\s*(.*)$/m, (_all, rest) => `**紀錄數目：** ${countResidue(rest)}`);
  zh = zh.replace(/並於\d{4}-\d{2}-\d{2} 香港時間讀取核對/g, "並於«DATE» 香港時間讀取核對");
  return { register: reg.trim(), summaries: zh.trim() };
}

function validateCountLine(countLine, records, errors) {
  if (!countLine) {
    errors.push("缺少紀錄數目行");
    return;
  }
  const totalMatch = countLine.match(/(\d+)\s*筆/);
  if (!totalMatch) {
    errors.push("紀錄數目行沒有筆數");
    return;
  }
  if (Number(totalMatch[1]) !== records.length) {
    errors.push(`紀錄數目行是 ${totalMatch[1]}，實際 ${records.length}`);
  }
  const pairs = [...countLine.matchAll(/（([a-z][a-z /]+)）\s*(\d+)/g)];
  if (!pairs.length) {
    errors.push("紀錄數目行沒有各類型筆數");
    return;
  }
  const seen = new Map(pairs.map((match) => [match[1], Number(match[2])]));
  const typeCounts = {};
  for (const record of records) typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (seen.get(type) !== count) {
      errors.push(`紀錄數目行的 ${type} 是 ${seen.has(type) ? seen.get(type) : "缺"}，實際 ${count}`);
    }
  }
  for (const [type, count] of seen) {
    if (count > 0 && !typeCounts[type]) errors.push(`紀錄數目行列出沒有紀錄的類型 ${type}`);
    if (!KNOWN_TYPES.has(type)) errors.push("紀錄數目行有未知類型 " + type);
  }
}

export function assemble(texts) {
  const register = normalizeNewlines(texts.register);
  const summaries = normalizeNewlines(texts.summaries);
  const presentationText = normalizeNewlines(texts.presentation);
  const errors = [];
  let presentation;
  try {
    presentation = JSON.parse(presentationText);
  } catch (error) {
    return emptyBundle(["presentation.json 不是有效 JSON：" + error.message], texts);
  }
  if (!presentation || !Array.isArray(presentation.records)) {
    return emptyBundle(["presentation.records 不是陣列"], texts);
  }
  if (!Array.isArray(presentation.patternGroups)) errors.push("presentation.patternGroups 不是陣列");
  const groups = Array.isArray(presentation.patternGroups) ? presentation.patternGroups : [];
  const threads = Array.isArray(presentation.followThreads) ? presentation.followThreads : [];
  const noParticulars = Array.isArray(presentation.noParticulars) ? presentation.noParticulars : [];
  if (!Array.isArray(presentation.followThreads)) errors.push("presentation.followThreads 不是陣列");
  if (!Array.isArray(presentation.noParticulars)) errors.push("presentation.noParticulars 不是陣列");

  let regRecords;
  let zhRecords;
  try {
    regRecords = parseRecords(register);
    zhRecords = parseRecords(summaries);
  } catch (error) {
    return emptyBundle([error.message], texts);
  }
  if (zhRecords.length !== regRecords.length || regRecords.length !== presentation.records.length) {
    errors.push(
      `紀錄數目不符：中文 ${zhRecords.length}、登記冊 ${regRecords.length}、presentation ${presentation.records.length}`,
    );
  }
  if (presentation.records.length === 0) errors.push("沒有紀錄");

  const patternOf = new Map();
  for (const group of groups) {
    if (!group || typeof group.key !== "string" || typeof group.label !== "string" || !Array.isArray(group.ids)) {
      errors.push("形態歸類格式不符");
      continue;
    }
    for (const id of group.ids) {
      if (patternOf.has(id)) errors.push("形態歸類重複：" + id);
      else patternOf.set(id, group.key);
    }
  }

  const records = [];
  const seen = new Set();
  const count = Math.min(zhRecords.length, regRecords.length, presentation.records.length);
  for (let index = 0; index < count; index += 1) {
    const meta = presentation.records[index];
    const zh = zhRecords[index];
    const reg = regRecords[index];
    if (!meta || typeof meta.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(meta.id)) {
      errors.push("缺少或不合規格的 id 於序位 " + index);
      continue;
    }
    if (seen.has(meta.id)) errors.push("重複 id " + meta.id);
    seen.add(meta.id);
    const title = reg.fields.Title || "";
    const parts = title.split(" / ");
    let titleEn = "";
    let titleZh = "";
    if (parts.length !== 2) errors.push("標題無法拆成中英兩段：" + meta.id);
    else {
      [titleEn, titleZh] = parts;
      if (titleEn !== meta.titleEn) errors.push("英文標題與 presentation 不符：" + meta.id);
      if (titleZh !== zh.fields["Official Chinese title"]) errors.push("中文標題不符：" + meta.id);
    }
    const type = (reg.fields.Type || "").trim();
    if ((zh.fields.Type || "").trim() !== type) errors.push("類型不符：" + meta.id);
    if (!KNOWN_TYPES.has(type)) errors.push("未知類型：" + meta.id + " " + type);
    const officialSource = (reg.fields["Official source"] || "").trim();
    const hrefs = new Set((Array.isArray(meta.sources) ? meta.sources : []).map((source) => source.href));
    if (!Array.isArray(meta.sources)) errors.push("presentation 來源不是陣列：" + meta.id);
    for (const url of urlsIn(officialSource)) {
      if (!hrefs.has(url)) errors.push(`官方來源網址未列入連結：${meta.id} ${url}`);
    }
    if (!patternOf.has(meta.id)) errors.push("未有形態歸類：" + meta.id);
    const summaryZh = zh.fields["Official Chinese summary"];
    const legalZh = zh.fields["Legal reference (official Chinese)"];
    const legalEn = reg.fields["Legal reference"];
    if (!summaryZh || !legalZh || !legalEn) errors.push("缺少摘要或法例編號：" + meta.id);
    records.push({
      id: meta.id,
      heading: reg.heading,
      type,
      titleEn,
      titleZh,
      reg,
      zh,
      meta,
      patternKey: patternOf.get(meta.id) || "",
    });
  }

  for (const id of patternOf.keys()) {
    if (!seen.has(id)) errors.push("形態有未知紀錄 " + id);
  }
  for (const thread of threads) {
    if (!thread || typeof thread.id !== "string" || !Array.isArray(thread.ids)) {
      errors.push("跟進線索格式不符");
      continue;
    }
    for (const id of thread.ids) {
      if (!seen.has(id)) errors.push("跟進線索有未知紀錄 " + thread.id + " " + id);
    }
  }
  for (const id of noParticulars) {
    if (!seen.has(id)) errors.push("noParticulars 有未知紀錄 " + id);
  }

  const scan = readScan(register, summaries);
  if (!scan.cutoff) errors.push("缺少資料截止時間");
  if (!scan.coverage) errors.push("缺少涵蓋範圍");
  if (!scan.regCoverage) errors.push("缺少英文 Coverage 行");
  if (records.length === presentation.records.length) validateCountLine(scan.countLine, records, errors);

  return {
    errors,
    records,
    byId: new Map(records.map((record) => [record.id, record])),
    presentation: { ...presentation, patternGroups: groups, followThreads: threads, noParticulars },
    scan,
    preambleNorm: normalizePreamble(register, summaries),
    digest: snapshotDigest(texts),
  };
}

function updateEntries(fields) {
  return Object.entries(fields).filter(([key]) => isUpdateKey(key));
}

function plainEntries(fields, extraSkip = []) {
  return Object.entries(fields).filter(([key]) => !isUpdateKey(key) && !extraSkip.includes(key));
}

function threadsTouching(presentation, id) {
  return presentation.followThreads
    .filter((thread) => thread.ids.includes(id))
    .map((thread) => JSON.stringify({ id: thread.id, kind: thread.kind, ids: thread.ids }))
    .sort();
}

function fieldDiff(before, after, prefix) {
  const left = new Map(before);
  const right = new Map(after);
  const keys = [...new Set([...left.keys(), ...right.keys()])].sort();
  const reasons = [];
  for (const key of keys) {
    if (left.get(key) !== right.get(key)) reasons.push(prefix + key);
  }
  return reasons;
}

function comparableRaw(record) {
  const hideStatus = (text) => String(text || "").replace(/^- \*\*ZH source status[:：]\*\*.*$/gm, "- **ZH source status:** «STATUS»");
  return `${hideStatus(record.reg.raw)}\0${hideStatus(record.zh.raw)}`;
}

function recordReasons(current, incoming, currentBundle, incomingBundle) {
  const reasons = [];
  if (comparableRaw(current) !== comparableRaw(incoming)) reasons.push("raw");
  if (current.heading !== incoming.heading) reasons.push("heading");
  reasons.push(
    ...fieldDiff(plainEntries(current.reg.fields), plainEntries(incoming.reg.fields), "register:"),
    ...fieldDiff(
      plainEntries(current.zh.fields, ["ZH source status"]),
      plainEntries(incoming.zh.fields, ["ZH source status"]),
      "zh:",
    ),
  );
  if (JSON.stringify(updateEntries(current.reg.fields)) !== JSON.stringify(updateEntries(incoming.reg.fields))) {
    reasons.push("update");
  }
  if (JSON.stringify(updateEntries(current.zh.fields)) !== JSON.stringify(updateEntries(incoming.zh.fields))) {
    reasons.push("update");
  }
  if (current.meta.titleEn !== incoming.meta.titleEn) reasons.push("titleEn");
  if (JSON.stringify(current.meta.sources) !== JSON.stringify(incoming.meta.sources)) reasons.push("sources");
  if (current.patternKey !== incoming.patternKey) reasons.push("pattern");
  if (
    JSON.stringify(threadsTouching(currentBundle.presentation, current.id)) !==
    JSON.stringify(threadsTouching(incomingBundle.presentation, incoming.id))
  ) {
    reasons.push("follow");
  }
  const currentNo = currentBundle.presentation.noParticulars.includes(current.id);
  const incomingNo = incomingBundle.presentation.noParticulars.includes(incoming.id);
  if (currentNo !== incomingNo) reasons.push("no-particulars");
  return [...new Set(reasons)].sort();
}

function sharedSequence(ids, shared) {
  return ids.filter((id) => shared.has(id)).join("\0");
}

function taxonomyChanged(current, incoming) {
  const currentGroups = current.presentation.patternGroups;
  const incomingGroups = incoming.presentation.patternGroups;
  const currentKeys = currentGroups.map((group) => group.key + "\0" + group.label).join("\n");
  const incomingKeys = incomingGroups.map((group) => group.key + "\0" + group.label).join("\n");
  return currentKeys !== incomingKeys;
}

function patternOrderChanged(current, incoming, shared) {
  for (const group of current.presentation.patternGroups) {
    const next = incoming.presentation.patternGroups.find((item) => item.key === group.key);
    if (!next) continue;
    if (sharedSequence(group.ids, shared) !== sharedSequence(next.ids, shared)) return true;
  }
  return false;
}

function scanChanged(current, incoming, sharedIds) {
  if (current.scan.cutoff !== incoming.scan.cutoff) return true;
  if (current.scan.coverage !== incoming.scan.coverage) return true;
  if (current.scan.regCoverage !== incoming.scan.regCoverage) return true;
  for (const id of sharedIds) {
    const left = (current.byId.get(id).zh.fields["ZH source status"] || "").trim();
    const right = (incoming.byId.get(id).zh.fields["ZH source status"] || "").trim();
    if (left !== right) return true;
  }
  return false;
}

function chartBlocks(incoming, chartMonths) {
  if (!chartMonths) return [];
  const blocks = [];
  for (const record of incoming.records) {
    if (!["incident", "prosecution", "alert"].includes(record.type)) continue;
    const period = periodKey(record.heading);
    if (!period || !chartMonths.includes(period)) {
      blocks.push({ id: record.id, reason: "chart-month", period: period || "" });
    }
  }
  return blocks;
}

export function classify(currentTexts, incomingTexts, options = {}) {
  const digest = snapshotDigest(incomingTexts);
  const current = assemble(currentTexts);
  const incoming = assemble(incomingTexts);
  const base = {
    digest,
    added: [],
    modified: [],
    removed: [],
    orderChanged: false,
    preambleChanged: false,
    taxonomy: false,
    patternOrder: false,
    scanChanged: false,
    blocks: [],
    errors: [],
  };
  if (current.errors.length || incoming.errors.length) {
    return {
      ...base,
      kind: "invalid",
      errors: [
        ...current.errors.map((error) => "現行來源：" + error),
        ...incoming.errors.map((error) => "快照：" + error),
      ],
    };
  }

  const currentIds = current.records.map((record) => record.id);
  const incomingIds = incoming.records.map((record) => record.id);
  const currentSet = new Set(currentIds);
  const incomingSet = new Set(incomingIds);
  const shared = new Set(currentIds.filter((id) => incomingSet.has(id)));
  const added = incoming.records
    .filter((record) => !currentSet.has(record.id))
    .map((record) => ({ id: record.id, type: record.type, titleEn: record.titleEn }));
  const removed = current.records
    .filter((record) => !incomingSet.has(record.id))
    .map((record) => ({ id: record.id, titleEn: record.titleEn }));
  const modified = [];
  for (const id of currentIds) {
    if (!incomingSet.has(id)) continue;
    const reasons = recordReasons(current.byId.get(id), incoming.byId.get(id), current, incoming);
    if (reasons.length) modified.push({ id, reasons });
  }
  const orderChanged = sharedSequence(incomingIds, shared) !== sharedSequence(currentIds, shared);
  const preambleChanged =
    current.preambleNorm.register !== incoming.preambleNorm.register ||
    current.preambleNorm.summaries !== incoming.preambleNorm.summaries;
  const taxonomy = taxonomyChanged(current, incoming);
  const patternOrder = patternOrderChanged(current, incoming, shared);
  const scan = scanChanged(current, incoming, shared);
  const structural =
    removed.length > 0 || modified.length > 0 || orderChanged || preambleChanged || taxonomy || patternOrder;
  let kind = "none";
  if (structural && added.length) kind = "mixed";
  else if (structural) kind = "modify";
  else if (added.length) kind = "add";
  else if (scan) kind = "scan-time";

  return {
    ...base,
    kind,
    added,
    modified,
    removed,
    orderChanged,
    preambleChanged,
    taxonomy,
    patternOrder,
    scanChanged: scan,
    blocks: chartBlocks(incoming, options.chartMonths),
  };
}

export function plan(result) {
  if (result.kind === "invalid") return "fail";
  if (result.kind === "none") return "noop";
  if (result.blocks.length > 0) return "draft";
  if (result.kind === "add" || result.kind === "scan-time") return "publish";
  return "draft";
}

export function syncExit(decision) {
  if (decision === "fail") return { exitCode: 1, openPr: false };
  if (decision === "noop") return { exitCode: 0, openPr: false };
  return { exitCode: null, openPr: true };
}

export function cutoffNote(result) {
  if (result.kind === "scan-time") return SCAN_NOTE;
  if (result.kind === "add") return `最近一次例行掃描；此次加入 ${result.added.length} 筆`;
  return `最近一次例行掃描；加入 ${result.added.length} 筆，既有紀錄改動 ${result.modified.length} 筆，移除 ${result.removed.length} 筆，尚待覆核`;
}

export function publicCopy(texts, result) {
  const bundle = assemble(texts);
  if (bundle.errors.length) throw new Error(bundle.errors.join("\n"));
  const header = `資料截止：${bundle.scan.cutoff} · 收錄 ${bundle.records.length} 筆`;
  const body = `資料截止：${bundle.scan.cutoff}（${cutoffNote(result)}）。涵蓋範圍：${bundle.scan.coverage}。`;
  return { header, body, recordCount: bundle.records.length };
}

function replaceOnce(source, regex, replacement) {
  const match = regex.exec(source);
  if (!match) throw new Error("content.ts 格式不符");
  return source.slice(0, match.index) + replacement + source.slice(match.index + match[0].length);
}

export function patchContent(content, texts, result) {
  const copy = publicCopy(texts, result);
  let next = replaceOnce(content, /export const HEADER_LINE = ".*";/, `export const HEADER_LINE = ${JSON.stringify(copy.header)};`);
  next = replaceOnce(next, /export const CUTOFF =\n  ".*";/, `export const CUTOFF =\n  ${JSON.stringify(copy.body)};`);
  return next;
}

function finish(text) {
  const normalized = normalizeNewlines(text);
  return normalized.endsWith("\n") ? normalized : normalized + "\n";
}

export function applySnapshot(repoRoot, texts, result) {
  const sources = path.join(repoRoot, "sources");
  fs.mkdirSync(sources, { recursive: true });
  fs.writeFileSync(path.join(sources, "REGISTER.md"), finish(texts.register));
  fs.writeFileSync(path.join(sources, "ZH_OFFICIAL_SUMMARIES.md"), finish(texts.summaries));
  fs.writeFileSync(path.join(sources, "presentation.json"), finish(texts.presentation));
  const contentPath = path.join(repoRoot, "src/content.ts");
  const content = fs.readFileSync(contentPath, "utf8");
  fs.writeFileSync(contentPath, patchContent(content, texts, result));
}

function line(label, items, render) {
  if (!items.length) return `## ${label}\n\n無。`;
  return `## ${label}\n\n${items.map(render).join("\n")}`;
}

export function summarize(result) {
  const decision = plan(result);
  const lines = [
    "## 分類",
    "",
    `\`${result.kind}\`。合併路徑：\`${decision}\`。`,
    "",
    line("新增", result.added, (item) => `- \`${item.id}\` ${item.type} — ${item.titleEn}`),
    "",
    line(
      "改動",
      result.modified,
      (item) => `- \`${item.id}\`：${item.reasons.join("、")}`,
    ),
    "",
    line("移除", result.removed, (item) => `- \`${item.id}\` — ${item.titleEn}`),
    "",
    "## 掃描元資料",
    "",
    result.scanChanged ? "截止時間、涵蓋範圍或 ZH source status 有變。" : "無變。",
    "",
    "## 其他",
    "",
    `- 既有紀錄相對次序：${result.orderChanged ? "有變" : "無變"}`,
    `- 序言（非掃描欄）：${result.preambleChanged ? "有變" : "無變"}`,
    `- 形態分類標籤：${result.taxonomy ? "有變" : "無變"}`,
    `- 形態內既有次序：${result.patternOrder ? "有變" : "無變"}`,
  ];
  if (result.blocks.length) {
    lines.push(
      "",
      "## 未能自動合併",
      "",
      ...result.blocks.map(
        (block) =>
          `- \`${block.id}\` ${block.reason} ${block.period}。事故、檢控或職安警示的月份不在 src/lib/period.ts 的 CHART_MONTHS 內。`,
      ),
    );
  }
  if (result.errors.length) {
    lines.push("", "## 快照無效", "", ...result.errors.map((error) => `- ${error}`));
  }
  lines.push("", `Snapshot-Digest: ${result.digest}`);
  return lines.join("\n");
}
