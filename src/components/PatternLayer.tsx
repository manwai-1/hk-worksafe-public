import { useState } from "react";
import { TYPE_LABEL } from "../content";
import { BY_ID, data } from "../data";
import { dateShort } from "../lib/period";
import { DateText } from "../lib/text";
import type { OshRecord } from "../types";
import { TitleMark } from "./marks";
import { StackRecordTable } from "./RecordTable";

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
      <StackRecordTable
        caption={`${selected.label}，共 ${records.length} 筆。`}
        rows={records}
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
            render: (record) => <span className="type-token">{TYPE_LABEL[record.type]}</span>,
          },
          {
            key: "title",
            label: "官方中文標題",
            stack: "title",
            render: (record) => <span className="stack-title">{record.titleZh}</span>,
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
    </section>
  );
}
