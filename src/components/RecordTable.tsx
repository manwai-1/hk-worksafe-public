import type { ReactNode } from "react";

export type StackColumn<T> = {
  key: string;
  label: string;
  stack: "date" | "type" | "title" | "mark" | "action";
  render: (row: T) => ReactNode;
};

export function StackRecordTable<T extends { id: string }>({
  caption,
  columns,
  rows,
}: {
  caption: ReactNode;
  columns: StackColumn<T>[];
  rows: T[];
}) {
  return (
    <div className="table-scroll">
      <table className="data-table stack-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map((column) => (
                <td key={column.key} data-stack={column.stack}>
                  <span className="stack-label">{column.label}</span>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
