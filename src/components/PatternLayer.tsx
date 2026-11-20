import { useState } from "react";
import { TYPE_LABEL } from "../content";
import { BY_ID, data } from "../data";
import { dateShort } from "../lib/period";
import type { OshRecord } from "../types";
import { TitleMark } from "./marks";

export function PatternLayer({ onOpen }: { onOpen: (id: string) => void }) {
  const [patternKey, setPatternKey] = useState(data.patternGroups[0]?.key ?? "");
  const selected = data.patternGroups.find((group) => group.key === patternKey) ?? data.patternGroups[0];
  const records = selected.ids.map((id) => BY_ID[id]).filter((record): record is OshRecord => Boolean(record));

  return (
    <section id="patterns" className="panel" aria-labelledby="patterns-heading">
      <h2 id="patterns-heading" className="panel-title">
        <TitleMark kind="types" />
        按類別查看
      </h2>
      <div className="segmented" role="group" aria-label="類別">
        {data.patternGroups.map((group) => (
          <button
            key={group.key}
            type="button"
            aria-pressed={selected.key === group.key}
            className={selected.key === group.key ? "is-on" : ""}
            onClick={() => setPatternKey(group.key)}
          >
            {group.label}
            <span className="count">{group.ids.length}</span>
          </button>
        ))}
      </div>
      <p>
        {selected.label}：{records.length} 筆。
      </p>
      <div className="table-scroll">
        <table className="data-table">
          <caption>
            {selected.label}，共 {records.length} 筆。
          </caption>
          <thead>
            <tr>
              <th scope="col">日期</th>
              <th scope="col">類型</th>
              <th scope="col">官方中文標題</th>
              <th scope="col">紀錄</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{dateShort(record.datetime)}</td>
                <td>{TYPE_LABEL[record.type]}</td>
                <td>{record.titleZh}</td>
                <td>
                  <button type="button" className="quiet" onClick={() => onOpen(record.id)}>
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
