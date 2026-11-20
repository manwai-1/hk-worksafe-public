import { useMemo } from "react";
import { RECORDS, data } from "../data";
import { CHART_MONTHS, monthAxisLabel, recordPeriod } from "../lib/period";

const SERIES = [
  { key: "incident" as const, name: "意外", color: "#3B82F6" },
  { key: "prosecution" as const, name: "檢控", color: "#0EA5E9" },
  { key: "alert" as const, name: "職安警示", color: "#94A3B8" },
];

export function Charts() {
  const monthChart = useMemo(() => {
    const counts = Object.fromEntries(
      CHART_MONTHS.map((key) => [key, { incident: 0, prosecution: 0, alert: 0 }]),
    ) as Record<(typeof CHART_MONTHS)[number], { incident: number; prosecution: number; alert: number }>;
    for (const record of RECORDS) {
      if (record.type !== "incident" && record.type !== "prosecution" && record.type !== "alert") continue;
      const period = recordPeriod(record.datetime);
      if (!period) continue;
      const key = `${period.year}-${period.month}` as (typeof CHART_MONTHS)[number];
      if (!counts[key]) continue;
      counts[key][record.type] += 1;
    }
    let ceiling = 1;
    for (const key of CHART_MONTHS) {
      for (const series of SERIES) ceiling = Math.max(ceiling, counts[key][series.key]);
    }
    return { counts, ceiling };
  }, []);

  const bars = [...data.patternGroups]
    .map((group) => ({ label: group.label, value: group.ids.length }))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(...bars.map((bar) => bar.value));

  return (
    <div className="chart-grid">
      <section className="card" aria-labelledby="month-chart-heading">
        <h2 id="month-chart-heading">按月分布</h2>
        <div className="chart-scroll">
          <div className="chart" aria-hidden="true">
            {CHART_MONTHS.map((key) => (
              <div className="month-col" key={key}>
                <div className="month-bars">
                  {SERIES.map((series) => {
                    const value = monthChart.counts[key][series.key];
                    const height = value === 0 ? 0 : Math.max(6, (value / monthChart.ceiling) * 100);
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
      </section>
      <section className="card" aria-labelledby="category-chart-heading">
        <h2 id="category-chart-heading">按類別分布</h2>
        <svg className="category-chart" viewBox="0 0 400 182" role="img" aria-label="按類別分布">
          {bars.map((bar, index) => {
            const rowH = 26;
            const y = index * rowH;
            const labelW = 108;
            const gap = 6;
            const countW = 24;
            const barMax = 400 - labelW - gap - countW;
            const width = max > 0 ? (bar.value / max) * barMax : 0;
            return (
              <g key={bar.label}>
                <text x={labelW - 4} y={y + rowH / 2} textAnchor="end" dominantBaseline="middle" fontSize="13">
                  {bar.label}
                </text>
                <rect x={labelW + gap} y={y + 7} width={width} height="12" rx="4" />
                <text x={labelW + gap + width + 4} y={y + rowH / 2} dominantBaseline="middle" fontSize="12">
                  {bar.value}
                </text>
              </g>
            );
          })}
        </svg>
      </section>
    </div>
  );
}
