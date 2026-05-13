import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render a cell. Receives the row + index. */
  cell: (row: T, index: number) => ReactNode;
  /** Right-align cell content (numeric columns). */
  numeric?: boolean;
  /** Optional column className applied to td. */
  className?: string;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: ReactNode;
  /** Optional row click handler. */
  onRowClick?: (row: T) => void;
  /** Add a sticky header (default true). */
  stickyHeader?: boolean;
  caption?: string;
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  onRowClick,
  stickyHeader = true,
  caption,
}: Props<T>) {
  if (rows.length === 0 && empty !== undefined) {
    return <>{empty}</>;
  }
  return (
    <div className="overflow-auto rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-bg-raised)]/60">
      <table className="ledger">
        {caption && <caption className="medieval-title-sm py-2 text-left px-3">{caption}</caption>}
        <thead className={stickyHeader ? 'sticky top-0 z-10 bg-[color:var(--color-bg-raised)]' : ''}>
          <tr>
            {columns.map(col => (
              <th key={col.key} className={col.numeric ? 'num' : ''}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={rowKey(row, index)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`${col.numeric ? 'num' : ''} ${col.className ?? ''}`}
                >
                  {col.cell(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
