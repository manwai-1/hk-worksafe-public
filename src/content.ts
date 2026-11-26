import type { RecStatus, RecType } from "./types";

export const TYPE_LABEL: Record<RecType, string> = {
  incident: "意外",
  prosecution: "檢控",
  alert: "職安警示",
  "ordinance/regulation": "法例／規例",
  "code of practice": "工作守則",
  guidance: "指引",
};

export const STATUS_LABEL: Record<RecStatus, string> = {
  official: "官方",
  reported: "報道",
  updated: "已更新",
};

export const TYPE_OPTIONS: { value: "all" | RecType; label: string }[] = [
  { value: "all", label: "全部類型" },
  { value: "incident", label: "意外" },
  { value: "prosecution", label: "檢控" },
  { value: "alert", label: "職安警示" },
  { value: "guidance", label: "指引" },
  { value: "ordinance/regulation", label: "法例／規例" },
  { value: "code of practice", label: "工作守則" },
];

export const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "全部狀態" },
  { value: "official", label: "官方" },
  { value: "reported", label: "報道" },
  { value: "updated", label: "已更新" },
];

export const THREAD_STATUS_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "no-alert", label: "尚無職安警示" },
  { value: "safety-hint", label: "已有安全提示（並非職安警示）" },
  { value: "paired", label: "已有對照跟進" },
  { value: "file", label: "原文已註明其後檢控" },
];

export const HEADER_LINE = "資料截止：2026-11-20 08:59 香港時間 · 收錄 85 筆";

export const TYPE_NOTE =
  "類型標籤為：意外、檢控、職安警示、指引、法例／規例、工作守則。本冊所載上述紀錄狀態均為官方。數字為本資料匯編所載紀錄的數目，不是政府官方統計。";

export const LAYER_NOTE =
  "關注與跟進一層只陳述本冊已載事實，不是法律意見，亦不構成須採取的行動。完整登記冊供核對來源與法例編號，不是法律意見。「近期關注」僅列登記冊原文或其註有日期的更新行已載明：官方職安警示索引尚未見對應職安警示的個案，不根據推測增列。「其後發展」按時間順序對照同一事故其後出現的職安警示或檢控：當本冊一則意外、其後一則職安警示及／或其後一則檢控，所述情況明顯相同時，在此列為同一線索。依紀錄所述事實對照，來源並無案件編號。職安警示通常只列月份。未有足夠共同事實的紀錄（包括僅稱正在調查、未列進一步詳情的公報）不會在此對照。「致命意外」列本冊全部意外類紀錄，最新者在前；標示只反映本冊已載事實。「按類別查看」按官方標題與摘要已載明的形態或情境歸類，方便看出重複風險；此為掃描輔助，不加分析、成因判斷或建議。未能明確歸入者列入「其他」。";

export const RECORD_RULE =
  "紀錄按官方來源編列，並非勞工處或香港特區政府刊物。日期以香港時間（HKT）為準。紀錄不會被覆蓋；如有後續資料，只會加注日期的更新行。各筆摘要取自已核對的官方中文來源，照錄原文，不作改寫或意譯。";

export const CUTOFF =
  "資料截止：2026-11-20 08:59 香港時間（最近一次例行掃描；加入 0 筆，既有紀錄改動 0 筆，移除 0 筆，尚待覆核）。涵蓋範圍：2025年11月19日至2026年11月20日。";

export const CALLOUT = `${CUTOFF} 本冊共 85 筆官方紀錄，狀態均為 official（官方）：意外 23、檢控 31、職安警示 25、指引 3、法例／規例 2、工作守則 1。此冊是資料匯編。此冊不是政府刊物，亦不是法律意見。紀錄按官方來源編列，並非勞工處或香港特區政府刊物。日期以香港時間（HKT）為準。紀錄不會被覆蓋；如有後續資料，只會加注日期的更新行。各筆摘要取自已核對的官方中文來源，照錄原文，不作改寫或意譯。`;

export const CHART_CAPTION =
  "以下為本資料匯編所載紀錄的數目，不是政府官方統計。月份按本冊紀錄日期（香港時間）歸入；只標明月份的職安警示歸入該月。";

export const PAIRING_NOTE = "依紀錄所述事實對照，來源並無案件編號。";

