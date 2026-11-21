import { useMemo, useState } from "react";
import { THREAD_STATUS_OPTIONS, TYPE_LABEL } from "../content";
import { BY_ID, RECORDS, data } from "../data";
import { dateLabel, dateShort } from "../lib/period";
import { DateText } from "../lib/text";
import type { FollowThread, OshRecord } from "../types";
import { TitleMark } from "./marks";
import { StackRecordTable } from "./RecordTable";

const NO_ALERT_IDS = new Set(["2026-11-05-shatin", "2026-10-07-tungchung"]);

function followLabel(id: string): string {
  if (id === "2026-10-07-tungchung") return "已有安全提示";
  if (NO_ALERT_IDS.has(id)) return "尚無職安警示";
  if (data.noParticulars.includes(id)) return "未列詳情";
  const paired = data.followThreads.some(
    (thread) => thread.kind !== "no-alert" && thread.kind !== "no-alert-safety-hints" && thread.ids.includes(id),
  );
  if (paired) return "已有對照跟進";
  return "見完整紀錄";
}

function followTone(label: string): string {
  if (label === "尚無職安警示") return "warning";
  if (label.includes("安全提示")) return "accent";
  return "neutral";
}

function threadMatchesStatus(kind: string, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "no-alert") return kind === "no-alert" || kind === "no-alert-safety-hints";
  if (filter === "safety-hint") return kind === "no-alert-safety-hints";
  if (filter === "paired") return kind === "circumstance";
  if (filter === "file") return kind === "file";
  return true;
}

function threadStatusText(thread: FollowThread): string {
  if (thread.kind === "file") return "登記冊原文已註明其後有檢控紀錄；來源並無案件編號";
  if (thread.kind === "no-alert-safety-hints") return "已有安全提示";
  if (thread.kind === "no-alert") return "尚無職安警示";
  return "已有對照跟進";
}

function threadTone(kind: string): string {
  if (kind === "no-alert") return "warning";
  if (kind === "no-alert-safety-hints" || kind === "file") return "accent";
  return "neutral";
}

