import { STATUS_LABEL, STATUS_OPTIONS, TYPE_LABEL, TYPE_OPTIONS } from "../content";
import { RECORDS, hasDatedUpdate } from "../data";
import { MONTH_FILTER_OPTIONS, dateShort, inPeriod, recordPeriod } from "../lib/period";
import { LinkText } from "../lib/text";
import type { OshRecord } from "../types";

const PAGE_SIZE = 15;

export function RegisterLayer({
  yearFilter,
  monthFilter,
  typeFilter,
  statusFilter,
  query,
  showEnglish,
  page,
  openedId,
  onYear,
  onMonth,
  onType,
  onStatus,
  onQuery,
  onEnglish,
  onPage,
  onToggle,
  onReset,
}: {
  yearFilter: string;
  monthFilter: string;
  typeFilter: string;
  statusFilter: string;
  query: string;
  showEnglish: boolean;
  page: number;
  openedId: string | null;
  onYear: (value: string) => void;
  onMonth: (value: string) => void;
  onType: (value: string) => void;
  onStatus: (value: string) => void;
  onQuery: (value: string) => void;
  onEnglish: (value: boolean) => void;
  onPage: (value: number) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
}) {
  const years = [...new Set(RECORDS.map((record) => recordPeriod(record.datetime)?.year).filter((year): year is string => Boolean(year)))].sort().reverse();
  const periodRecords = RECORDS.filter((record) => inPeriod(record.datetime, yearFilter, monthFilter));
  const counts: Record<string, number> = { all: periodRecords.length };
  for (const option of TYPE_OPTIONS) if (option.value !== "all") counts[option.value] = 0;
  for (const record of periodRecords) counts[record.type] += 1;
  const needle = query.trim().toLowerCase();
  const visible = periodRecords.filter((record) => {
    if (typeFilter !== "all" && record.type !== typeFilter) return false;
    if (statusFilter === "updated") {
      if (!hasDatedUpdate(record)) return false;
    } else if (statusFilter !== "all" && record.status !== statusFilter) return false;
    if (!needle) return true;
    return [
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
      .toLowerCase()
      .includes(needle);
  });
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <section id="register" className="register-layer" aria-labelledby="register-heading">
      <h2 id="register-heading">完整登記冊</h2>
      <p className="caption">全部 {RECORDS.length} 筆官方紀錄，最新者在前。篩選只影響本頁顯示。「已更新」指本冊已加注日期更新行。</p>
      <label className="toggle">
        <input type="checkbox" checked={showEnglish} onChange={(event) => onEnglish(event.target.checked)} />
        顯示英文原文
      </label>
      <div className="filter-row">
        <label className="field">
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
        <label className="field">
          月份
          <select value={monthFilter} onChange={(event) => onMonth(event.target.value)}>
            <option value="all">全部月份</option>
            {MONTH_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          狀態
          <select value={statusFilter} onChange={(event) => onStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
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
      <label className="field">
        搜尋標題、摘要、法例編號或來源
        <input
          type="search"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="例如：沙田、第59章、宏福苑"
        />
      </label>
      <button type="button" className="quiet" onClick={onReset}>
        重設篩選
      </button>
      <p className="result-count" aria-live="polite">
        顯示 {visible.length} / {RECORDS.length} 筆紀錄。
      </p>
      {visible.length > 0 ? (
        <div className="pager">
          <button type="button" className="quiet" disabled={safePage <= 1} onClick={() => onPage(safePage - 1)}>
            上一頁
          </button>
          <span>
            第 {safePage} / {pageCount} 頁（每頁 {PAGE_SIZE} 筆）
          </span>
          {Array.from({ length: pageCount }, (_, index) => (
            <button
              key={index + 1}
              type="button"
              className={safePage === index + 1 ? "quiet is-on" : "quiet"}
              aria-current={safePage === index + 1 ? "page" : undefined}
              onClick={() => onPage(index + 1)}
            >
              {index + 1}
            </button>
          ))}
          <button type="button" className="quiet" disabled={safePage >= pageCount} onClick={() => onPage(safePage + 1)}>
            下一頁
          </button>
        </div>
      ) : null}
      {visible.length === 0 ? (
        <p className="empty">本冊沒有紀錄符合目前的年份、月份、類型、狀態或搜尋條件。</p>
      ) : (
        pageRows.map((record) => (
          <RegisterRow
            key={record.id}
            record={record}
            open={openedId === record.id}
            showEnglish={showEnglish}
            onToggle={() => onToggle(record.id)}
          />
        ))
      )}
    </section>
  );
}

function RegisterRow({
  record,
  open,
  showEnglish,
  onToggle,
}: {
  record: OshRecord;
  open: boolean;
  showEnglish: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="reg-row" id={record.id}>
      <div className="reg-summary">
        <h3>{record.titleZh}</h3>
        <div className="reg-side">
          <span className="short-date">{dateShort(record.datetime)}</span>
          <span className="pill">{TYPE_LABEL[record.type]}</span>
          {hasDatedUpdate(record) ? <span className="pill pill-accent">已更新</span> : null}
          <button type="button" className="quiet detail-toggle" aria-expanded={open} onClick={onToggle}>
            {open ? "收起詳情" : "查看詳情 ›"}
          </button>
        </div>
      </div>
      {open ? (
        <div className="reg-detail">
          {showEnglish ? <p className="title-en">{record.titleEn}</p> : null}
          <dl className="props">
            <div>
              <dt>日期時間（香港時間）</dt>
              <dd>{dateShort(record.datetime)}</dd>
            </div>
            <div>
              <dt>類型</dt>
              <dd>{TYPE_LABEL[record.type]}</dd>
            </div>
            <div>
              <dt>狀態</dt>
              <dd>{STATUS_LABEL[record.status]}</dd>
            </div>
            <div>
              <dt>法例編號（官方中文）</dt>
              <dd>{record.legalZh}</dd>
            </div>
            {showEnglish ? (
              <>
                <div>
                  <dt>日期時間（英文原文）</dt>
                  <dd>{record.datetime}</dd>
                </div>
                <div>
                  <dt>Legal reference（英文原文）</dt>
                  <dd>{record.legalEn}</dd>
                </div>
              </>
            ) : null}
          </dl>
          <p>{record.summaryZh}</p>
          {record.sourceNote ? (
            <dl className="props">
              <div>
                <dt>來源說明</dt>
                <dd>{record.sourceNote}</dd>
              </div>
            </dl>
          ) : null}
          {record.updatesZh.map((line) => (
            <dl className="props update-zh" key={line.key}>
              <div>
                <dt>{line.key}</dt>
                <dd>
                  <LinkText text={line.value} />
                </dd>
              </div>
            </dl>
          ))}
          {showEnglish
            ? record.updatesEn.map((line) => (
                <dl className="props update-en" key={line.key}>
                  <div>
                    <dt>{line.key}（英文原文）</dt>
                    <dd>
                      <LinkText text={line.value} />
                    </dd>
                  </div>
                </dl>
              ))
            : null}
          <h4>官方來源</h4>
          <p className="source-prose">
            <LinkText text={record.officialSource} />
          </p>
          <ul className="links">
            {record.sources.map((source) => (
              <li key={source.href + source.title}>
                <a href={source.href} target="_blank" rel="noopener noreferrer">
                  {source.title}
                  <span className="sr-only">（在新分頁開啟）</span>
                </a>
                <span className="site">{source.site}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
