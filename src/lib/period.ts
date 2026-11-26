const MONTH_FROM_NAME: Record<string, string> = {
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

export const MONTH_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "01", label: "1" },
  { value: "02", label: "2" },
  { value: "03", label: "3" },
  { value: "04", label: "4" },
  { value: "05", label: "5" },
  { value: "06", label: "6" },
  { value: "07", label: "7" },
  { value: "08", label: "8" },
  { value: "09", label: "9" },
  { value: "10", label: "10" },
  { value: "11", label: "11" },
  { value: "12", label: "12" },
];

export const CHART_MONTHS = [
  "2025-11",
  "2025-12",
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
] as const;

export function recordPeriod(datetime: string): { year: string; month: string } | null {
  const iso = datetime.match(/^(\d{4})-(\d{2})/);
  if (iso) return { year: iso[1], month: iso[2] };
  const named = datetime.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (named) {
    const month = MONTH_FROM_NAME[named[1].toLowerCase()];
    if (month) return { year: named[2], month };
  }
  return null;
}

export function inPeriod(datetime: string, yearFilter: string, monthFilter: string): boolean {
  if (yearFilter === "all" && monthFilter === "all") return true;
  const period = recordPeriod(datetime);
  if (!period) return false;
  if (yearFilter !== "all" && period.year !== yearFilter) return false;
  if (monthFilter !== "all" && period.month !== monthFilter) return false;
  return true;
}

export function dateLabel(datetime: string): string {
  const iso = datetime.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}年${Number(iso[2])}月${Number(iso[3])}日`;
  const named = datetime.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (named) {
    const month = MONTH_FROM_NAME[named[1].toLowerCase()];
    return named[2] + "年" + (month ? Number(month) + "月" : named[1]);
  }
  return datetime;
}

export function monthAxisLabel(key: string): string {
  const [year, month] = key.split("-");
  return `${year}年${Number(month)}月`;
}

export function dateFragments(value: string): { kind: "token" | "note"; text: string }[] {
  return value
    .split(/(（[^）]*）)/)
    .filter((text) => text.length > 0)
    .map((text) => ({ kind: text.startsWith("（") && text.endsWith("）") ? "note" : "token", text }));
}

export function dateShort(datetime: string): string {
  const named = datetime.match(
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(20\d{2})/i,
  );
  if (named) {
    const month = MONTH_FROM_NAME[named[1].toLowerCase()];
    return named[2] + "年" + (month ? Number(month) + "月" : named[1]) + "（僅註明月份）";
  }
  const announced = datetime.match(
    /^(\d{4}-\d{2}-\d{2})\s*\(announced\);\s*enhancement effective\s*(\d{4}-\d{2}-\d{2})/i,
  );
  if (announced) {
    return announced[1] + "（公布）；" + announced[2] + " 起生效（時間未註明）";
  }
  const iso = datetime.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!iso) return datetime;
  if (/Gazette date/i.test(datetime)) return iso[1] + "（憲報日期）";
  const clock = datetime.match(/^\d{4}-\d{2}-\d{2},\s*(\d{1,2}:\d{2})\s*HKT/i);
  if (clock) return iso[1] + " " + clock[1];
  if (/\bmorning\b/i.test(datetime)) return iso[1] + " 上午";
  if (/\bafternoon\b/i.test(datetime)) return iso[1] + " 下午";
  if (/time of day not stated/i.test(datetime)) return iso[1] + "（時間未註明）";
  return iso[1];
}
