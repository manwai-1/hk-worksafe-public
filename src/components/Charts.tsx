import { useMemo } from "react";
import { CHART_CAPTION } from "../content";
import { RECORDS } from "../data";
import { CHART_MONTHS, TABLE_MONTHS, monthAxisLabel, recordPeriod } from "../lib/period";
import type { PatternGroup } from "../types";

const SERIES = [
  { key: "incident" as const, name: "意外", color: "#1e3a5f" },
  { key: "prosecution" as const, name: "檢控", color: "#8a6232" },
  { key: "alert" as const, name: "職安警示", color: "#8d3b3b" },
];

export function Charts({ groups }: { groups: PatternGroup[] }) {
  const monthChart = useMemo(() => {
    const counts = Object.fromEntries(
      CHART_MONTHS.map((key) => [key, { incident: 0, prosecution: 0, alert: 0 }]),
    ) as Record<string, { incident: number; prosecution: number; alert: number }>;
    for (const record of RECORDS) {
      if (record.type !== "incident" && record.type !== "prosecution" && record.type !== "alert") continue;
      const period = recordPeriod(record.datetime);
      if (!period) continue;
      const key = `${period.year}-${period.month}`;
      if (!counts[key]) continue;
      counts[key][record.type] += 1;
    }
    let ceiling = 1;
    for (const key of CHART_MONTHS) {
      for (const series of SERIES) ceiling = Math.max(ceiling, counts[key][series.key]);
    }
    return { counts, ceiling };
  }, []);

  const maxPattern = Math.max(...groups.map((group) => group.ids.length));

  return (
    <section id="counts" className="block" aria-labelledby="counts-heading">
      <h2 id="counts-heading">本冊紀錄數目</h2>
      <p className="caption">{CHART_CAPTION}</p>

      <h3>意外、檢控與職安警示按月份分布</h3>
      <p className="note">只計本冊這三類紀錄。只標明月份的職安警示歸入該月。此圖不是政府官方統計。</p>
      <div className="chart-scroll">
        <div className="chart" aria-hidden="true">
          {CHART_MONTHS.map((key) => (
            <div className="month-col" key={key}>
              <div className="month-bars">
                {SERIES.map((series) => {
                  const value = monthChart.counts[key][series.key];
                  const height = value === 0 ? 0 : Math.max(8, (value / monthChart.ceiling) * 100);
                  return (
                    <div className="bar-slot" key={series.key}>
                      <span className="bar-num">{value}</span>
                      <span className="bar" style={{ height: `${height}%`, background: series.color }} />
                    </div>
                  );
                })}
              </div>
              <div className="month-label">{monthAxisLabel(key)}</div>
            </div>
          ))}
        </div>
      </div>
      <ul className="legend">
        {SERIES.map((series) => (
          <li key={series.key}>
            <span className="swatch" style={{ background: series.color }} />
            {series.name}
          </li>
        ))}
      </ul>

      <table className="data-table">
        <caption>本冊意外、檢控與職安警示的月份筆數。此表不是政府官方統計。</caption>
        <thead>
          <tr>
            <th scope="col">月份</th>
            <th scope="col">意外</th>
            <th scope="col">檢控</th>
            <th scope="col">職安警示</th>
          </tr>
        </thead>
        <tbody>
          {TABLE_MONTHS.map((key) => (
            <tr key={key}>
              <th scope="row">{monthAxisLabel(key)}</th>
              <td>{monthChart.counts[key].incident}</td>
              <td>{monthChart.counts[key].prosecution}</td>
              <td>{monthChart.counts[key].alert}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>按形態歸類的本冊紀錄數目</h3>
      <p className="note">各形態的筆數是本冊歸類結果，不是政府官方統計。</p>
      <div className="pattern-bars">
        {groups.map((group) => (
          <div className="pattern-row" key={group.key}>
            <span className="pattern-name">{group.label}</span>
            <span className="pattern-track">
              <span className="pattern-fill" style={{ width: `${(group.ids.length / maxPattern) * 100}%` }} />
            </span>
            <span className="pattern-value">{group.ids.length}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
