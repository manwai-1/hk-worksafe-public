import { useMemo } from "react";
import { STATUS_OPTIONS, TYPE_LABEL, TYPE_OPTIONS } from "../content";
import { RECORDS, hasDatedUpdate } from "../data";
import { MONTH_LABELS, inPeriod, recordPeriod } from "../lib/period";
import type { OshRecord, PatternGroup } from "../types";
import { RecordCard } from "./RecordCard";

export function RegisterSection({
  yearFilter,
  monthFilter,
  typeFilter,
  statusFilter,
  query,
  openedId,
  jumpNonce,
  onYear,
  onMonth,
  onType,
  onStatus,
  onQuery,
  onReset,
}: {
  yearFilter: string;
  monthFilter: string;
  typeFilter: string;
  statusFilter: string;
  query: string;
  openedId: string | null;
  jumpNonce: number;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
  onType: (value: string) => void;
  onStatus: (value: string) => void;
  onQuery: (value: string) => void;
  onReset: () => void;
}) {
  const years = useMemo(() => {
    const found: string[] = [];
    for (const record of RECORDS) {
      const period = recordPeriod(record.datetime);
      if (period && !found.includes(period.year)) found.push(period.year);
    }
    found.sort();
    found.reverse();
    return found;
  }, []);

  const periodRecords = useMemo(
    () => RECORDS.filter((record) => inPeriod(record.datetime, yearFilter, monthFilter)),
    [yearFilter, monthFilter],
  );

  const counts = useMemo(() => {
    const tally: Record<string, number> = {
      all: periodRecords.length,
      incident: 0,
      prosecution: 0,
      alert: 0,
      guidance: 0,
      "ordinance/regulation": 0,
      "code of practice": 0,
    };
    for (const record of periodRecords) tally[record.type] += 1;
    return tally;
  }, [periodRecords]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return periodRecords.filter((record) => {
      if (typeFilter !== "all" && record.type !== typeFilter) return false;
      if (statusFilter === "updated") {
        if (!hasDatedUpdate(record)) return false;
      } else if (statusFilter !== "all" && record.status !== statusFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack = [
        record.datetime,
        record.type,
        record.titleEn,
        record.titleZh,
        record.summaryEn,
        record.summaryZh,
        record.legalEn,
        record.legalZh,
        record.status,
        record.officialSource,
        record.sourceNote,
        ...record.updatesEn.map((line) => `${line.key} ${line.value}`),
        ...record.updatesZh.map((line) => `${line.key} ${line.value}`),
        ...record.sources.map((source) => source.href),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [periodRecords, typeFilter, statusFilter, query]);

  return (
    <section id="register" className="block" aria-labelledby="register-heading">
      <h2 id="register-heading">完整登記冊</h2>
      <p className="caption">
        全部 85 筆官方紀錄，最新者在前，供核對來源與法例編號。各筆摘要及官方中文法例編號，取自已核對的官方中文來源，照錄原文，不作改寫或意譯。日期時間、類型、標題、狀態、官方來源，以及英文法例編號與英文更新行，均按登記冊原文照錄。年份與月份以官方紀錄日期（香港時間）為準，不一定是事故發生日期。只標明月份的職安警示歸入該月。類型數目依所選時期計算。篩選只影響本頁顯示。「已更新」指本冊已加注日期更新行的紀錄；紀錄內的狀態欄仍按原文顯示（目前均為 official）。
      </p>
      <form className="filters" role="search" onSubmit={(event) => event.preventDefault()}>
        <label>
          年份
          <select value={yearFilter} onChange={(event) => onYear(event.target.value)}>
            <option value="all">全部年份</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          月份
          <select value={monthFilter} onChange={(event) => onMonth(event.target.value)}>
            <option value="all">全部月份</option>
            {Object.entries(MONTH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend>類型</legend>
          <div className="segmented" role="group" aria-label="類型">
            {TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={typeFilter === option.value}
                className={typeFilter === option.value ? "is-on" : ""}
                onClick={() => onType(option.value)}
              >
                {option.label}
                <span className="count">{counts[option.value] ?? 0}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <label>
          狀態
          <select value={statusFilter} onChange={(event) => onStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="search-field">
          搜尋標題、摘要、法例編號或來源
          <input
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="例如：沙田、第59章、宏福苑"
          />
        </label>
        <button type="button" className="text-button" onClick={onReset}>
          重設篩選
        </button>
      </form>
      <p className="result-count" aria-live="polite">
        顯示 {visible.length} / {RECORDS.length} 筆紀錄。
      </p>
      {visible.length === 0 ? (
        <p className="empty">本冊沒有紀錄符合目前的年份、月份、類型、狀態或搜尋條件。</p>
      ) : (
        visible.map((record) => (
          <RecordCard
            key={record.id + (openedId === record.id ? `:${jumpNonce}` : "")}
            record={record}
            initiallyOpen={openedId === record.id}
          />
        ))
      )}
    </section>
  );
}

export function PatternSection({
  groups,
  patternKey,
  onPattern,
  onOpen,
}: {
  groups: PatternGroup[];
  patternKey: string;
  onPattern: (key: string) => void;
  onOpen: (id: string) => void;
}) {
  const selected = groups.find((group) => group.key === patternKey) ?? groups[0];
  const groupRecords = selected.ids
    .map((id) => RECORDS.find((record) => record.id === id))
    .filter((record): record is OshRecord => Boolean(record));

  return (
    <section id="patterns" className="block" aria-labelledby="patterns-heading">
      <h2 id="patterns-heading">形態歸類</h2>
      <p className="caption">
        按官方標題與摘要已載明的形態或情境歸類，方便看出重複風險。此為掃描輔助，不加分析、成因判斷或建議。未能明確歸入者列入「其他」。
      </p>
      <div className="segmented" role="group" aria-label="形態">
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            aria-pressed={selected.key === group.key}
            className={selected.key === group.key ? "is-on" : ""}
            onClick={() => onPattern(group.key)}
          >
            {group.label}
            <span className="count">{group.ids.length}</span>
          </button>
        ))}
      </div>
      <p>
        {selected.label}：{groupRecords.length} 筆。
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <caption>
            {selected.label}的紀錄，共 {groupRecords.length} 筆。
          </caption>
          <thead>
            <tr>
              <th scope="col">日期（香港時間）</th>
              <th scope="col">類型</th>
              <th scope="col">官方中文標題</th>
              <th scope="col">紀錄</th>
            </tr>
          </thead>
          <tbody>
            {groupRecords.map((record) => (
              <tr key={record.id}>
                <td>{record.datetime}</td>
                <td>{TYPE_LABEL[record.type]}</td>
                <td>{record.titleZh}</td>
                <td>
                  <button type="button" className="text-button" onClick={() => onOpen(record.id)}>
                    查看
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
