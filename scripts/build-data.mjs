import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(name) {
  return fs.readFileSync(path.join(root, name), "utf8");
}

function parseRecords(markdown) {
  const body = markdown.split(/^## Records\s*$/m)[1];
  if (!body) throw new Error("找不到 ## Records");
  return body
    .split(/^### /m)
    .filter((chunk) => chunk.trim())
    .map((chunk) => {
      const lines = chunk.replace(/\s+$/, "").split("\n");
      const heading = lines[0].trim();
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
      return { heading, fields };
    });
}

function englishUpdates(fields) {
  return Object.entries(fields)
    .filter(([key]) => key.startsWith("Update"))
    .map(([key, value]) => {
      if (key === "Updates") {
        return { key: "Updates", value: value.replace(/^\s*-\s+/gm, "").trim() };
      }
      return { key, value: value.trim() };
    });
}

function chineseUpdates(fields) {
  return Object.entries(fields)
    .filter(([key]) => key.startsWith("Update"))
    .map(([key, value]) => ({ key, value: value.trim() }));
}

function urlsIn(text) {
  return [...text.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0].replace(/[),.;]+$/, ""));
}

const presentation = JSON.parse(read("sources/presentation.json"));
const zhRecords = parseRecords(read("sources/ZH_OFFICIAL_SUMMARIES.md"));
const regRecords = parseRecords(read("sources/REGISTER.md"));

if (zhRecords.length !== 85 || regRecords.length !== 85 || presentation.records.length !== 85) {
  throw new Error(
    `紀錄數目不符：中文 ${zhRecords.length}、登記冊 ${regRecords.length}、presentation ${presentation.records.length}`,
  );
}

const patternOf = new Map();
for (const group of presentation.patternGroups) {
  for (const id of group.ids) {
    if (patternOf.has(id)) throw new Error("形態歸類重複：" + id);
    patternOf.set(id, group.key);
  }
}

const records = presentation.records.map((meta, index) => {
  const zh = zhRecords[index];
  const reg = regRecords[index];
  const title = reg.fields.Title || "";
  const parts = title.split(" / ");
  if (parts.length !== 2) throw new Error("標題無法拆成中英兩段：" + meta.id);
  const [titleEn, titleZh] = parts;
  if (titleEn !== meta.titleEn) throw new Error("英文標題與 presentation 不符：" + meta.id);
  if (titleZh !== zh.fields["Official Chinese title"]) throw new Error("中文標題不符：" + meta.id);
  if ((zh.fields.Type || "").trim() !== (reg.fields.Type || "").trim()) {
    throw new Error("類型不符：" + meta.id);
  }
  const officialSource = (reg.fields["Official source"] || "").trim();
  const hrefs = new Set(meta.sources.map((source) => source.href));
  for (const url of urlsIn(officialSource)) {
    if (!hrefs.has(url)) throw new Error(`官方來源網址未列入連結：${meta.id} ${url}`);
  }
  if (!patternOf.has(meta.id)) throw new Error("未有形態歸類：" + meta.id);
  const summaryZh = zh.fields["Official Chinese summary"];
  const legalZh = zh.fields["Legal reference (official Chinese)"];
  const legalEn = reg.fields["Legal reference"];
  if (!summaryZh || !legalZh || !legalEn) throw new Error("缺少摘要或法例編號：" + meta.id);
  return {
    id: meta.id,
    datetime: reg.heading,
    type: reg.fields.Type.trim(),
    titleEn,
    titleZh,
    summaryEn: (reg.fields.Summary || "").trim(),
    summaryZh,
    legalEn,
    legalZh,
    sourceNote: zh.fields["Source note"] || "",
    status: (reg.fields.Status || "").trim(),
    officialSource,
    updatesEn: englishUpdates(reg.fields),
    updatesZh: chineseUpdates(zh.fields),
    sources: meta.sources,
    patternKey: patternOf.get(meta.id),
  };
});

const typeCounts = {};
for (const record of records) typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
const expectedTypes = {
  incident: 23,
  prosecution: 31,
  alert: 25,
  guidance: 3,
  "ordinance/regulation": 2,
  "code of practice": 1,
};
for (const [type, count] of Object.entries(expectedTypes)) {
  if (typeCounts[type] !== count) throw new Error(`類型數目不符：${type} ${typeCounts[type]}`);
}
const noteCount = records.filter((record) => record.sourceNote).length;
if (noteCount !== 39) throw new Error("來源說明數目不符：" + noteCount);
if (patternOf.size !== 85) throw new Error("形態歸類未覆蓋全部紀錄：" + patternOf.size);

const output = {
  records,
  patternGroups: presentation.patternGroups,
  followThreads: presentation.followThreads,
  noParticulars: presentation.noParticulars,
};

const outPath = path.join(root, "src/data/register.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(`寫入 ${records.length} 筆紀錄至 src/data/register.json`);
