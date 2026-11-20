import register from "./data/register.json";
import type { OshRecord, RegisterData } from "./types";

export const data = register as RegisterData;
export const RECORDS: OshRecord[] = data.records;

export const BY_ID: Record<string, OshRecord> = Object.fromEntries(RECORDS.map((record) => [record.id, record]));

export function hasDatedUpdate(record: OshRecord): boolean {
  return record.updatesEn.length > 0 || record.status === "updated" || record.updatesZh.length > 0;
}

export function scrollToId(id: string) {
  const element = document.getElementById(id);
  if (!element) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
