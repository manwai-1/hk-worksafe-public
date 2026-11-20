import { useLayoutEffect, useRef } from "react";
import { STATUS_LABEL, TYPE_LABEL } from "../content";
import { hasDatedUpdate } from "../data";
import { LinkText } from "../lib/text";
import type { OshRecord } from "../types";

const NO_ALERT_IDS = new Set(["2026-11-05-shatin", "2026-10-07-tungchung"]);

export function RecordCard({ record, initiallyOpen }: { record: OshRecord; initiallyOpen: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useLayoutEffect(() => {
    const element = detailsRef.current;
    if (!element || !initiallyOpen) return;
    element.open = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [initiallyOpen]);

  return (
    <article className="record" id={record.id}>
      <details ref={detailsRef}>
        <summary>
          <span className="rec-title">{record.titleZh}</span>
          <span className="rec-meta">
            {record.datetime} · {TYPE_LABEL[record.type]}
          </span>
        </summary>
        <div className="rec-body">
          <div className="badges">
            <span className={`badge badge-${record.status}`}>{STATUS_LABEL[record.status]}</span>
            {hasDatedUpdate(record) ? <span className="badge badge-updated">已更新</span> : null}
            {NO_ALERT_IDS.has(record.id) ? <span className="badge badge-no-alert">尚無職安警示</span> : null}
            {record.id === "2026-10-07-tungchung" ? (
              <span className="badge badge-hint">已有安全提示（並非職安警示）</span>
            ) : null}
          </div>
          <p className="title-en">{record.titleEn}</p>
          <dl className="props">
            <div>
              <dt>日期時間（香港時間）</dt>
              <dd>{record.datetime}</dd>
            </div>
            <div>
              <dt>類型</dt>
              <dd>
                {TYPE_LABEL[record.type]}（{record.type}）
              </dd>
            </div>
            <div>
              <dt>狀態</dt>
              <dd>
                {STATUS_LABEL[record.status]}（{record.status}）
              </dd>
            </div>
            <div>
              <dt>法例編號（官方中文）</dt>
              <dd>{record.legalZh}</dd>
            </div>
            <div>
              <dt>Legal reference（英文原文）</dt>
              <dd>{record.legalEn}</dd>
            </div>
          </dl>
          <p className="summary">{record.summaryZh}</p>
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
      </details>
    </article>
  );
}
