import { PAIRING_NOTE, TYPE_LABEL } from "../content";
import { BY_ID, RECORDS } from "../data";
import { dateLabel } from "../lib/period";
import { LinkText } from "../lib/text";
import type { FollowThread, OshRecord } from "../types";

function followLabel(id: string, noParticulars: Set<string>, inThread: Set<string>): string {
  if (id === "2026-10-07-tungchung") return "尚無職安警示；已有安全提示（並非職安警示）";
  if (id === "2026-11-05-shatin") return "尚無職安警示";
  if (noParticulars.has(id)) return "來源未列進一步詳情";
  if (inThread.has(id)) return "已有對照跟進";
  return "見完整紀錄";
}

export function FollowUp({
  threads,
  noParticulars,
  onOpen,
}: {
  threads: FollowThread[];
  noParticulars: string[];
  onOpen: (id: string) => void;
}) {
  const shatin = BY_ID["2026-11-05-shatin"];
  const tungchung = BY_ID["2026-10-07-tungchung"];
  const noParticularsSet = new Set(noParticulars);
  const inThread = new Set<string>();
  for (const thread of threads) {
    if (thread.kind === "no-alert" || thread.kind === "no-alert-safety-hints") continue;
    for (const id of thread.ids) inThread.add(id);
  }
  const incidents = RECORDS.filter((record) => record.type === "incident");
  const visibleThreads = threads.filter((thread) => thread.kind === "circumstance" || thread.kind === "file");

  return (
    <section id="follow-up" className="block" aria-labelledby="follow-heading">
      <h2 id="follow-heading">關注與跟進</h2>
      <p className="caption">
        供掃描近期致命意外、登記冊已載明尚無職安警示的個案，以及同一事故其後出現的職安警示或檢控。此層只陳述本冊已載事實，不是法律意見，亦不構成須採取的行動。
      </p>
      <p>
        至 2026-11-20 08:59 香港時間，官方 2026 年職安警示索引仍止於 2026 年 9 月，尚無 10 月或 11 月職安警示。東涌 2026年10月7日致命事故有勞工處「安全提示」，並非職安警示。本頁將安全提示與職安警示分開標示，不予混用。
      </p>

      <section id="no-alert" aria-labelledby="no-alert-heading">
        <h3 id="no-alert-heading">尚無職安警示</h3>
        <p className="caption">
          僅列登記冊原文或其註有日期的更新行已載明：官方職安警示索引尚未見對應職安警示的個案。不根據推測增列。
        </p>
        {shatin ? <WatchCard record={shatin} onOpen={onOpen} /> : null}
        {tungchung ? <WatchCard record={tungchung} safetyHint onOpen={onOpen} /> : null}
      </section>

      <section id="threads" aria-labelledby="threads-heading">
        <h3 id="threads-heading">同一事故的跟進</h3>
        <p className="caption">
          當本冊一則意外、其後一則職安警示及／或其後一則檢控，所述情況明顯相同時，在此列為同一跟進線索。職安警示通常只列月份，來源並無案件編號。未有足夠共同事實的紀錄（包括僅稱正在調查、未列進一步詳情的公報）不會在此對照。
        </p>
        <p>{PAIRING_NOTE}</p>
        {visibleThreads.map((thread) => {
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
                <p className="thread-status">
                  {thread.kind === "file" ? "登記冊原文已註明其後有檢控紀錄；來源並無案件編號" : PAIRING_NOTE}
                </p>
                <ol className="steps">
                  {items.map((record) => (
                    <li key={record.id}>
                      <span className="step-kicker">
                        {TYPE_LABEL[record.type]} · {record.datetime}
                      </span>
                      <span>{record.titleZh}</span>
                    </li>
                  ))}
                </ol>
                {items.map((record) => (
                  <div key={record.id} className="thread-item">
                    <h4>
                      {TYPE_LABEL[record.type]} · {record.datetime}
                    </h4>
                    <p className="caption">{record.titleZh}</p>
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
                    <button type="button" className="text-button" onClick={() => onOpen(record.id)}>
                      查看：{TYPE_LABEL[record.type]}
                    </button>
                  </div>
                ))}
              </div>
            </details>
          );
        })}
      </section>

      <section id="recent-fatals" aria-labelledby="fatals-heading">
        <h3 id="fatals-heading">致命意外一覽</h3>
        <p className="caption">
          本冊全部意外類紀錄，最新者在前。標示只反映本冊已載事實：尚無職安警示、已有對照跟進，或來源未列進一步詳情。
        </p>
        <div className="table-scroll">
          <table className="data-table">
            <caption>本冊 23 筆意外，最新者在前。</caption>
            <thead>
              <tr>
                <th scope="col">日期（香港時間）</th>
                <th scope="col">官方中文標題</th>
                <th scope="col">跟進標示</th>
                <th scope="col">紀錄</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((record) => (
                <tr key={record.id}>
                  <td>{record.datetime}</td>
                  <td>{record.titleZh}</td>
                  <td>{followLabel(record.id, noParticularsSet, inThread)}</td>
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
    </section>
  );
}

function WatchCard({
  record,
  safetyHint = false,
  onOpen,
}: {
  record: OshRecord;
  safetyHint?: boolean;
  onOpen: (id: string) => void;
}) {
  const hintLinks = safetyHint
    ? record.sources.filter(
        (source) => source.href.includes("safety_hints_20261007") || source.href.includes("work_safety_alert_2026.htm"),
      )
    : [];
  return (
    <article className="watch" id={safetyHint ? "watch-tungchung" : "watch-shatin"}>
      <h4>{record.titleZh}</h4>
      <p className="caption">
        {record.datetime} · {TYPE_LABEL[record.type]}
      </p>
      <div className="badges">
        <span className="badge badge-no-alert">尚無職安警示</span>
        {safetyHint ? <span className="badge badge-hint">已有安全提示（並非職安警示）</span> : null}
      </div>
      <p className="title-en">{record.titleEn}</p>
      <dl className="props">
        <div>
          <dt>日期時間（香港時間）</dt>
          <dd>{record.datetime}</dd>
        </div>
        <div>
          <dt>類型</dt>
          <dd>{TYPE_LABEL[record.type]}</dd>
        </div>
        <div>
          <dt>狀態</dt>
          <dd>官方（{record.status}）</dd>
        </div>
      </dl>
      <p>{record.summaryZh}</p>
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
      {record.updatesEn.map((line) => (
        <dl className="props update-en" key={line.key}>
          <div>
            <dt>{line.key}（英文原文）</dt>
            <dd>
              <LinkText text={line.value} />
            </dd>
          </div>
        </dl>
      ))}
      {hintLinks.length > 0 ? (
        <ul className="links">
          {hintLinks.map((source) => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer">
                {source.title}
                <span className="sr-only">（在新分頁開啟）</span>
              </a>
              <span className="site">{source.site}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="text-button" onClick={() => onOpen(record.id)}>
        查看完整紀錄
      </button>
    </article>
  );
}
