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

export const MONTH_LABELS: Record<string, string> = {
  "01": "一月",
  "02": "二月",
  "03": "三月",
  "04": "四月",
  "05": "五月",
  "06": "六月",
  "07": "七月",
  "08": "八月",
  "09": "九月",
  "10": "十月",
  "11": "十一月",
  "12": "十二月",
};

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
