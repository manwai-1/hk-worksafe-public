import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

function chunksOf(markdown) {
  const body = markdown.split(/^## Records\s*$/m)[1];
  return body.split(/^### /m).filter((chunk) => chunk.trim());
}

const data = JSON.parse(read("src/data/register.json"));
const zhChunks = chunksOf(read("sources/ZH_OFFICIAL_SUMMARIES.md"));
const regChunks = chunksOf(read("sources/REGISTER.md"));
const failures = [];
const fail = (message) => failures.push(message);

if (data.records.length !== 85) fail("紀錄不是 85 筆");
if (zhChunks.length !== 85 || regChunks.length !== 85) fail("來源分段不是 85");

const expectedTypes = {
  incident: 23,
  prosecution: 31,
  alert: 25,
  guidance: 3,
  "ordinance/regulation": 2,
  "code of practice": 1,
};
const typeCounts = {};
let notes = 0;
const ids = new Set();
for (let index = 0; index < data.records.length; index += 1) {
  const record = data.records[index];
  if (ids.has(record.id)) fail("重複 id " + record.id);
  ids.add(record.id);
  typeCounts[record.type] = (typeCounts[record.type] || 0) + 1;
  const zh = zhChunks[index];
  const reg = regChunks[index];
  if (!zh.includes(record.summaryZh)) fail("中文摘要不在對應段落：" + record.id);
  if (!zh.includes(record.legalZh)) fail("中文法例編號不在對應段落：" + record.id);
  if (!zh.includes(record.titleZh)) fail("中文標題不在對應段落：" + record.id);
  if (record.sourceNote) {
    notes += 1;
    if (!zh.includes(record.sourceNote)) fail("來源說明不在對應段落：" + record.id);
  }
  for (const line of record.updatesZh) {
    if (!zh.includes(line.key) || !zh.includes(line.value)) fail("中文更新不在對應段落：" + record.id);
  }
  if (!reg.startsWith(record.datetime)) fail("日期不是登記冊標題：" + record.id);
  if (!reg.includes(record.titleEn) || !reg.includes(record.titleZh)) fail("標題不在登記冊：" + record.id);
  if (!reg.includes(record.summaryEn)) fail("英文摘要不在登記冊：" + record.id);
  if (!reg.includes(record.legalEn)) fail("英文法例編號不在登記冊：" + record.id);
  if (!reg.includes(record.officialSource)) fail("官方來源不在登記冊：" + record.id);
  for (const line of record.updatesEn) {
    if (!reg.includes(line.value)) fail("英文更新不在登記冊：" + record.id);
  }
  for (const source of record.sources) {
    if (!reg.includes(source.href) && !zh.includes(source.href)) fail("來源網址未見於原文：" + record.id + " " + source.href);
  }
}

for (const [type, count] of Object.entries(expectedTypes)) {
  if (typeCounts[type] !== count) fail(`類型 ${type} 是 ${typeCounts[type]}，應為 ${count}`);
}
if (notes !== 39) fail("來源說明是 " + notes + " 則，應為 39");

const expectedPatterns = {
  "高處墮下／棚架": 28,
  "起重或機械": 20,
  "車輛或倒車": 5,
  "觸電": 3,
  "物體倒塌或擊中": 14,
  "火災": 2,
  "其他": 13,
};
const grouped = new Set();
for (const group of data.patternGroups) {
  if (group.ids.length !== expectedPatterns[group.label]) {
    fail(`${group.label} 是 ${group.ids.length}，應為 ${expectedPatterns[group.label]}`);
  }
  for (const id of group.ids) {
    if (grouped.has(id)) fail("形態重複 " + id);
    grouped.add(id);
    if (!ids.has(id)) fail("形態有未知紀錄 " + id);
  }
}
if (grouped.size !== 85) fail("形態未覆蓋 85 筆");

const MONTHS = ["2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10", "2026-11"];
const monthName = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};
function periodOf(datetime) {
  const iso = datetime.match(/^(\d{4})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}`;
  const named = datetime.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i);
  if (!named) return null;
  return `${named[2]}-${monthName[named[1].toLowerCase()]}`;
}
const monthCounts = Object.fromEntries(MONTHS.map((key) => [key, { incident: 0, prosecution: 0, alert: 0 }]));
for (const record of data.records) {
  if (!monthCounts[periodOf(record.datetime)] && ["incident", "prosecution", "alert"].includes(record.type)) {
    fail("圖表月份無法歸入：" + record.id + " " + record.datetime);
  }
  if (!["incident", "prosecution", "alert"].includes(record.type)) continue;
  const key = periodOf(record.datetime);
  if (!monthCounts[key]) fail("圖表缺少月份 " + key);
  else monthCounts[key][record.type] += 1;
}
const sums = { incident: 0, prosecution: 0, alert: 0 };
for (const key of MONTHS) {
  sums.incident += monthCounts[key].incident;
  sums.prosecution += monthCounts[key].prosecution;
  sums.alert += monthCounts[key].alert;
}
if (sums.incident !== 23 || sums.prosecution !== 31 || sums.alert !== 25) fail("月份合計與類型數目不符 " + JSON.stringify(sums));
if (monthCounts["2026-11"].incident !== 1 || monthCounts["2026-11"].prosecution !== 3 || monthCounts["2026-11"].alert !== 0) {
  fail("2026-11 月份筆數不符 " + JSON.stringify(monthCounts["2026-11"]));
}
if (monthCounts["2026-10"].incident !== 1 || monthCounts["2026-10"].prosecution !== 3 || monthCounts["2026-10"].alert !== 0) {
  fail("2026-10 月份筆數不符 " + JSON.stringify(monthCounts["2026-10"]));
}
if (monthCounts["2026-09"].incident !== 1 || monthCounts["2026-09"].prosecution !== 5 || monthCounts["2026-09"].alert !== 1) {
  fail("2026-09 月份筆數不符 " + JSON.stringify(monthCounts["2026-09"]));
}

const shatin = data.records.find((record) => record.id === "2026-11-05-shatin");
const tungchung = data.records.find((record) => record.id === "2026-10-07-tungchung");
const wangfuk = data.records.find((record) => record.id === "2025-11-26-highly-concerned-about-no-5-alarm-fire-at-wang-f");
if (!shatin?.updatesZh[0]?.value.includes("並未列出2026年10月或11月的職安警示")) fail("沙田中文更新缺句");
if (!tungchung?.updatesZh[0]?.value.includes("此為安全提示，並非職安警示")) fail("東涌中文更新缺句");
if (tungchung?.status !== "official") fail("東涌紀錄狀態應仍為 official");
if (!wangfuk?.updatesZh[0]?.value.includes("巡查了467個建築地盤")) fail("宏福苑中文更新缺句");
if (!shatin.updatesEn.length || !tungchung.updatesEn.length || !wangfuk.updatesEn.length) fail("三筆英文更新缺失");
const named = data.records.find((record) => record.id === "2026-09-09-wangfuk");
if (named?.sourceNote !== "官方中文公報未點名被告人，亦未報道判決。") fail("宏福苑檢控來源說明不符");

const joined = JSON.stringify(data) + read("src/App.tsx") + read("src/content.ts") + read("src/components/FollowUp.tsx") + read("src/components/RecordCard.tsx") + read("src/components/Charts.tsx");
if (joined.includes("檨控") || joined.includes("此策")) fail("出現錯字");
for (const phrase of ["此冊不是政府刊物", "來源說明", "Legal reference（英文原文）", "（英文原文）", "已有安全提示（並非職安警示）", "不是政府官方統計", "2026年11月20日 08:59（香港時間）"]) {
  if (!joined.includes(phrase)) fail("缺少字句：" + phrase);
}
if (!read("vite.config.ts").includes('base: "/hk-worksafe-public/"')) fail("Pages base path 不正確");
const workflow = read(".github/workflows/pages.yml");
if (!workflow.includes("actions/deploy-pages") || !workflow.includes("actions/upload-pages-artifact")) fail("Pages workflow 不完整");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("核對通過：85 筆、來源說明 39 則、類型與形態數目、月份合計、三筆更新、免責聲明與 base path。");
console.log(JSON.stringify(monthCounts));