export function FollowLayer({ onOpen }: { onOpen: (id: string) => void }) {
  const [noAlertQuery, setNoAlertQuery] = useState("");
  const [threadQuery, setThreadQuery] = useState("");
  const [threadStatusFilter, setThreadStatusFilter] = useState("all");
  const [threadsExpanded, setThreadsExpanded] = useState(false);

  const watchRows = useMemo(() => {
    const rows = [BY_ID["2026-11-05-shatin"], BY_ID["2026-10-07-tungchung"]].filter((record): record is OshRecord =>
      Boolean(record),
    );
    const needle = noAlertQuery.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((record) =>
      [dateShort(record.datetime), record.titleZh, record.titleEn, TYPE_LABEL[record.type], record.summaryEn, record.summaryZh]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [noAlertQuery]);

  const filteredThreads = useMemo(() => {
    const needle = threadQuery.trim().toLowerCase();
    return data.followThreads.filter((thread) => {
      if (!threadMatchesStatus(thread.kind, threadStatusFilter)) return false;
      if (!needle) return true;
      return thread.ids.some((id) => {
        const record = BY_ID[id];
        if (!record) return false;
        return [record.datetime, record.titleZh, record.titleEn, record.summaryEn, record.summaryZh, TYPE_LABEL[record.type]]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      });
    });
  }, [threadQuery, threadStatusFilter]);

  const shownThreads = threadsExpanded ? filteredThreads : filteredThreads.slice(0, 5);
  const incidents = RECORDS.filter((record) => record.type === "incident");

  return (
    <div id="follow-up" className="layer">
      <section className="panel" aria-labelledby="watch-heading">
        <h2 id="watch-heading" className="panel-title">
          <TitleMark kind="watch" />
          近期關注
        </h2>
        <label className="field">
          搜尋近期關注的標題或地點
          <input
            type="search"
            value={noAlertQuery}
            onChange={(event) => setNoAlertQuery(event.target.value)}
            placeholder="地區、工程類型或事件描述"
          />
        </label>
        {watchRows.length === 0 ? (
          <p>沒有符合的紀錄。</p>
        ) : (
          <StackRecordTable
            caption="近期關注：登記冊已載明尚未見對應職安警示的個案。"
            rows={watchRows}
            columns={[
              {
                key: "date",
                label: "日期",
                stack: "date",
                render: (record) => <DateText value={dateShort(record.datetime)} />,
              },
              {
                key: "type",
                label: "類型",
                stack: "type",
                render: (record) => <span className="pill">{TYPE_LABEL[record.type]}</span>,
              },
              {
                key: "title",
                label: "官方中文標題",
                stack: "title",
                render: (record) => <span className="stack-title">{record.titleZh}</span>,
              },
              {
                key: "mark",
                label: "標示",
                stack: "mark",
                render: (record) => (
                  <span className={`pill pill-${record.id === "2026-10-07-tungchung" ? "accent" : "warning"}`}>
                    {record.id === "2026-10-07-tungchung" ? "已有安全提示" : "尚無職安警示"}
                  </span>
                ),
              },
              {
                key: "action",
                label: "紀錄",
                stack: "action",
                render: (record) => (
                  <button type="button" className="quiet stack-action" onClick={() => onOpen(record.id)}>
                    查看
                  </button>
                ),
              },
            ]}
          />
        )}
      </section>

      <section className="panel" aria-labelledby="threads-heading">
        <h2 id="threads-heading" className="panel-title">
          <TitleMark kind="follow" />
          其後發展
        </h2>
        <label className="field">
          搜尋跟進發展的標題或地點
          <input
            type="search"
            value={threadQuery}
            onChange={(event) => {
              setThreadQuery(event.target.value);
              setThreadsExpanded(false);
            }}
            placeholder="地區、工程類型或事件描述"
          />
        </label>
        <div className="segmented" role="group" aria-label="跟進狀態">
          {THREAD_STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={threadStatusFilter === option.value}
              className={threadStatusFilter === option.value ? "is-on" : ""}
              onClick={() => {
                setThreadStatusFilter(option.value);
                setThreadsExpanded(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {shownThreads.length === 0 ? <p>沒有符合條件的跟進線索。</p> : null}
        {shownThreads.map((thread) => {
          const items = thread.ids.map((id) => BY_ID[id]).filter((record): record is OshRecord => Boolean(record));
          const first = items[0];
          if (!first) return null;
          const heading = items
            .map((record) => TYPE_LABEL[record.type])
            .filter((label, index, all) => all.indexOf(label) === index)
            .join(" → ");
          return (
            <details key={thread.id} id={thread.id} className="thread">
              <summary>
                <span className="rec-title">{first.titleZh}</span>
                <span className="rec-meta">
                  {heading} · {dateLabel(first.datetime)}
                </span>
              </summary>
              <div className="thread-body">
                <p>
                  <span className={`pill pill-${threadTone(thread.kind)}`}>{threadStatusText(thread)}</span>
                </p>
                <ol className="steps">
                  {items.map((record) => (
                    <li key={record.id}>
                      <span className="step-kicker">
                        {TYPE_LABEL[record.type]} · {dateShort(record.datetime)}
                      </span>
                      <span>{record.titleZh}</span>
                    </li>
                  ))}
                </ol>
                <div className="row-actions">
                  {items.map((record) => (
                    <button key={record.id} type="button" className="quiet" onClick={() => onOpen(record.id)}>
                      查看：{TYPE_LABEL[record.type]}
                    </button>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
        {filteredThreads.length > 5 && !threadsExpanded ? (
          <button type="button" className="quiet" onClick={() => setThreadsExpanded(true)}>
            展開全部（共 {filteredThreads.length} 筆）
          </button>
        ) : null}
        {threadsExpanded && filteredThreads.length > 5 ? (
          <button type="button" className="quiet" onClick={() => setThreadsExpanded(false)}>
            收合
          </button>
        ) : null}
      </section>

      <section className="panel" aria-labelledby="fatals-heading">
        <h2 id="fatals-heading" className="panel-title">
          <TitleMark kind="list" />
          致命意外
        </h2>
        <div className="table-scroll">
          <table className="data-table">
            <caption>本冊全部意外類紀錄，最新者在前。</caption>
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">官方中文標題</th>
                <th scope="col">跟進狀態</th>
                <th scope="col">紀錄</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((record) => {
                const label = followLabel(record.id);
                return (
                  <tr key={record.id}>
                    <td>{dateShort(record.datetime)}</td>
                    <td>{record.titleZh}</td>
                    <td>
                      <span className={`pill pill-${followTone(label)}`}>{label}</span>
                    </td>
                    <td>
                      <button type="button" className="quiet" onClick={() => onOpen(record.id)}>
                        查看
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