export const INDEX_SOURCES: { title: string; href: string }[] = [
  { title: "2026年職安警示索引（中文）", href: "https://www.labour.gov.hk/tc/news/work_safety_alert_2026.htm" },
  { title: "Work Safety Alert 2026（English）", href: "https://www.labour.gov.hk/eng/news/work_safety_alert_2026.htm" },
  { title: "2025年職安警示索引（中文）", href: "https://www.labour.gov.hk/tc/news/work_safety_alert_2025.htm" },
  { title: "Work Safety Alert 2025（English）", href: "https://www.labour.gov.hk/eng/news/work_safety_alert_2025.htm" },
  { title: "Labour Department Highlights", href: "https://www.labour.gov.hk/eng/news/highlights.php" },
  { title: "建築地盤禁煙（中文）", href: "https://www.labour.gov.hk/tc/news/smoking_ban.htm" },
  { title: "Construction-site smoking ban（English）", href: "https://www.labour.gov.hk/eng/news/smoking_ban.htm" },
  { title: "工作守則（中文）", href: "https://www.labour.gov.hk/tc/public/content2_8b.htm" },
  { title: "Codes of Practice（English）", href: "https://www.labour.gov.hk/eng/public/content2_8b.htm" },
  { title: "移動式升降工作平台指引（中文）", href: "https://www.labour.gov.hk/tc/public/od/GN_MEWP.htm" },
  { title: "Guidance Notes on MEWPs（English）", href: "https://www.labour.gov.hk/eng/public/od/GN_MEWP.htm" },
  { title: "建築地盤禁煙安全提示（中文）", href: "https://www.labour.gov.hk/tc/public/od/safety_hints_smoking_ban.htm" },
  { title: "Safety hints on the smoking ban（English）", href: "https://www.labour.gov.hk/eng/public/od/safety_hints_smoking_ban.htm" },
  { title: "Prevention of heat stroke at work", href: "https://www.labour.gov.hk/eng/news/prevention_of_heat_stroke_at_work.htm" },
  { title: "香港政府憲報", href: "https://egazette.gld.gov.hk/en" },
  { title: "電子版香港法例", href: "https://www.elegislation.gov.hk" },
];

export const SCOPE_PARAGRAPHS = [
  "此為持續更新的登記冊。初次按官方來源掃描時，記入 17 筆日期介乎 2026 年 8 月 21 日至 2026 年 11 月 19 日的官方紀錄；該等紀錄其後未有改寫。其後一次按官方來源補錄，加入日期介乎 2025 年 11 月 19 日至 2026 年 8 月 20 日（首尾兩日包括在內）的官方紀錄。初次掃描（90 日窗口，2026 年 8 月 21 日至 11 月 19 日）截止於 2026-11-19 16:51 香港時間。補錄（2025 年 11 月 19 日至 2026 年 8 月 20 日）截止於 2026-11-19 17:20 香港時間。最近一次例行掃描截止於 2026-11-20 08:59 香港時間。",
  "勞工處職安警示（Work Safety Alerts）：官方 2026 年索引列有 18 則日期為 2026 年 1 月至 9 月的警示。2026 年 8 月及 9 月的警示已在初次掃描時記入。補錄記入日期為 2026 年 1 月至 7 月的 16 則警示。亦已打開官方 2025 年索引：已記入日期為 2025 年 12 月的警示，以及 4 則日期為 2025 年 11 月的警示。該等 2025 年 11 月警示只標明月份，因此單憑警示本身，無法確認每宗事故是否發生於 2025 年 11 月 19 日或之後。未有記入 2025 年 10 月或更早的 2025 年警示。於 2026 年 11 月 19 日最後查核時，2026 年索引並未刊出 2026 年 10 月或 11 月的職安警示。至 2026-11-20 08:59 香港時間，官方 2026 年職安警示（職安警示）索引仍止於 2026 年 9 月，尚無 10 月或 11 月警示。東涌 2026-10-07 致命事故有勞工處「安全提示」，並非職安警示。請勿將安全提示與職安警示混為一談。",
  "補錄記入的法例、規例、工作守則及官方指引，原文如下：Ordinance, regulation, code of practice, and official guidance entered in the backfill include: Addendum No. 1/2026 (第 1/2026 號增編) to the Code of Practice for Bamboo Scaffolding Safety (《竹棚架工作安全守則》) and the Code of Practice for Metal Scaffolding Safety (《金屬棚架工作安全守則》), gazetted and effective on 31 July 2026; the Construction Sites (Safety) (Amendment) Regulation 2026 (《2026年建築地盤（安全）（修訂）規例》) and related smoking-ban instruments, stated as taking effect on 17 July 2026, with the Smoking (Public Health) Ordinance (Amendment of Schedule 2) Order 2026 (《2026年吸煙（公眾衞生）條例（修訂附表2）令》) and the Fixed Penalty (Smoking Offences) (Specification of Authorities and Public Officers) (Amendment) Notice 2026 (《2026年定額罰款（吸煙罪行）（指明主管當局及公職人員）（修訂）公告》) published in the Gazette on 22 May 2026; the revised Guidance Notes on Safe Use of Mobile Elevating Work Platforms (《安全使用移動式升降工作平台指引》修訂版), launched on 4 February 2026, with a stated grace period until 31 December 2026; and the Guidance Notes on Prevention of Carbon Monoxide Poisoning in Workplaces (《預防工作場所一氧化碳中毒指引》), launched on 17 December 2025. No additional ordinance, regulation, or code of practice was found in readable official Labour Department or Government Information Services material as having been created, amended, commenced, or gazetted inside the later 90-day scan window.",
  "職業安全健康局新聞稿列表：所列 2026 年項目只有一則，日期為 2026 年 1 月 9 日，並非意外、警示或官方指引。職安局 “What’s New” 頁面所列為活動、獎項及名錄；概無記入本冊。",
  "香港法例（Hong Kong e-Legislation）有關 Cap. 59、Cap. 509 及相關附屬法例的條文頁面，查閱時只返回 JavaScript 用戶端設定閘門；該網站上的現行文本、憲報法律公告編號及修訂時間表未能讀取。政府憲報網站的 PDF 檢視器，部分公告須通過 captcha。因此，法例方面的記述，乃依據已成功打開的勞工處及政府新聞處官方網頁。",
];
