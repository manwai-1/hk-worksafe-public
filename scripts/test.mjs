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

const periodSource = read("src/lib/period.ts");
const chartsSource = read("src/components/Charts.tsx");
const registerSource = read("src/components/RegisterLayer.tsx");
const appSource = read("src/App.tsx");
const followSource = read("src/components/FollowLayer.tsx");

function quotedList(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start < 0) {
    fail("找不到 " + name);
    return [];
  }
  const slice = source.slice(start, source.indexOf("] as const", start));
  return [...slice.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

const chartMonths = quotedList(periodSource, "CHART_MONTHS");
if (chartMonths.join(",") !== MONTHS.join(",")) fail("趨勢圖月份不是由早到晚：" + chartMonths.join(","));
if (chartsSource.includes(".reverse(") || chartsSource.includes("TABLE_MONTHS")) fail("趨勢圖反轉了月份陣列");
if (!chartsSource.includes("CHART_MONTHS.map")) fail("趨勢圖未按時間順序繪製");
const categoryOrder = [...chartsSource.matchAll(/\.sort\(\(a, b\) => b\.value - a\.value\)/g)];
if (categoryOrder.length !== 1) fail("類別圖未按筆數由大至小排列");

const filterBlock = periodSource.slice(
  periodSource.indexOf("export const MONTH_FILTER_OPTIONS"),
  periodSource.indexOf("export const CHART_MONTHS"),
);
const filterValues = [...filterBlock.matchAll(/value: "(\d{2})"/g)].map((match) => match[1]);
const filterLabels = [...filterBlock.matchAll(/label: "(\d+)"/g)].map((match) => match[1]);
const expectedValues = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
const expectedLabels = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
if (filterValues.join(",") !== expectedValues.join(",")) fail("月份選單值不是 01 至 12：" + filterValues.join(","));
if (filterLabels.join(",") !== expectedLabels.join(",")) fail("月份選單標籤不是 1 至 12：" + filterLabels.join(","));
if (registerSource.includes("Object.entries") || registerSource.includes("Object.keys") || registerSource.includes("MONTH_LABELS")) {
  fail("月份選單仍依物件鍵列舉");
}
if (!registerSource.includes("MONTH_FILTER_OPTIONS.map") || !registerSource.includes(">全部月份<")) {
  fail("月份選單未以全部月份開頭並使用固定清單");
}
if (!read("src/content.ts").includes("資料截止：2026-11-20 08:59 香港時間 · 收錄 85 筆") || !appSource.includes("HEADER_LINE")) {
  fail("頁首截止列缺失");
}
if (!appSource.includes(">說明<") || !appSource.includes("免責說明")) fail("說明或免責說明缺失");
if (!appSource.includes("關注與跟進") || !appSource.includes("按類別查看") || !appSource.includes("完整登記冊")) fail("層級分頁缺失");
if (appSource.includes("形態歸類") || followSource.includes("形態歸類")) fail("仍使用舊層級名稱");
if (!followSource.includes("近期關注") || !followSource.includes("其後發展") || !followSource.includes("致命意外")) fail("關注層分段缺失");
if (!followSource.includes("已有安全提示") || !followSource.includes("尚無職安警示")) fail("關注標示缺失");
if (!registerSource.includes("顯示英文原文") || !registerSource.includes("const PAGE_SIZE = 15")) {
  fail("登記冊英文開關或分頁缺失");
}
if (!registerSource.includes('aria-expanded={open}')) fail("詳情開關缺少 aria-expanded");
if (!registerSource.includes('open ? "收起詳情" : "查看詳情 ›"')) fail("詳情開關未同時標明收起與查看");
if (registerSource.includes("查看詳情 ›") && !registerSource.includes("收起詳情")) fail("展開後仍只標查看詳情");
if (!followSource.includes("搜尋近期關注的標題或地點") || !followSource.includes("搜尋跟進發展的標題或地點")) {
  fail("近期與跟進搜尋標籤未分開");
}
if (followSource.includes("關鍵字搜尋")) fail("仍使用相同的關鍵字搜尋標籤");
if (!followSource.includes('placeholder="地區、工程類型或事件描述"')) fail("近期或跟進的提示文字被改掉");
if (!registerSource.includes("搜尋標題、摘要、法例編號或來源") || !registerSource.includes('placeholder="例如：沙田、第59章、宏福苑"')) {
  fail("完整登記冊搜尋標籤或提示文字被改掉");
}
const chartsSourceForCue = read("src/components/Charts.tsx");
if (!chartsSourceForCue.includes("左右滑動查看其他月份") || !chartsSourceForCue.includes('aria-labelledby="month-chart-heading"')) {
  fail("按月分布缺少滑動提示或無障礙名稱");
}
if (appSource.includes("CALLOUT")) fail("未使用的 CALLOUT 被渲染");
for (const heading of ["資料截止", "本冊數目", "各層範圍", "收錄經過", "職安警示與安全提示", "法例、規例、工作守則及指引", "職業安全健康局", "香港法例與政府憲報", "紀錄編列", "來源網址"]) {
  if (!appSource.includes(heading)) fail("免責說明缺少分組標題：" + heading);
}
if (!appSource.includes("SCOPE_PARAGRAPHS.map") || !appSource.includes("RECORD_RULE") || !appSource.includes("LAYER_NOTE") || !appSource.includes("CHART_CAPTION") || !appSource.includes("{CUTOFF}")) {
  fail("免責說明原文沒有整段保留");
}
const css = read("src/styles.css");
const widths = [...css.matchAll(/max-width:\s*(\d+)px/g)].map((match) => match[1]);
if (widths.join(",") !== "860") fail("斷點不是既有的 860：" + widths.join(","));
if (/position:\s*fixed/.test(css)) fail("回到頂部仍用固定定位，或新增了固定定位");
if (!css.includes(".to-top-slot") || !css.includes("min-height: 44px")) fail("回到頂部或窄屏按鈕尺寸缺失");

function recordsInMonth(month) {
  return data.records.filter((record) => periodOf(record.datetime).endsWith("-" + month));
}
const march = recordsInMonth("03");
const november = recordsInMonth("11");
const october = recordsInMonth("10");
if (march.length === 0 || november.length === 0 || october.length === 0) fail("月份篩選樣本為空");
if (march.some((record) => !periodOf(record.datetime).endsWith("-03"))) fail("三月篩選夾入其他月份");
if (!november.some((record) => periodOf(record.datetime).startsWith("2025-")) || !november.some((record) => periodOf(record.datetime).startsWith("2026-"))) {
  fail("十一月篩選未同時包含 2025 與 2026");
}
if (november.some((record) => periodOf(record.datetime).endsWith("-10"))) fail("十一月篩選夾入十月");
if (march.length + november.length + october.length !== new Set([...march, ...november, ...october].map((record) => record.id)).size) {
  fail("月份篩選樣本互相重疊");
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

const ui = [
  "src/App.tsx",
  "src/content.ts",
  "src/components/Charts.tsx",
  "src/components/FollowLayer.tsx",
  "src/components/PatternLayer.tsx",
  "src/components/RegisterLayer.tsx",
  "src/lib/period.ts",
].map((name) => read(name)).join("\n");
const joined = JSON.stringify(data) + ui;
if (joined.includes("檨控") || joined.includes("此策") || ui.includes("已關連警示") || ui.includes("無相關警示") || ui.includes("條例／規則") || ui.includes("全部 official")) {
  fail("出現禁用字句");
}
for (const phrase of ["此冊不是政府刊物", "來源說明", "Legal reference（英文原文）", "（英文原文）", "已有安全提示（並非職安警示）", "不是政府官方統計", "2026-11-20 08:59 香港時間"]) {
  if (!joined.includes(phrase)) fail("缺少字句：" + phrase);
}
const { dateShort, dateFragments } = await import("../src/lib/period.ts");
const { linkSegments } = await import("../src/lib/links.ts");
const shortCases = [
  ["September 2026 (month only, as stated on the official alert)", "2026年9月（僅註明月份）"],
  ["2026-11-05, morning (HKT)", "2026-11-05 上午"],
  ["2026-10-07, afternoon (HKT)", "2026-10-07 下午"],
  ["2026-11-11 (HKT; time of day not stated)", "2026-11-11（時間未註明）"],
  ["2026-07-31, 09:00 HKT (issued time stated on the press release)", "2026-07-31 09:00"],
  ["2026-05-22 (HKT; Gazette date as stated on later official pages; no same-day Government press release was found)", "2026-05-22（憲報日期）"],
  ["2026-08-27 (announced); enhancement effective 2026-08-28 (HKT; time of day not stated)", "2026-08-27（公布）；2026-08-28 起生效（時間未註明）"],
];
for (const [input, expected] of shortCases) {
  if (dateShort(input) !== expected) fail(`短日期 ${input} => ${dateShort(input)}，應為 ${expected}`);
  const parts = dateFragments(expected);
  if (parts.map((part) => part.text).join("") !== expected) fail("日期拆段改變了展示字：" + expected);
}
for (const record of data.records) {
  const short = dateShort(record.datetime);
  const parts = dateFragments(short);
  if (parts.map((part) => part.text).join("") !== short) fail("日期拆段改變了紀錄：" + record.id);
}
const undated = dateFragments("2026-11-11（時間未註明）");
if (undated[0]?.text !== "2026-11-11" || undated[0]?.kind !== "token" || undated[1]?.text !== "（時間未註明）") {
  fail("時間未註明的日期token被拆散");
}
const morning = dateFragments("2026-11-05 上午");
if (morning.length !== 1 || morning[0].text !== "2026-11-05 上午" || morning[0].kind !== "token") fail("上午日期被拆開");
function hrefsIn(text) {
  return linkSegments(text).filter((segment) => segment.kind === "link").map((segment) => segment.href);
}
const wrapped = "見（https://example.com/a.htm）。下一句不應被吃掉";
const wrappedHrefs = hrefsIn(wrapped);
if (wrappedHrefs.length !== 1 || wrappedHrefs[0] !== "https://example.com/a.htm") fail("全形括號後的句子被併入網址：" + wrappedHrefs.join("|"));
if (linkSegments(wrapped).map((segment) => segment.kind === "link" ? segment.href : segment.text).join("") !== wrapped) {
  fail("連結拆段改變了原文");
}
const shatinRecord = data.records.find((record) => record.id === "2026-11-05-shatin");
const tungchungRecord = data.records.find((record) => record.id === "2026-10-07-tungchung");
const shatinHrefs = hrefsIn(shatinRecord.updatesZh.map((line) => line.value).join("\n"));
const tungchungHrefs = hrefsIn(tungchungRecord.updatesZh.map((line) => line.value).join("\n"));
if (!shatinHrefs.includes("https://www.labour.gov.hk/tc/news/work_safety_alert_2026.htm")) fail("沙田中文更新沒有正確職安警示連結");
if (!tungchungHrefs.includes("https://www.labour.gov.hk/tc/public/safety_hints_20261007.htm")) fail("東涌中文更新沒有正確安全提示連結");
for (const href of [...shatinHrefs, ...tungchungHrefs]) {
  if (/[（）]/.test(href) || /[\u4e00-\u9fff]/.test(href)) fail("更新連結吞了中文：" + href);
}
const intentional404 = "https://www.labour.gov.hk/eng/public/safety_hints_20261105.htm";
if (!shatinHrefs.includes(intentional404)) fail("沙田未能開啟的英文網址被改掉");
if (!JSON.stringify(shatinRecord).includes(intentional404)) fail("沙田原文不再引用未能開啟的英文網址");
const dotted = hrefsIn("見 https://example.com/a.htm。");
if (dotted.length !== 1 || dotted[0] !== "https://example.com/a.htm") fail("句號沒有從網址尾端裁掉");
if (!read("src/styles.css").includes("--muted: #637289;")) fail("muted 未改為 #637289");
if (!read("src/styles.css").includes("--accent: #3b82f6;")) fail("accent 被改掉");
if (!read("src/styles.css").includes("background: var(--accent-deep);")) fail("選中填色未改用 accent-deep");
if (!read("vite.config.ts").includes('base: "/hk-worksafe-public/"')) fail("Pages base path 不正確");
const workflow = read(".github/workflows/pages.yml");
if (!workflow.includes("actions/deploy-pages") || !workflow.includes("actions/upload-pages-artifact")) fail("Pages workflow 不完整");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("核對通過：85 筆、來源說明 39 則、類型與形態數目、月份合計、三筆更新、免責聲明與 base path。");
console.log(JSON.stringify(monthCounts));
